import "dotenv/config";
import pg from "pg";
type Target = { kind: "mountain" | "mountain-point"; mountainSlug: string; pointSlug?: string };
const source = new URL("../../frontend/data/hike-itineraries.ts", import.meta.url).href;
const { hikeItineraries, itineraryMountains, resolveHikeTarget }: {
  hikeItineraries: { slug: string; name: string; location: string; category: string; membershipStatus: string; targets: Target[] }[];
  itineraryMountains: { slug: string; name: string; elevationMeters?: number }[];
  resolveHikeTarget: (target: Target) => { name: string };
} = await import(source);

const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 15_000 });
try {
  if (!process.env.DIRECT_URL) throw new Error("Direct URL missing");
  await client.connect();
  await client.query("BEGIN");
  for (const itinerary of hikeItineraries) {
    const { rows: [group] } = await client.query("INSERT INTO ambangeg.hike_itineraries (slug,name,location,category,membership_status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,location=EXCLUDED.location,category=EXCLUDED.category,membership_status=EXCLUDED.membership_status RETURNING id", [itinerary.slug, itinerary.name, itinerary.location, itinerary.category, itinerary.membershipStatus]);
    for (const [order, target] of itinerary.targets.entries()) {
      const reference = itineraryMountains.find(mountain => mountain.slug === target.mountainSlug);
      if (!reference) throw new Error("Unresolved mountain");
      // Missing catalogue members get unknown coordinates, never fabricated summits.
      const { rows: [mountain] } = await client.query("INSERT INTO ambangeg.mountains (slug,name,location,elevation_m,latitude,longitude,coordinate_type) VALUES ($1,$2,$3,$4,NULL,NULL,'unknown') ON CONFLICT (slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id", [reference.slug, reference.name, itinerary.location, reference.elevationMeters ?? null]);
      const pointSlug = target.kind === "mountain-point" ? target.pointSlug : null;
      const key = pointSlug ? `${target.mountainSlug}:${pointSlug}` : target.mountainSlug;
      await client.query("INSERT INTO ambangeg.itinerary_targets (itinerary_id,mountain_id,target_key,point_slug,name,sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (itinerary_id,target_key) DO UPDATE SET mountain_id=EXCLUDED.mountain_id,point_slug=EXCLUDED.point_slug,name=EXCLUDED.name,sort_order=EXCLUDED.sort_order", [group.id, mountain.id, key, pointSlug, resolveHikeTarget(target).name, order]);
    }
    const keys = itinerary.targets.map(target => target.kind === "mountain-point" ? `${target.mountainSlug}:${target.pointSlug}` : target.mountainSlug);
    await client.query("DELETE FROM ambangeg.itinerary_targets WHERE itinerary_id=$1 AND NOT (target_key=ANY($2::text[]))", [group.id, keys]);
  }
  await client.query("COMMIT");
  console.log(`Seeded ${hikeItineraries.length} itineraries and their members; saved hike snapshots remain unchanged.`);
} catch {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Itinerary seeding failed. Credentials were not printed.");
  process.exitCode = 1;
} finally { await client.end(); }
