import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// Reuse this instance across warm Lambda invocations. Inject the URL server-side.
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (client) return client;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required in the backend environment.");
  const adapter = new PrismaPg({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 10_000,
  }, { schema: "ambangeg" });
  client = new PrismaClient({ adapter });
  return client;
}
