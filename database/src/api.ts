import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type Identity = { issuer: string; subject: string };
export type ClimbInput = {
  slug: string; climbedOn: string; finishedOn?: string | null; notes?: string;
  summitNotReached?: boolean; visibility?: "PUBLIC" | "PRIVATE"; trailId?: string | null;
  reachedTargetKeys?: string[];
};
export interface ClimbStore {
  profile(): Promise<unknown>;
  updateProfile(displayName: string): Promise<unknown>;
  list(page: number, limit: number): Promise<unknown>;
  get(id: string): Promise<unknown>;
  create(input: ClimbInput): Promise<unknown>;
  update(id: string, input: Partial<ClimbInput>): Promise<unknown>;
  remove(id: string): Promise<void>;
  pins(ids: string[]): Promise<unknown>;
  putPhoto(id: string, photo: string): Promise<unknown>;
  removePhoto(id: string): Promise<unknown>;
}
export type ApiEvent = APIGatewayProxyEventV2WithJWTAuthorizer;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message: string): never { throw new HttpError(400, message); }
function objectBody(event: ApiEvent, limit = 16_384): Record<string, unknown> {
  if (!event.body) return fail("A JSON body is required.");
  const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  if (Buffer.byteLength(text) > limit) throw new HttpError(413, "Request body is too large.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { return fail("Invalid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("A JSON object is required.");
  return value as Record<string, unknown>;
}
function keys(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) fail("Unknown request field.");
}
function calendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateClimb(body: Record<string, unknown>, partial = false): Partial<ClimbInput> {
  keys(body, ["slug", "climbedOn", "finishedOn", "notes", "summitNotReached", "visibility", "trailId", "reachedTargetKeys"]);
  if (!Object.keys(body).length) fail("Provide at least one climb field.");
  if ((!partial || "slug" in body) && (typeof body.slug !== "string" || !/^[a-z0-9-]{1,160}$/.test(body.slug))) fail("Invalid mountain slug.");
  if ((!partial || "climbedOn" in body) && !calendarDate(body.climbedOn)) fail("climbedOn must be a valid YYYY-MM-DD date.");
  if ("finishedOn" in body && body.finishedOn !== null && !calendarDate(body.finishedOn)) fail("finishedOn must be a date or null.");
  if (typeof body.finishedOn === "string" && typeof body.climbedOn === "string" && body.finishedOn <= body.climbedOn) fail("finishedOn must be later than climbedOn.");
  if ("notes" in body && (typeof body.notes !== "string" || body.notes.length > 5000)) fail("Notes must be at most 5000 characters.");
  if ("summitNotReached" in body && typeof body.summitNotReached !== "boolean") fail("Invalid summit status.");
  if ("visibility" in body && !["PUBLIC", "PRIVATE"].includes(body.visibility as string)) fail("Invalid visibility.");
  if ("trailId" in body && body.trailId !== null && (typeof body.trailId !== "string" || !uuid.test(body.trailId))) fail("Invalid trail ID.");
  if ("reachedTargetKeys" in body && (!Array.isArray(body.reachedTargetKeys) || body.reachedTargetKeys.length > 50 || body.reachedTargetKeys.some(key => typeof key !== "string" || !/^[a-z0-9:-]{1,200}$/.test(key)) || new Set(body.reachedTargetKeys).size !== body.reachedTargetKeys.length)) fail("Invalid reached destinations.");
  return body as Partial<ClimbInput>;
}
export function createApi(options: {
  issuer: string; clientId: string;
  getStore(identity: Identity): Promise<ClimbStore>;
  logError?: (requestId: string) => void;
}) {
  return async (event: ApiEvent) => {
    const response = (statusCode: number, value?: unknown) => ({
      statusCode,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: value === undefined ? "" : JSON.stringify(value),
    });
    try {
      // API Gateway verifies signature, issuer, expiry and audience. Reject ID tokens too.
      const claims = event.requestContext.authorizer?.jwt?.claims;
      if (!options.issuer || !options.clientId || !claims || claims.iss !== options.issuer || claims.client_id !== options.clientId || claims.token_use !== "access" || typeof claims.sub !== "string" || !uuid.test(claims.sub)) {
        throw new HttpError(401, "Sign in to access your climbs.");
      }
      const method = event.requestContext.http.method;
      const path = event.rawPath.replace(/\/$/, "");
      const matched = /^\/me\/climbs\/([0-9a-f-]+)$/i.exec(path);
      const id = matched?.[1];
      if (id && !uuid.test(id)) fail("Invalid climb ID.");
      const photoMatch = /^\/me\/climbs\/([0-9a-f-]+)\/photo$/i.exec(path);
      const photoId = photoMatch?.[1];
      if (photoId && !uuid.test(photoId)) fail("Invalid climb ID.");
      // Validate before loading credentials or querying the database.
      let payload: Record<string, unknown> | undefined;
      if (["POST", "PATCH", "PUT"].includes(method)) payload = objectBody(event, photoId && method === "PUT" ? 241_024 : 16_384);
      let action: (store: ClimbStore) => Promise<unknown>;
      let status = 200;
      if (photoId && method === "PUT") {
        keys(payload!, ["photo"]);
        if (typeof payload!.photo !== "string" || payload!.photo.length > 240_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(payload!.photo)) fail("Choose a valid prepared JPG photo.");
        action = store => store.putPhoto(photoId, payload!.photo as string);
      } else if (photoId && method === "DELETE") action = store => store.removePhoto(photoId);
      else if (path === "/me" && method === "GET") action = store => store.profile();
      else if (path === "/me" && method === "PATCH") {
        keys(payload!, ["displayName"]);
        if (typeof payload!.displayName !== "string" || !payload!.displayName.trim() || payload!.displayName.length > 100) fail("displayName must be 1–100 characters.");
        action = store => store.updateProfile((payload!.displayName as string).trim());
      } else if (path === "/me/climbs" && method === "GET") {
        const pageText = event.queryStringParameters?.page ?? "0";
        const limitText = event.queryStringParameters?.limit ?? "50";
        if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) fail("Invalid pagination.");
        const page = Number(pageText), limit = Number(limitText);
        if (page > 1000 || limit < 1 || limit > 100) fail("Invalid pagination.");
        action = store => store.list(page, limit);
      } else if (path === "/me/climbs" && method === "POST") {
        const input = validateClimb(payload!) as ClimbInput;
        action = store => store.create(input); status = 201;
      } else if (path === "/me/climbs/pins" && method === "PUT") {
        keys(payload!, ["climbIds"]);
        const ids = payload!.climbIds;
        if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => typeof id !== "string" || !uuid.test(id)) || new Set(ids).size !== ids.length) fail("Select up to three unique climb IDs.");
        action = store => store.pins(ids as string[]);
      } else if (id && method === "GET") action = store => store.get(id);
      else if (id && method === "PATCH") {
        const input = validateClimb(payload!, true);
        action = store => store.update(id, input);
      } else if (id && method === "DELETE") {
        action = store => store.remove(id); status = 204;
      } else throw new HttpError(404, "Route not found.");
      const store = await options.getStore({ issuer: options.issuer, subject: claims.sub });
      return response(status, await action(store));
    } catch (error) {
      if (error instanceof HttpError) return response(error.status, { error: error.message });
      const code = (error as { code?: string })?.code;
      if (code === "P2002" || code === "P2034") return response(409, { error: "This change conflicts with another update. Refresh and retry." });
      if (code === "P2025") return response(404, { error: "Climb not found." });
      // Never return/log SQL, credentials, request bodies or bearer tokens.
      options.logError?.(event.requestContext.requestId);
      return response(500, { error: "Your climbs could not be loaded or saved. Please retry." });
    }
  };
}
