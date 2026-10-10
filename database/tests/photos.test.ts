import { test } from "node:test";
import assert from "node:assert/strict";
import jpeg from "jpeg-js";
import { normalizePhoto } from "../src/photos.js";
import { createApi, type ApiEvent, type ClimbStore } from "../src/api.js";

const dataUrl = (bytes: Uint8Array) => `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
test("photo validation rejects non-images, oversized bodies and excessive dimensions", () => {
  for (const value of [null, "https://example.com/image.jpg", "data:image/png;base64,AA==", dataUrl(Buffer.from("not a JPEG")), dataUrl(Buffer.alloc(180_001))]) assert.throws(() => normalizePhoto(value));
  const wide = jpeg.encode({ width: 1001, height: 1, data: Buffer.alloc(1001 * 4, 255) }, 70).data;
  assert.throws(() => normalizePhoto(dataUrl(wide)));
  const large = jpeg.encode({ width: 1001, height: 1001, data: Buffer.alloc(1001 * 1001 * 4, 255) }, 70).data;
  assert.throws(() => normalizePhoto(dataUrl(large)));
});
test("stored JPEG comes from decoded pixels and strips input comments/metadata", () => {
  const plain = jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 255) }, 70).data;
  const comment = Buffer.from("PRIVATE GPS METADATA");
  const marker = Buffer.alloc(4); marker[0] = 255; marker[1] = 254; marker.writeUInt16BE(comment.length + 2, 2);
  const input = Buffer.concat([plain.subarray(0, 2), marker, comment, plain.subarray(2)]);
  const stored = Buffer.from(normalizePhoto(dataUrl(input)));
  assert.equal(stored.includes(comment), false);
  const decoded = jpeg.decode(stored); assert.equal(decoded.width, 2); assert.equal(decoded.height, 2);
});
test("photo route requires auth, accepts only its photo field and bounds JSON body", async () => {
  const issuer = "https://test.invalid", clientId = "test";
  const id = "00000000-0000-4000-8000-000000000001";
  let calls = 0;
  const api = createApi({ issuer, clientId, async getStore() { calls++; return { async putPhoto(photoId: string) { return { id: photoId }; }, async removePhoto(photoId: string) { return { id: photoId }; } } as unknown as ClimbStore; } });
  const event = (body: unknown, authorized = true): ApiEvent => ({ rawPath: `/me/climbs/${id}/photo`, body: JSON.stringify(body), isBase64Encoded: false, requestContext: { requestId: "photo-test", http: { method: "PUT" }, authorizer: { jwt: { claims: authorized ? { iss: issuer, client_id: clientId, token_use: "access", sub: id } : {} } } } }) as ApiEvent;
  const photo = dataUrl(jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 255) }).data);
  assert.equal((await api(event({ photo }, false))).statusCode, 401);
  assert.equal((await api(event({ photo, storageKey: "other-user" }))).statusCode, 400);
  assert.equal((await api(event({ photo: "a".repeat(242_000) }))).statusCode, 413);
  assert.equal(calls, 0);
  assert.equal((await api(event({ photo }))).statusCode, 200);
  assert.equal(calls, 1);
});
