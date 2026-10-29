/**
 * Applies softwood / hardwood options and the part-seasoned labels on the
 * database the shop actually reads (DATABASE_URL).
 *
 * Runs the same SQL as db/migrations/0010_wood_type_options.sql during the
 * Vercel build, after the earlier seasoning scripts, and before pages render.
 * Does not replace image files. Does not delete products.
 */
import fs from "node:fs";
import { Pool } from "pg";
import { cleanDatabaseUrl } from "../lib/database-url";

const url = cleanDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.log("No DATABASE_URL; skipping wood-type product update.");
  process.exit(0);
}

const sql = fs.readFileSync(new URL("./migrations/0010_wood_type_options.sql", import.meta.url), "utf8");
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
      const check = await client.query<{ id: string; name: string; price_pence: number }>(
        `SELECT id, name, price_pence FROM products
         WHERE id IN (
           'fully-seasoned-pickup-load',
           'fully-seasoned-pickup-hardwood',
           'fully-seasoned-bulk-softwood',
           'fully-seasoned-bulk-bag',
           'pickup-load',
           'bulk-bag-of-logs'
         )
         ORDER BY sort_order`,
      );
      console.log(`Wood-type options applied: ${JSON.stringify(check.rows)}`);
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
