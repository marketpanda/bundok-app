import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import jpeg from "jpeg-js";
import { HttpError } from "./api.js";
import type { PrismaClient } from "../generated/prisma/client.js";

export interface PhotoStorage {
  put(key: string, image: Uint8Array): Promise<void>;
  url(key: string): Promise<string>;
  remove(key: string): Promise<void>;
}
export function normalizePhoto(value: unknown): Uint8Array {
  if (typeof value !== "string" || value.length > 240_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new HttpError(400, "Choose a valid prepared JPG photo.");
  try {
    const bytes = Buffer.from(value.slice("data:image/jpeg;base64,".length), "base64");
    if (bytes.length > 180_000) throw new Error("size");
    const image = jpeg.decode(bytes, { useTArray: true, tolerantDecoding: false, maxResolutionInMP: 1, maxMemoryUsageInMB: 64 });
    if (image.width < 1 || image.height < 1 || image.width > 1000 || image.height > 1000) throw new Error("dimensions");
    // Re-encode decoded pixels only; never preserve EXIF, GPS or arbitrary input metadata.
    const result = jpeg.encode({ data: image.data, width: image.width, height: image.height }, 80).data;
    if (result.length > 1_000_000) throw new Error("size");
    return result;
  } catch { throw new HttpError(400, "This photo could not be processed. Choose another JPG, PNG or WebP image."); }
}
export function createPhotoStorage(): PhotoStorage {
  const bucket = process.env.PHOTO_BUCKET_NAME;
  const client = new S3Client({});
  function available() { if (!bucket) throw new HttpError(503, "Photo storage is temporarily unavailable."); return bucket; }
  return {
    async put(key, image) { await client.send(new PutObjectCommand({ Bucket: available(), Key: key, Body: image, ContentType: "image/jpeg", ServerSideEncryption: "AES256", CacheControl: "private, max-age=300" })); },
    async url(key) { return getSignedUrl(client, new GetObjectCommand({ Bucket: available(), Key: key }), { expiresIn: 3600 }); },
    async remove(key) { await client.send(new DeleteObjectCommand({ Bucket: available(), Key: key })); },
  };
}
export async function cleanupPhotos(prisma: PrismaClient, storage: PhotoStorage) {
  const pending = await prisma.photoDeletion.findMany({ where: { notBefore: { lte: new Date() } }, orderBy: { notBefore: "asc" }, take: 20 });
  let deleted = 0;
  for (const row of pending) {
    try {
      await storage.remove(row.storageKey);
      await prisma.photoDeletion.deleteMany({ where: { storageKey: row.storageKey } });
      deleted++;
    } catch { console.error(JSON.stringify({ event: "photo_cleanup_retry" })); }
  }
  return deleted;
}
