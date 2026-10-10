import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import pg from "pg";
import { createApi, type ApiEvent } from "../src/api.js";
import { createStore } from "../src/store.js";
import { getPrisma } from "../src/client.js";
import jpeg from "jpeg-js";
import { cleanupPhotos, type PhotoStorage } from "../src/photos.js";

const values = config({ path: fileURLToPath(new URL("../.env.runtime", import.meta.url)), quiet: true }).parsed;
if (!values?.DATABASE_URL) throw new Error("Create the restricted application role first.");
process.env.DATABASE_URL = values.DATABASE_URL;
const prisma = getPrisma();
const issuer = "https://integration-test.ambangeg.invalid";
const subjects = [randomUUID(), randomUUID()];
const objects = new Map<string, Uint8Array>();
let failDelete = false;
let failUpload = false;
const storage: PhotoStorage = {
  async put(key, image) { if (failUpload) throw new Error("synthetic upload failure"); objects.set(key, image); },
  async url(key) { return `https://photos.test.invalid/${key}?temporary=1`; },
  async remove(key) {
    const fixtureUsers = await prisma.user.findMany({ where: { cognitoIssuer: issuer, cognitoSubject: { in: subjects } }, select: { id: true } });
    assert.ok(fixtureUsers.some(user => key.startsWith(`climbs/${user.id}/`)), "Mock cleanup cannot acknowledge real account objects");
    if (failDelete) throw new Error("synthetic delete failure"); objects.delete(key); },
};
const api = createApi({ issuer, clientId: "integration", async getStore(identity) { return createStore(prisma, identity, storage); } });
const permissions = new pg.Client({ connectionString: values.DATABASE_URL, connectionTimeoutMillis: 15_000 });
function event(subject: string, method: string, rawPath: string, body?: unknown): ApiEvent {
  return { version: "2.0", rawPath, isBase64Encoded: false, body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { requestId: "integration", http: { method }, authorizer: { jwt: { claims: { iss: issuer, sub: subject, client_id: "integration", token_use: "access" } } } },
  } as unknown as ApiEvent;
}
async function request(who: number, method: string, path: string, body?: unknown, expected = 200) {
  const result = await api(event(subjects[who], method, path, body));
  assert.equal(result.statusCode, expected, `Unexpected status on ${method} ${path}: ${result.body}`);
  return result.body ? JSON.parse(result.body) : undefined;
}
try {
  await permissions.connect();
  const restricted = (await permissions.query("SELECT current_user AS login, has_table_privilege(current_user, 'ambangeg.mountains', 'INSERT') AS catalog_write, has_schema_privilege(current_user, 'ambangeg', 'CREATE') AS schema_write")).rows[0];
  assert.equal(restricted.login, "ambangeg_app");
  assert.equal(restricted.catalog_write, false);
  assert.equal(restricted.schema_write, false);
  const trail = await prisma.mountainTrail.findFirst({ include: { mountain: true } });
  assert.ok(trail);
  const otherMountain = await prisma.mountain.findFirst({ where: { id: { not: trail.mountainId } } });
  assert.ok(otherMountain);
  const body = { slug: trail.mountain.slug, climbedOn: "2026-01-01", trailId: trail.id, notes: "Temporary API test" };
  const a = await request(0, "POST", "/me/climbs", body, 201);
  const b = await request(0, "POST", "/me/climbs", body, 201);
  const c = await request(0, "POST", "/me/climbs", body, 201);
  assert.notEqual(a.id, b.id);
  assert.equal(a.climbedOn, body.climbedOn);
  assert.equal((await request(0, "GET", "/me/climbs")).climbs.length, 3);
  assert.equal((await request(1, "GET", "/me/climbs")).climbs.length, 0);
  for (const method of ["GET", "PATCH", "DELETE"]) await request(1, method, `/me/climbs/${a.id}`, method === "PATCH" ? { notes: "intrusion" } : undefined, 404);
  await request(1, "PUT", "/me/climbs/pins", { climbIds: [a.id] }, 404);
  await request(0, "PATCH", `/me/climbs/${a.id}`, { slug: otherMountain.slug, trailId: trail.id }, 400);
  await request(0, "PATCH", `/me/climbs/${a.id}`, { finishedOn: "2025-12-31" }, 400);
  const changed = await request(0, "PATCH", `/me/climbs/${a.id}`, { notes: "Updated", finishedOn: "2026-01-03", summitNotReached: true });
  assert.equal(changed.notes, "Updated"); assert.equal(changed.finishedOn, "2026-01-03");
  const photo = `data:image/jpeg;base64,${jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 255) }).data.toString("base64")}`;
  await request(1, "PUT", `/me/climbs/${a.id}/photo`, { photo }, 404);
  await request(1, "DELETE", `/me/climbs/${a.id}/photo`, undefined, 404);
  assert.equal(objects.size, 0);
  await request(0, "PUT", `/me/climbs/${a.id}/photo`, { photo: "data:image/jpeg;base64,YmFk" }, 400);
  const withPhoto = await request(0, "PUT", `/me/climbs/${a.id}/photo`, { photo });
  assert.equal(withPhoto.photos.length, 1); assert.equal(objects.size, 1);
  assert.equal((await request(0, "GET", `/me/climbs/${a.id}`)).photos.length, 1);
  failDelete = true;
  await request(0, "PUT", `/me/climbs/${a.id}/photo`, { photo });
  assert.equal(objects.size, 2);
  assert.equal(await prisma.climbPhoto.count({ where: { climbId: a.id } }), 1);
  failDelete = false;
  await cleanupPhotos(prisma, storage);
  assert.equal(objects.size, 1);
  failUpload = true;
  await request(0, "PUT", `/me/climbs/${a.id}/photo`, { photo }, 500);
  failUpload = false;
  assert.equal((await request(0, "GET", `/me/climbs/${a.id}`)).photos.length, 1);
  const fixtureUser = await prisma.user.findUniqueOrThrow({ where: { cognitoIssuer_cognitoSubject: { cognitoIssuer: issuer, cognitoSubject: subjects[0] } } });
  const fixturePrefix = `climbs/${fixtureUser.id}/`;
  const queued = await prisma.photoDeletion.findMany({ where: { storageKey: { startsWith: fixturePrefix } } });
  for (const row of queued) { await storage.remove(row.storageKey); await prisma.photoDeletion.delete({ where: { storageKey: row.storageKey } }); }
  const cleared = await request(0, "DELETE", `/me/climbs/${a.id}/photo`);
  assert.equal(cleared.photos.length, 0); assert.equal(objects.size, 0);
  await request(0, "PUT", `/me/climbs/${a.id}/photo`, { photo });
  await request(0, "PUT", "/me/climbs/pins", { climbIds: [a.id, b.id, c.id] });
  const pinned = (await request(0, "GET", "/me/climbs")).climbs;
  assert.equal(pinned.filter((row: { pinned: boolean }) => row.pinned).length, 3);
  await Promise.all([
    request(0, "PUT", "/me/climbs/pins", { climbIds: [a.id] }),
    request(0, "PUT", "/me/climbs/pins", { climbIds: [b.id] }),
  ]);
  assert.equal((await request(0, "GET", "/me/climbs")).climbs.filter((row: { pinned: boolean }) => row.pinned).length, 1);
  await request(0, "DELETE", `/me/climbs/${a.id}`, undefined, 204);
  assert.equal(objects.size, 0);
  await request(0, "GET", `/me/climbs/${a.id}`, undefined, 404);
  console.log("Integration checks passed: restricted role, dates, repeat hikes, trail validation, CRUD, cross-user ownership, concurrent pin replacement, photo validation/replace/remove and cleanup retry.");
} catch {
  console.error("API integration checks failed. Credentials were not printed.");
  process.exitCode = 1;
} finally {
  const fixtureUsers = await prisma.user.findMany({ where: { cognitoIssuer: issuer, cognitoSubject: { in: subjects } }, select: { id: true } });
  for (const user of fixtureUsers) await prisma.photoDeletion.deleteMany({ where: { storageKey: { startsWith: `climbs/${user.id}/` } } });
  await prisma.user.deleteMany({ where: { cognitoIssuer: issuer, cognitoSubject: { in: subjects } } });
  await permissions.end();
  await prisma.$disconnect();
}
