/**
 * Applies the part / fully seasoned pickup and bulk-bag prices on the
 * database the shop actually reads (DATABASE_URL).
 *
 * Migrations are recorded against DIRECT_URL, which has pointed at a
 * different database than the live catalogue before. This runs the same
 * SQL as db/migrations/0008_seasoned_options.sql during the Vercel build,
 * before pages are rendered, and does not touch image files.
 */
import fs from "node:fs";
import { Pool } from "pg";
import { cleanDatabaseUrl } from "../lib/database-url";

const url = cleanDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.log("No DATABASE_URL; skipping seasoned product pricing update.");
  process.exit(0);
}

const sql = fs.readFileSync(new URL("./migrations/0008_seasoned_options.sql", import.meta.url), "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((part) => part.replace(/--.*$/gm, "").trim())
  .filter(Boolean);

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });

pool
  .connect()
  .then(async (client) => {
    try {
      await client.query("BEGIN");
      for (const statement of statements) await client.query(statement);
      await client.query("COMMIT");
      const check = await client.query<{ id: string; name: string; price_pence: number; image: string | null }>(
        `SELECT id, name, price_pence, image FROM products
         WHERE id IN ('pickup-load', 'fully-seasoned-pickup-load', 'bulk-bag-of-logs', 'fully-seasoned-bulk-bag')
         ORDER BY sort_order`,
      );
      console.log(`Seasoned product pricing applied: ${JSON.stringify(check.rows)}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
