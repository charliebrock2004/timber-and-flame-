/**
 * Points the live Bulk Bag of Logs row at the supplied photo.
 * Uses DATABASE_URL — the same database the shop reads — and only fills
 * an empty photo, so an owner edit in /admin/products is kept.
 */
import { Pool } from "pg";
import { cleanDatabaseUrl } from "../lib/database-url";

const url = cleanDatabaseUrl(process.env.DATABASE_URL);
if (!url) {
  console.log("No DATABASE_URL; skipping bulk bag photo update.");
  process.exit(0);
}

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });

pool
  .query(
    `UPDATE "products" SET "image" = $1, "updated_at" = now()
     WHERE "id" = 'bulk-bag-of-logs' AND ("image" IS NULL OR "image" = '')`,
    ["/images/bulk-bag-of-logs.jpg"],
  )
  .then((res) => {
    console.log(`Bulk bag photo rows updated: ${res.rowCount ?? 0}`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
