/**
 * Seeds products, delivery zones and settings from /config.
 * Safe to run repeatedly: existing rows are NOT overwritten, so prices you
 * have changed in /admin are kept. Pass `--reset` to force the defaults.
 *
 *   npm run db:seed
 *   npm run db:seed -- --reset
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cleanDatabaseUrl } from "../lib/database-url";
import * as schema from "./schema";
import { DEFAULT_PRODUCTS, DEFAULT_DELIVERY_ZONES } from "../config/catalog";
import { DEFAULT_SETTINGS } from "../config/business";

const reset = process.argv.includes("--reset");
const pool = new Pool({ connectionString: cleanDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL) });
const db = drizzle(pool, { schema });

async function main() {
  for (const p of DEFAULT_PRODUCTS) {
    const row = { ...p, image: p.image ?? null };
    const q = db.insert(schema.products).values(row);
    await (reset ? q.onConflictDoUpdate({ target: schema.products.id, set: row }) : q.onConflictDoNothing());
  }
  for (const z of DEFAULT_DELIVERY_ZONES) {
    const q = db.insert(schema.deliveryZones).values(z);
    await (reset ? q.onConflictDoUpdate({ target: schema.deliveryZones.id, set: z }) : q.onConflictDoNothing());
  }
  const s = { id: 1, ...DEFAULT_SETTINGS };
  const q = db.insert(schema.siteSettings).values(s);
  await (reset ? q.onConflictDoUpdate({ target: schema.siteSettings.id, set: s }) : q.onConflictDoNothing());
  console.log(`Seed complete${reset ? " (reset to defaults)" : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
