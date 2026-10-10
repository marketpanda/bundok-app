import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import jpeg from "jpeg-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { S3Client, DeleteObjectCommand, GetPublicAccessBlockCommand, GetBucketEncryptionCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getPrisma } from "../src/client.js";

const functionName = process.argv[2], bucket = process.argv[3];
if (!functionName || !bucket) throw new Error("Provide the deployed function name and photo bucket name.");
const values = config({ path: fileURLToPath(new URL("../.env.runtime", import.meta.url)), quiet: true }).parsed;
if (!values?.DATABASE_URL) throw new Error("Runtime credential is required.");
process.env.DATABASE_URL = values.DATABASE_URL;
const prisma = getPrisma();
const lambda = new LambdaClient({ region: "ap-southeast-2" });
const s3 = new S3Client({ region: "ap-southeast-2" });
const issuer = "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_dVMgCM7lO";
const subjects = [randomUUID(), randomUUID()];
const climbs: string[] = [];
let stage = "bucket privacy/encryption";
async function request(who: number, method: string, path: string, body?: unknown, status = 200) {
  // IAM-authorized direct Lambda invocation exercises the real backend/storage;
  // synthetic authorizer claims do not test live Cognito token verification.
  stage = `${method} ${path.endsWith("/photo") ? "photo" : "climb"}`;
  const event = { version: "2.0", rawPath: path, isBase64Encoded: false, body: body === undefined ? undefined : JSON.stringify(body), requestContext: { requestId: "disposable-photo-smoke-test", http: { method }, authorizer: { jwt: { claims: { iss: issuer, sub: subjects[who], client_id: "6i5r49d8r1puoke97kl1nj0qnu", token_use: "access" } } } } };
  const result = await lambda.send(new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from(JSON.stringify(event)) }));
  assert.equal(result.FunctionError, undefined, "Lambda invocation failed");
  const response = JSON.parse(Buffer.from(result.Payload!).toString());
  assert.equal(response.statusCode, status, `Unexpected status during ${method} photo smoke test`);
  return response.body ? JSON.parse(response.body) : undefined;
}
try {
  const access = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket }));
  assert.ok(Object.values(access.PublicAccessBlockConfiguration!).every(Boolean));
  const encryption = await s3.send(new GetBucketEncryptionCommand({ Bucket: bucket }));
  assert.equal(encryption.ServerSideEncryptionConfiguration!.Rules![0].ApplyServerSideEncryptionByDefault!.SSEAlgorithm, "AES256");
  const itinerary = await prisma.hikeItinerary.findFirstOrThrow({ where: { membershipStatus: "complete", targets: { some: {} } }, include: { targets: { orderBy: { sortOrder: "asc" } } } });
  const group = await request(0, "POST", "/me/climbs", { slug: itinerary.slug, climbedOn: "2026-01-01", reachedTargetKeys: itinerary.targets.map(target => target.targetKey), notes: "Disposable deployed group test" }, 201);
  climbs.push(group.id);
  assert.equal(group.isGroup, true);
  assert.equal(group.targets.length, itinerary.targets.length);
  assert.ok(group.targets.every((target: { reached: boolean }) => target.reached));
  await request(1, "PATCH", `/me/climbs/${group.id}`, { reachedTargetKeys: [] }, 404);
  await request(0, "PATCH", `/me/climbs/${group.id}`, { reachedTargetKeys: ["invalid-member"] }, 400);
  const subset = await request(0, "PATCH", `/me/climbs/${group.id}`, { reachedTargetKeys: [itinerary.targets[0].targetKey] });
  assert.equal(subset.targets.filter((target: { reached: boolean }) => target.reached).length, 1);
  const preserved = await request(0, "PATCH", `/me/climbs/${group.id}`, { notes: "Updated without changing destinations" });
  assert.deepEqual(preserved.targets, subset.targets);
  const none = await request(0, "PATCH", `/me/climbs/${group.id}`, { reachedTargetKeys: [] });
  assert.ok(none.targets.every((target: { reached: boolean }) => !target.reached));
  assert.equal(none.summitNotReached, true);
  assert.deepEqual((await request(0, "GET", `/me/climbs/${group.id}`)).targets, none.targets);
  console.log("PASS: deployed group create, selected/all-unselected destinations, reload, partial updates and ownership checks.");
  const climb = await request(0, "POST", "/me/climbs", { slug: "mount-pulag", climbedOn: "2026-01-01", notes: "Disposable deployed photo test" }, 201);
  climbs.push(climb.id);
  const photo = `data:image/jpeg;base64,${jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 255) }, 80).data.toString("base64")}`;
  await request(1, "PUT", `/me/climbs/${climb.id}/photo`, { photo }, 404);
  await request(1, "DELETE", `/me/climbs/${climb.id}/photo`, undefined, 404);
  const uploaded = await request(0, "PUT", `/me/climbs/${climb.id}/photo`, { photo });
  assert.equal(uploaded.photos.length, 1);
  const image = await fetch(uploaded.photos[0]); assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.equal(jpeg.decode(Buffer.from(await image.arrayBuffer())).width, 2);
  const unsigned = new URL(uploaded.photos[0]); unsigned.search = "";
  assert.equal((await fetch(unsigned)).status, 403, "Unsigned object access must be denied");
  const reloaded = await request(0, "GET", `/me/climbs/${climb.id}`);
  assert.equal((await fetch(reloaded.photos[0])).status, 200);
  async function deletedObject(url: string) {
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    await assert.rejects(s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })), error => (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404);
    // The Lambda signer intentionally has no ListBucket permission, so a missing
    // key may return 403 to that signed URL. Confirm deletion with admin HEAD.
    assert.ok([403, 404].includes((await fetch(url)).status));
  }
  const replaced = await request(0, "PUT", `/me/climbs/${climb.id}/photo`, { photo });
  assert.notEqual(new URL(replaced.photos[0]).pathname, new URL(uploaded.photos[0]).pathname);
  await deletedObject(uploaded.photos[0]);
  assert.equal((await request(0, "DELETE", `/me/climbs/${climb.id}/photo`)).photos.length, 0);
  await deletedObject(replaced.photos[0]);
  const finalPhoto = await request(0, "PUT", `/me/climbs/${climb.id}/photo`, { photo });
  await request(0, "DELETE", `/me/climbs/${climb.id}`, undefined, 204);
  await deletedObject(finalPhoto.photos[0]);
  console.log("PASS: real Lambda/SSM/Neon/S3 upload, private encrypted bucket, signed image retrieval, cross-user rejection, replace/remove/climb-delete cleanup. No URLs or credentials printed.");
} catch (error) {
  console.error(JSON.stringify({ event: "deployed_photo_test_failed", stage, errorType: error instanceof Error ? error.name : "unknown", actualStatus: typeof (error as { actual?: unknown }).actual === "number" ? (error as { actual: number }).actual : undefined, expectedStatus: typeof (error as { expected?: unknown }).expected === "number" ? (error as { expected: number }).expected : undefined }));
  process.exitCode = 1;
} finally {
  for (const id of climbs) await request(0, "DELETE", `/me/climbs/${id}`, undefined, 204).catch(() => {});
  const users = await prisma.user.findMany({ where: { cognitoIssuer: issuer, cognitoSubject: { in: subjects } }, select: { id: true } });
  for (const user of users) {
    const prefix = `climbs/${user.id}/`;
    const records = await prisma.climbPhoto.findMany({ where: { climb: { userId: user.id } } });
    const queued = await prisma.photoDeletion.findMany({ where: { storageKey: { startsWith: prefix } } });
    for (const key of new Set([...records.map(row => row.storageKey), ...queued.map(row => row.storageKey)])) {
      assert.ok(key.startsWith(prefix));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
    await prisma.photoDeletion.deleteMany({ where: { storageKey: { startsWith: prefix } } });
  }
  await prisma.user.deleteMany({ where: { cognitoIssuer: issuer, cognitoSubject: { in: subjects } } });
  await prisma.$disconnect();
}
