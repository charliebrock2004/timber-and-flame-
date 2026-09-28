/**
 * ─────────────────────────────────────────────────────────────
 *  PRODUCTS — the single source of truth for what's on sale
 * ─────────────────────────────────────────────────────────────
 * These seed the database. After that, live prices / descriptions /
 * availability are edited at /admin/products (no rebuild needed).
 *
 * Prices are in PENCE (integers) and INCLUDE delivery within Crieff.
 * Outside Crieff a small delivery charge may be added — see the delivery
 * zones below and DELIVERY_COPY in config/business.ts.
 *
 *   id / slug   stable identifier used in the basket and URLs
 *   name        product name
 *   sizeLabel   supplied spec shown under the name (null = none given)
 *   pricePence  price per bag, delivered in Crieff
 *   active      available to order online
 */

export type ProductVisual = "firewood" | "kindling" | "salt";

export const DEFAULT_PRODUCTS = [
  {
    id: "seasoned-firewood",
    name: "Seasoned Firewood",
    shortDescription: "Quality seasoned firewood supplied in convenient bags.",
    unitLabel: "per bag",
    sizeLabel: null as string | null,
    pricePence: 1000,
    image: "/images/firewood-bags.jpg",
    visual: "firewood" as ProductVisual,
    accent: "green",
    sortOrder: 1,
    active: true,
  },
  {
    id: "kindling",
    name: "Netted Bag of Kindling",
    shortDescription: "Dry kindling supplied in a 75cm × 45cm netted bag.",
    unitLabel: "per bag",
    sizeLabel: "75cm × 45cm" as string | null,
    pricePence: 700,
    image: null as string | null,
    visual: "kindling" as ProductVisual,
    accent: "orange",
    sortOrder: 2,
    active: true,
  },
  {
    id: "road-salt",
    name: "Road Salt",
    shortDescription: "Road salt for helping keep paths, driveways and access areas safer during icy weather.",
    unitLabel: "per bag",
    sizeLabel: null as string | null,
    pricePence: 500,
    image: null as string | null,
    visual: "salt" as ProductVisual,
    accent: "blue",
    sortOrder: 3,
    active: true,
  },
];

/**
 * Delivery zones. The first enabled zone whose postcode prefixes match the
 * customer's postcode is used. A zone with NO prefixes is the catch-all.
 *
 * chargePence:
 *   0     → delivery included in the product price
 *   >0    → fixed charge added to the order
 *   null  → charge not set yet: the order can still be placed, but the
 *           delivery charge is confirmed by phone and online card payment
 *           is not offered (we never charge a made-up amount).
 *
 * NOTE: "PH7" is the Crieff postcode district. Please confirm that included
 * delivery should apply to the whole of PH7 (it includes some villages
 * around the town) or narrow it (e.g. "PH7 3", "PH7 4") in /admin/delivery.
 */
export const DEFAULT_DELIVERY_ZONES = [
  {
    id: "crieff",
    name: "Crieff",
    description: "Delivery is included in our advertised prices within Crieff.",
    postcodePrefixes: ["PH7"],
    chargePence: 0,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "outside-crieff",
    name: "Outside Crieff",
    description: "Contact us if you're outside Crieff and we'll confirm the delivery cost.",
    postcodePrefixes: [] as string[],
    chargePence: null as number | null,
    enabled: true,
    sortOrder: 99,
  },
];

/** Hard limits that protect against silly or abusive orders. */
export const ORDER_LIMITS = {
  maxQuantityPerLine: 50,
  maxLines: 10,
};
