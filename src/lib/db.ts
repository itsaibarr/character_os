import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

// Enforce SSL for pooler connections and utilize global caching to prevent Next.js HMR connection exhaustion
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const client = (globalThis as any)._dbClient || postgres(process.env.DATABASE_URL, { ssl: "require" });

if (process.env.NODE_ENV !== "production") {
  (globalThis as any)._dbClient = client;
}

export const db = drizzle(client, { schema });
