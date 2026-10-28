/**
 * Puts fully seasoned options above part seasoned on the live catalogue.
 * Sort order only — names, prices, photos and descriptions are left alone.
 * Runs against DATABASE_URL during the Vercel build, before pages render.
 */
import fs from "node:fs";
import { Pool } from "pg";
import { cleanDatabaseUrl } from "../lib/database-url";

const url = cleanDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.log("No DATABASE_URL; skipping product order update.");
  process.exit(0);
}

const sql = fs.readFileSync(new URL("./migrations/0009_product_order.sql", import.meta.url), "utf8");
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
      const check = await client.query<{ id: string; sort_order: number }>(
        `SELECT id, sort_order FROM products
         WHERE id IN ('fully-seasoned-pickup-load', 'pickup-load', 'fully-seasoned-bulk-bag', 'bulk-bag-of-logs')
         ORDER BY sort_order`,
      );
      console.log(`Product order applied: ${JSON.stringify(check.rows)}`);
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
