import { fetchAuthSession } from "aws-amplify/auth";

export type JournalClimb = {
  id: string; slug: string; climbedOn: string; finishedOn?: string;
  notes: string; pinned: boolean; summitNotReached: boolean; photos?: string[];
  isGroup?: boolean;
  targets?: { key: string; name: string; mountainSlug: string; pointSlug?: string | null; reached: boolean }[];
};
type ApiClimb = Omit<JournalClimb, "finishedOn"> & { finishedOn: string | null };
export const climbsApiConfigured = Boolean(process.env.NEXT_PUBLIC_CLIMBS_API_URL);
const baseUrl = process.env.NEXT_PUBLIC_CLIMBS_API_URL?.replace(/\/$/, "");

// Never retry writes automatically: a lost response may follow a successful save.
export async function climbsRequest<T>(subject: string, path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken;
  if (!token || token.payload.sub !== subject) throw new Error("Your sign-in changed. Refresh the page and try again.");
  if (!baseUrl) throw new Error("Account storage is not configured.");
  const response = await fetch(`${baseUrl}${path}`, {
    method, cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token.toString()}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Please sign in again to access your journal.");
    if (response.status === 429) throw new Error("Please wait a moment before trying again.");
    const result = await response.json().catch(() => ({}));
    throw new Error(typeof result.error === "string" ? result.error : "Could not reach your journal. Refresh to check whether your change was saved.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function climbPayload(climb: JournalClimb) {
  return { slug: climb.slug, climbedOn: climb.climbedOn, finishedOn: climb.finishedOn ?? null, notes: climb.notes, summitNotReached: climb.summitNotReached,
    ...(climb.isGroup ? { reachedTargetKeys: climb.targets?.filter(target => target.reached).map(target => target.key) ?? [] } : {}) };
}
export function journalClimb(climb: ApiClimb): JournalClimb {
  return { id: climb.id, slug: climb.slug, climbedOn: climb.climbedOn,
    ...(climb.finishedOn ? { finishedOn: climb.finishedOn } : {}),
    notes: climb.notes, summitNotReached: climb.summitNotReached, pinned: climb.pinned,
    isGroup: climb.isGroup ?? false, targets: climb.targets ?? [],
    photos: Array.isArray(climb.photos) ? climb.photos.slice(0, 1) : [] };
}
export async function listClimbs(subject: string, signal?: AbortSignal) {
  const climbs: JournalClimb[] = [];
  let page: number | null = 0;
  while (page !== null) {
    const result: { climbs: ApiClimb[]; nextPage: number | null } = await climbsRequest(subject, `/me/climbs?page=${page}&limit=100`, "GET", undefined, signal);
    climbs.push(...result.climbs.map(journalClimb));
    page = result.nextPage;
    if (page !== null) await new Promise(resolve => setTimeout(resolve, 650));
  }
  return climbs;
}
export async function saveAccountClimb(subject: string, climb: JournalClimb, editing: boolean) {
  const saved = journalClimb(await climbsRequest<ApiClimb>(subject, editing ? `/me/climbs/${climb.id}` : "/me/climbs", editing ? "PATCH" : "POST", climbPayload(climb)));
  try {
    if (climb.photos?.[0]?.startsWith("data:image/jpeg;base64,")) return await saveAccountPhoto(subject, saved.id, climb.photos[0]);
    if (!climb.photos?.length && saved.photos?.length) return journalClimb(await climbsRequest<ApiClimb>(subject, `/me/climbs/${saved.id}/photo`, "DELETE"));
    return saved;
  } catch { throw new PhotoSaveError(saved); }
}
export async function saveAccountPhoto(subject: string, id: string, photo: string) {
  return journalClimb(await climbsRequest<ApiClimb>(subject, `/me/climbs/${id}/photo`, "PUT", { photo }));
}
export class PhotoSaveError extends Error {
  constructor(public climb: JournalClimb) {
    super("Climb details were saved, but the photo change could not be confirmed. You can retry the photo or reload your journal to check it.");
  }
}
