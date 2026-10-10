import "dotenv/config";
import pg from "pg";

if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is required.");
const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 15_000, query_timeout: 15_000 });
try {
  await client.connect();
  const result = await client.query<{ count: string }>(`
    SELECT count(*) FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
  `);
  console.log(JSON.stringify({ connected: true, existingTables: Number(result.rows[0].count) }));
} catch {
  console.error("Connection check failed. Check DIRECT_URL and network access. Credentials were not printed.");
  process.exitCode = 1;
} finally {
  await client.end();
}
