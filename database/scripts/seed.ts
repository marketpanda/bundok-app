import "dotenv/config";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import pg from "pg";

// Preserve the catalogue import's source metadata and stable mountain/trail IDs.
execFileSync(process.execPath, ["scripts/prepare-seed.mjs"], { stdio: "inherit" });
if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is required to seed the database.");
const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 15_000 });
try {
  await client.connect();
  await client.query(await readFile(new URL("../seed.sql", import.meta.url), "utf8"));
  execFileSync(process.execPath, ["--import", "tsx", "scripts/seed-itineraries.ts"], { stdio: "inherit" });
  console.log("Mountain and trail catalogue seeded.");
} catch {
  console.error("Seeding failed. Check connectivity, DIRECT_URL and the migration status. Credentials were not printed.");
  process.exitCode = 1;
} finally {
  await client.end();
}
