import "server-only";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { DEFAULT_PRODUCTS, DEFAULT_DELIVERY_ZONES } from "@/config/catalog";
import { DEFAULT_SETTINGS } from "@/config/business";
import type { ZoneRule } from "./delivery";

export const CACHE_TAGS = { catalog: "catalog", settings: "settings" } as const;

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

export type PublicSettings = typeof DEFAULT_SETTINGS;

/**
 * Public reads of products / zones / settings. Cached and tagged, so an
 * admin edit refreshes every page straight away — no rebuild needed.
 *
 * If the database is unreachable the site still renders from the config
 * defaults, but checkout always re-reads the database and will refuse to
 * take an order without it.
 */
export const getActiveProducts = unstable_cache(
  async (): Promise<PublicProduct[]> => {
    try {
      const p = schema.products;
      return await db
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
        .orderBy(asc(p.sortOrder));
    } catch (e) {
      console.error("[catalog] DB unavailable, using config defaults", e);
      return DEFAULT_PRODUCTS.filter((p) => p.active).map((p) => ({ ...p, image: p.image ?? null }));
    }
  },
  ["active-products"],
  { tags: [CACHE_TAGS.catalog], revalidate: 3600 },
);

export const getDeliveryZones = unstable_cache(
  async (): Promise<ZoneRule[]> => {
    try {
      return await db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sortOrder));
    } catch (e) {
      console.error("[catalog] DB unavailable, using default zones", e);
      return DEFAULT_DELIVERY_ZONES;
    }
  },
  ["delivery-zones"],
  { tags: [CACHE_TAGS.catalog], revalidate: 3600 },
);

export const getSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    try {
      const [s] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
      if (s) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = s;
        return rest;
      }
    } catch (e) {
      console.error("[catalog] DB unavailable, using default settings", e);
    }
    return DEFAULT_SETTINGS;
  },
  ["site-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 },
);
