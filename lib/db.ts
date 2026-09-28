import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Reuse one pool across hot reloads in dev and warm serverless invocations.
const g = globalThis as unknown as { pgPool?: Pool };

const pool =
  g.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
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
