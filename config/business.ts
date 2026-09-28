/**
 * ─────────────────────────────────────────────────────────────
 *  TIMBER & FLAME — CENTRAL BUSINESS CONFIGURATION
 * ─────────────────────────────────────────────────────────────
 *
 * This file holds the *defaults* that seed the database the first
 * time you run `npm run db:seed`.
 *
 * After seeding, the live values (prices, products on/off, phone,
 * delivery charges, opening hours, etc.) are edited in the admin area
 * at /admin — no rebuild or redeploy needed.
 *
 * Only the brand constants at the top of this file are baked into the
 * build (business name, tagline, town). Everything marked `null` is
 * UNKNOWN and deliberately left blank rather than invented.
 */

export const BRAND = {
  name: "Timber & Flame Firewood",
  shortName: "Timber & Flame",
  tagline: "Quality Wood • Honest Prices",
  town: "Crieff",
  region: "Perthshire",
  country: "GB",
  /** Used in copy and schema.org areaServed. Only list confirmed areas. */
  serviceAreaSummary: "Crieff and surrounding areas",
} as const;

/** Defaults written to the SiteSettings table on first seed. */
export const DEFAULT_SETTINGS = {
  phoneDisplay: "07535 759768",
  /** E.164 format for tel: links and structured data. */
  phoneE164: "+447535759768",
  /** Public contact email. */
  contactEmail: "timberflame84@gmail.com" as string | null,
  /** Street address — unknown, so left blank. Town/region come from BRAND. */
  addressLine: null as string | null,
  /** Free-text opening / availability info. Unknown — left blank. */
  openingHours: null as string | null,
  /** Where the honesty stand is. Unknown — left blank. */
  standLocation: null as string | null,
  /** Let customers place an order now and settle payment when contacted. */
  payLaterEnabled: true,
  /** Collection is off until the owner confirms how collection works. */
  collectionEnabled: false,
  collectionInstructions: null as string | null,
  /** Optional banner shown across the top of the site. */
  announcement: null as string | null,
};

/**
 * Delivery wording used across the site, in one place.
 * Product prices INCLUDE delivery within Crieff. The outside-Crieff charge
 * itself lives in the delivery zones (/admin/delivery) and is never invented.
 */
export const DELIVERY_COPY = {
  /** Main message used in banners, hero and headings. */
  headline: "Free / included delivery in Crieff",
  /** Short badge / trust-row wording. */
  short: "Delivery included in Crieff",
  /** Appended to a price: "£10 delivered in Crieff". */
  priceSuffix: "delivered in Crieff",
  /** Shown wherever outside-Crieff delivery is mentioned. */
  outside: "Small delivery charge may apply outside Crieff.",
  outsideContact: "Contact us if you're outside Crieff and we'll confirm the delivery cost.",
} as const;
