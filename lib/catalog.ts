import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { ZoneRule } from "./delivery";

export type PublicProduct = {
  id: string;
  name: string;
  shortDescription: string;
  unitLabel: string;
  sizeLabel: string | null;
  pricePence: number;
  image: string | null;
  visual: string;
  accent: string;
};

export type PublicSettings = {
  phoneDisplay: string;
  phoneE164: string;
  contactEmail: string | null;
  addressLine: string | null;
  openingHours: string | null;
  standLocation: string | null;
  payLaterEnabled: boolean;
  collectionEnabled: boolean;
  collectionInstructions: string | null;
  announcement: string | null;
};

/**
 * Thrown when products, delivery zones or settings can't be read from the
 * database. There is deliberately NO fallback to the defaults in /config:
 * showing those could present out-of-date prices as if they were live.
 * Pages that show prices or take orders render an "unavailable" state instead.
 */
export class CatalogUnavailableError extends Error {
  constructor(what: string, cause?: unknown) {
    super(`Catalogue unavailable: could not read ${what}`, { cause });
    this.name = "CatalogUnavailableError";
  }
}

async function read<T>(what: string, q: () => Promise<T>): Promise<T> {
  try {
    return await q();
  } catch (e) {
    // Drizzle wraps the driver error in "Failed query: <sql>"; the real reason (e.g.
    // `relation "products" does not exist`, ECONNREFUSED, password authentication
    // failed) is on .cause, so log that instead of the query text.
    const cause = (e as { cause?: { message?: string; code?: string } }).cause;
    console.error(
      `[catalog] database unavailable reading ${what}: ${cause?.message ?? (e as Error).message}${cause?.code ? ` [${cause.code}]` : ""}`,
    );
    throw new CatalogUnavailableError(what, e);
  }
}

function loadProducts(): Promise<PublicProduct[]> {
  const p = schema.products;
  return read("products", () =>
    db
      .select({
        id: p.id,
        name: p.name,
        shortDescription: p.shortDescription,
        unitLabel: p.unitLabel,
        sizeLabel: p.sizeLabel,
        pricePence: p.pricePence,
        image: p.image,
        visual: p.visual,
        accent: p.accent,
      })
      .from(p)
      .where(eq(p.active, true))
      .orderBy(asc(p.sortOrder)),
  );
}

function loadZones(): Promise<ZoneRule[]> {
  return read("delivery zones", () => db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sortOrder)));
}

async function loadSettings(): Promise<PublicSettings> {
  const [s] = await read("settings", () => db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)));
  if (!s) throw new CatalogUnavailableError("settings (row missing — run `npm run db:seed`)");
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = s;
  return rest;
}

/**
 * Public reads. Deliberately NOT kept in Next's persistent data cache: a
 * cached copy can outlive a price change and be baked into the next build.
 * Instead the database is read whenever a page is rendered — at build, and on
 * each ISR regeneration (hourly, or immediately after an admin edit, which
 * revalidates every page). If a read fails the render fails: Next.js keeps
 * serving the last page it rendered from the database, and pages that take
 * orders show the "unavailable" state. `cache` only de-duplicates the reads
 * within a single render.
 */
export const getActiveProducts = cache(loadProducts);
export const getDeliveryZones = cache(loadZones);
export const getSettings = cache(loadSettings);

/**
 * For the basket and checkout (rendered on every request), so the customer
 * only ever proceeds towards an order when the database is answering now.
 */
export async function getLiveCatalog(): Promise<{ products: PublicProduct[]; zones: ZoneRule[]; settings: PublicSettings }> {
  const [products, zones, settings] = await Promise.all([getActiveProducts(), getDeliveryZones(), getSettings()]);
  return { products, zones, settings };
}
