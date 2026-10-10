import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { getPrisma } from "../src/client.js";

if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is required for schema checks.");
const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 15_000 });
const prisma = getPrisma();
try {
  await client.connect();
  await client.query(await readFile(new URL("../checks/schema.sql", import.meta.url), "utf8"));
  const [mountains, trails] = await Promise.all([prisma.mountain.count(), prisma.mountainTrail.count()]);
  console.log(JSON.stringify({ schemaChecks: "passed", prismaConnection: "passed", mountains, trails }));
} catch {
  console.error("Database verification failed. Check both URLs, connectivity and migration status. Credentials were not printed.");
  process.exitCode = 1;
} finally {
  await client.end();
  await prisma.$disconnect();
}
