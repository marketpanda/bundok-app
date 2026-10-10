import "dotenv/config";
import { randomBytes } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DIRECT_URL || !process.env.DATABASE_URL) throw new Error("Both database URLs are required.");
const target = new URL(process.env.DATABASE_URL);
const file = new URL("../.env.runtime", import.meta.url);
let exists = false;
try { await access(file); exists = true; } catch { /* first setup */ }
if (exists) throw new Error(".env.runtime already exists. Keep its current credential; this script does not rotate passwords.");
const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 15_000 });
const password = randomBytes(32).toString("base64url");
const identifier = (value: string) => '"' + value.replaceAll('"', '""') + '"';
let committed = false;
try {
  await client.connect();
  await client.query("BEGIN");
  if ((await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'ambangeg_app'")).rowCount) throw new Error("Application role already exists; do not reset it automatically.");
  // Password is generated locally and never included in logs or console output.
  await client.query(`CREATE ROLE ambangeg_app LOGIN PASSWORD '${password}'`);
  const db = (await client.query<{ db: string }>("SELECT current_database() AS db")).rows[0].db;
  await client.query(`GRANT CONNECT ON DATABASE ${identifier(db)} TO ambangeg_app`);
  await client.query("GRANT USAGE ON SCHEMA ambangeg TO ambangeg_app");
  await client.query("GRANT SELECT ON ambangeg.mountains, ambangeg.mountain_trails TO ambangeg_app");
  await client.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ambangeg.users, ambangeg.climbs, ambangeg.climb_photos TO ambangeg_app");
  await client.query("GRANT SELECT, INSERT, DELETE ON ambangeg.photo_deletions TO ambangeg_app");
  await client.query("GRANT SELECT ON ambangeg.hike_itineraries, ambangeg.itinerary_targets TO ambangeg_app");
  await client.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ambangeg.climb_targets TO ambangeg_app");
  target.username = "ambangeg_app"; target.password = password;
  await writeFile(file, `DATABASE_URL=${JSON.stringify(target.toString())}\n`, { flag: "wx", mode: 0o600 });
  await client.query("COMMIT"); committed = true;
  console.log("Created restricted ambangeg_app login. Its pooled URL is in database/.env.runtime (ignored by Git). Owner credentials are unchanged.");
} catch {
  if (!committed) await client.query("ROLLBACK").catch(() => {});
  console.error("Runtime role setup failed. No credentials were printed. Inspect role/file status before retrying; existing passwords are never reset automatically.");
  process.exitCode = 1;
} finally { await client.end(); }
