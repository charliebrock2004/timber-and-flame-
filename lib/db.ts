import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { resolveDatabaseUrl } from "./database-url";

// Reuse one pool across hot reloads in dev and warm serverless invocations.
const g = globalThis as unknown as { pgPool?: Pool };

// Resolve before constructing the pool. node-postgres dials 127.0.0.1:5432
// when connectionString is missing, which is what broke the Vercel preview build.
const { url: connectionString, source } = resolveDatabaseUrl();
if (source !== "DATABASE_URL") {
  console.info(`[db] DATABASE_URL is unset; using ${source}`);
}

const pool =
  g.pgPool ??
  new Pool({
    connectionString,
    // Serverless: keep the pool tiny; use your provider's pooled URL.
    // SSL is controlled by the URL (e.g. `?sslmode=require` on Neon/Supabase).
    max: process.env.NODE_ENV === "production" ? 3 : 5,
    // Fail fast when the database is unreachable instead of hanging the request
    // until the platform's function timeout.
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
  });
if (!g.pgPool) {
  // An idle client dropped by the server (common with serverless Postgres)
  // emits "error" on the pool; unhandled, that would crash the process.
  pool.on("error", (e) => console.error("[db] idle client error", e.message));
}
if (process.env.NODE_ENV !== "production") g.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
