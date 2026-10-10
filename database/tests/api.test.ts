import { test } from "node:test";
import assert from "node:assert/strict";
import { createApi, type ApiEvent, type ClimbStore, validateClimb } from "../src/api.js";

const sub = "00000000-0000-4000-8000-000000000001";
const issuer = "https://cognito-idp.ap-southeast-2.amazonaws.com/test";
const clientId = "test-client";
function event(method: string, path: string, body?: unknown, claims: Record<string, string | undefined> = { iss: issuer, sub, token_use: "access", client_id: clientId }): ApiEvent {
  return { version: "2.0", rawPath: path, isBase64Encoded: false,
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { requestId: "test", http: { method }, authorizer: { jwt: { claims } } },
  } as ApiEvent;
}
test("missing, wrong-pool, wrong-client and ID tokens fail before database access", async () => {
  let calls = 0;
  const api = createApi({ issuer, clientId, async getStore() { calls++; throw new Error("must not connect"); } });
  for (const claims of [{}, { iss: "other", sub, token_use: "access", client_id: clientId }, { iss: issuer, sub, token_use: "id", client_id: clientId }, { iss: issuer, sub, token_use: "access", client_id: "other" }]) {
    assert.equal((await api(event("GET", "/me/climbs", undefined, claims))).statusCode, 401);
  }
  assert.equal(calls, 0);
});
test("identity comes from verified claims and creation rejects injected ownership/photos/pins", async () => {
  let seen: unknown;
  const api = createApi({ issuer, clientId, async getStore(identity) {
    seen = identity;
    return { async create(input) { return input; } } as ClimbStore;
  } });
  const input = { slug: "mount-pulag", climbedOn: "2026-01-01" };
  assert.equal((await api(event("POST", "/me/climbs", input))).statusCode, 201);
  assert.deepEqual(seen, { issuer, subject: sub });
  for (const field of ["userId", "pinned", "photos"]) {
    assert.equal((await api(event("POST", "/me/climbs", { ...input, [field]: sub }))).statusCode, 400);
  }
});
test("dates, partial fields, lengths and pin lists are validated", async () => {
  for (const body of [{ slug: "mount-pulag", climbedOn: "2026-02-30" }, { slug: "mount-pulag", climbedOn: "2026-01-02", finishedOn: "2026-01-01" }, { notes: "a".repeat(5001) }, {}]) {
    assert.throws(() => validateClimb(body, true));
  }
  assert.deepEqual(validateClimb({ notes: "changed", finishedOn: null }, true), { notes: "changed", finishedOn: null });
  const api = createApi({ issuer, clientId, async getStore() { throw new Error("should not connect"); } });
  assert.equal((await api(event("PUT", "/me/climbs/pins", { climbIds: [sub, sub] }))).statusCode, 400);
  assert.equal((await api(event("PUT", "/me/climbs/pins", { climbIds: [sub, sub, sub, sub] }))).statusCode, 400);
  const oversized = event("POST", "/me/climbs", { notes: "a".repeat(20_000) });
  assert.equal((await api(oversized)).statusCode, 413);
});
test("malformed JSON, invalid pagination, and unknown routes cannot query the database", async () => {
  const api = createApi({ issuer, clientId, async getStore() { throw new Error("must not connect"); } });
  const badJson = event("POST", "/me/climbs"); badJson.body = "{";
  assert.equal((await api(badJson)).statusCode, 400);
  const paged = event("GET", "/me/climbs"); paged.queryStringParameters = { limit: "10000" };
  assert.equal((await api(paged)).statusCode, 400);
  assert.equal((await api(event("GET", "/other"))).statusCode, 404);
});
test("database errors do not expose credentials, SQL or request data", async () => {
  const api = createApi({ issuer, clientId, async getStore() { throw new Error("postgresql://secret SQL"); } });
  const result = await api(event("GET", "/me/climbs"));
  assert.equal(result.statusCode, 500);
  assert.ok(!result.body.includes("secret"));
  assert.equal(result.headers["Cache-Control"], "no-store");
});
