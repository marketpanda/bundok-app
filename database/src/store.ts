import { randomUUID } from "node:crypto";
import { normalizePhoto, cleanupPhotos, type PhotoStorage } from "./photos.js";
import type { PrismaClient, Prisma, Climb, ClimbPhoto } from "../generated/prisma/client.js";
import { HttpError, type ClimbInput, type ClimbStore, type Identity } from "./api.js";

const include = { mountain: { select: { slug: true } }, itinerary: { select: { slug: true, name: true } }, targets: { orderBy: { sortOrder: "asc" }, include: { mountain: { select: { slug: true } } } }, photos: { orderBy: { sortOrder: "asc" } } } as const;
type DetailedClimb = Prisma.ClimbGetPayload<{ include: typeof include }>;
async function dto(row: DetailedClimb, storage?: PhotoStorage) {
  return {
    photos: await Promise.all(row.photos.map(photo => {
      if (!storage) throw new HttpError(503, "Photo storage is temporarily unavailable.");
      return storage.url(photo.storageKey);
    })),
    id: row.id, slug: (row.mountain?.slug ?? row.itinerary!.slug), isGroup: row.itineraryId !== null,
    targets: row.targets.map(target => ({ key: target.targetKey, mountainSlug: target.mountain.slug, pointSlug: target.pointSlug, name: target.name, reached: target.reached })),
    trailId: row.trailId,
    climbedOn: row.climbedOn.toISOString().slice(0, 10),
    finishedOn: row.finishedOn?.toISOString().slice(0, 10) ?? null,
    notes: row.notes, summitNotReached: row.summitNotReached,
    pinned: row.pinSlot !== null, pinSlot: row.pinSlot, visibility: row.visibility,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}
export function createStore(prisma: PrismaClient, identity: Identity, storage?: PhotoStorage): ClimbStore {
  const toDto = (row: DetailedClimb) => dto(row, storage);
  function photoStorage() { if (!storage) throw new HttpError(503, "Photo storage is temporarily unavailable."); return storage; }
  async function lockPhoto(db: Prisma.TransactionClient, userId: string, id: string) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":" + id}, 0))`;
    return owned(db, userId, id);
  }
  async function queuePhotos(db: Prisma.TransactionClient, photos: ClimbPhoto[]) {
    const keys = photos.flatMap(photo => [photo.storageKey, ...(photo.thumbnailStorageKey ? [photo.thumbnailStorageKey] : [])]);
    if (keys.length) await db.photoDeletion.createMany({ data: keys.map(storageKey => ({ storageKey })), skipDuplicates: true });
  }
  const account = prisma.user.upsert({
    where: { cognitoIssuer_cognitoSubject: { cognitoIssuer: identity.issuer, cognitoSubject: identity.subject } },
    update: {}, create: { cognitoIssuer: identity.issuer, cognitoSubject: identity.subject, displayName: "Hiker" },
  });
  const profileDto = (user: Awaited<typeof account>) => ({ id: user.id, displayName: user.displayName, username: user.username });
  async function owned(db: Prisma.TransactionClient, userId: string, id: string) {
    const row = await db.climb.findFirst({ where: { id, userId }, include });
    if (!row) throw new HttpError(404, "Climb not found.");
    return row;
  }
  async function data(db: Prisma.TransactionClient, input: Partial<ClimbInput>, existing?: DetailedClimb) {
    let mountainId = existing?.mountainId ?? null;
    let itineraryId = existing?.itineraryId ?? null;
    const previousSlug = existing?.mountain?.slug ?? existing?.itinerary?.slug;
    const changedDestination = !existing || (input.slug !== undefined && input.slug !== previousSlug);
    let members: { targetKey: string; mountainId: string; pointSlug: string | null; name: string; sortOrder: number; reached?: boolean }[] = existing?.targets ?? [];
    if (changedDestination) {
      const mountain = await db.mountain.findUnique({ where: { slug: input.slug! } });
      if (mountain) { mountainId = mountain.id; itineraryId = null; members = []; }
      else {
        const group = await db.hikeItinerary.findUnique({ where: { slug: input.slug! }, include: { targets: { orderBy: { sortOrder: "asc" } } } });
        if (!group) throw new HttpError(400, "Unknown destination.");
        if (group.membershipStatus !== "complete" || !group.targets.length) throw new HttpError(400, "This itinerary's destinations are not verified yet. Choose an individual mountain instead.");
        itineraryId = group.id; mountainId = null; members = group.targets;
      }
    }
    if (!itineraryId && input.reachedTargetKeys !== undefined) throw new HttpError(400, "Reached destinations apply only to a group hike.");
    if (input.reachedTargetKeys?.some(key => !members.some(member => member.targetKey === key))) throw new HttpError(400, "A selected destination does not belong to this hike.");
    const selected = members.map(member => ({ targetKey: member.targetKey, mountainId: member.mountainId, pointSlug: member.pointSlug, name: member.name, sortOrder: member.sortOrder,
      reached: input.reachedTargetKeys ? input.reachedTargetKeys.includes(member.targetKey) : member.reached ?? true }));
    const trailId = input.trailId !== undefined ? input.trailId : changedDestination ? null : existing?.trailId ?? null;
    if (itineraryId && trailId) throw new HttpError(400, "A group hike cannot use a single-mountain trail.");
    if (trailId && !(await db.mountainTrail.findFirst({ where: { id: trailId, mountainId: mountainId! } }))) throw new HttpError(400, "The selected trail does not belong to this mountain.");
    const climbedOn = input.climbedOn ? new Date(input.climbedOn + "T00:00:00Z") : existing!.climbedOn;
    const finishedOn = input.finishedOn !== undefined ? input.finishedOn === null ? null : new Date(input.finishedOn + "T00:00:00Z") : existing?.finishedOn ?? null;
    if (finishedOn && finishedOn <= climbedOn) throw new HttpError(400, "finishedOn must be later than climbedOn.");
    return { mountainId, itineraryId, trailId, climbedOn, finishedOn,
      targetData: changedDestination || input.reachedTargetKeys !== undefined ? selected : undefined,
      summitNotReached: itineraryId ? selected.some(member => !member.reached) : input.summitNotReached ?? existing?.summitNotReached ?? false,
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    };
  }
  return {
    async profile() { return profileDto(await account); },
    async updateProfile(displayName) {
      return profileDto(await prisma.user.update({ where: { id: (await account).id }, data: { displayName } }));
    },
    async list(page, limit) {
      const userId = (await account).id;
      const rows = await prisma.climb.findMany({ where: { userId }, include, orderBy: [{ climbedOn: "desc" }, { id: "desc" }], skip: page * limit, take: limit + 1 });
      return { climbs: await Promise.all(rows.slice(0, limit).map(toDto)), nextPage: rows.length > limit ? page + 1 : null };
    },
    async get(id) { return toDto(await owned(prisma, (await account).id, id)); },
    async create(input) {
      const userId = (await account).id;
      return prisma.$transaction(async db => {
        const { targetData, ...fields } = await data(db, input);
        return toDto(await db.climb.create({ data: { ...fields, userId, ...(targetData?.length ? { targets: { createMany: { data: targetData } } } : {}) }, include }));
      });
    },
    async update(id, input) {
      const userId = (await account).id;
      return prisma.$transaction(async db => {
        const existing = await owned(db, userId, id);
        const { targetData, ...fields } = await data(db, input, existing);
        const changed = await db.climb.updateMany({ where: { id, userId }, data: fields });
        if (!changed.count) throw new HttpError(404, "Climb not found.");
        if (targetData !== undefined) {
          await db.climbTarget.deleteMany({ where: { climbId: id } });
          if (targetData.length) await db.climbTarget.createMany({ data: targetData.map(target => ({ ...target, climbId: id })) });
        }
        return toDto(await owned(db, userId, id));
      });
    },
    async remove(id) {
      const userId = (await account).id;
      await prisma.$transaction(async db => {
        const row = await lockPhoto(db, userId, id);
        await queuePhotos(db, row.photos);
        const deleted = await db.climb.deleteMany({ where: { id, userId } });
        if (!deleted.count) throw new HttpError(404, "Climb not found.");
      });
      if (storage) await cleanupPhotos(prisma, storage);
    },
    async putPhoto(id, photo) {
      const userId = (await account).id;
      await owned(prisma, userId, id); // Check ownership before decoding or touching S3.
      const image = normalizePhoto(photo);
      const objects = photoStorage();
      const key = `climbs/${userId}/${id}/${randomUUID()}.jpg`;
      // Queue first: even a crash between S3 upload and DB commit is cleaned later.
      await prisma.photoDeletion.create({ data: { storageKey: key, notBefore: new Date(Date.now() + 3600_000) } });
      await objects.put(key, image);
      const row = await prisma.$transaction(async db => {
        const existing = await lockPhoto(db, userId, id);
        await queuePhotos(db, existing.photos);
        await db.climbPhoto.deleteMany({ where: { climbId: id } });
        await db.climbPhoto.create({ data: { climbId: id, storageKey: key, isCover: true } });
        await db.photoDeletion.delete({ where: { storageKey: key } });
        return owned(db, userId, id);
      });
      await cleanupPhotos(prisma, objects);
      return toDto(row);
    },
    async removePhoto(id) {
      const userId = (await account).id;
      const row = await prisma.$transaction(async db => {
        const existing = await lockPhoto(db, userId, id);
        await queuePhotos(db, existing.photos);
        await db.climbPhoto.deleteMany({ where: { climbId: id } });
        return owned(db, userId, id);
      });
      if (storage) await cleanupPhotos(prisma, storage);
      return toDto(row);
    },
    async pins(ids) {
      const userId = (await account).id;
      return prisma.$transaction(async db => {
        // Serialize competing pin replacements for this account across Lambda instances.
        await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
        const ownedRows = await db.climb.findMany({ where: { userId, id: { in: ids } }, select: { id: true } });
        if (ownedRows.length !== ids.length) throw new HttpError(404, "Climb not found.");
        await db.climb.updateMany({ where: { userId, pinSlot: { not: null } }, data: { pinSlot: null } });
        for (const [index, id] of ids.entries()) {
          const updated = await db.climb.updateMany({ where: { id, userId }, data: { pinSlot: index + 1 } });
          if (!updated.count) throw new HttpError(404, "Climb not found.");
        }
        return { pinnedIds: ids };
      }, { timeout: 10_000 });
    },
  };
}
