/**
 * ─────────────────────────────────────────────────────────────
 *  PRODUCTS — the single source of truth for what's on sale
 * ─────────────────────────────────────────────────────────────
 * These seed the database. After that, live prices / descriptions /
 * availability are edited at /admin/products (no rebuild needed).
 *
 * Prices are in PENCE (integers) and INCLUDE delivery within Crieff.
 * The `unitLabel` says what one unit is ("per bag", "per load").
 * Outside Crieff a small delivery charge may be added — see the delivery
 * zones below and DELIVERY_COPY in config/business.ts.
 *
 *   id / slug   stable identifier used in the basket and URLs
 *   name        product name
 *   sizeLabel   supplied spec shown under the name (null = none given)
 *   pricePence  price per unit (per bag, or per load), delivered in Crieff
 *   active      available to order online
 */

export type ProductVisual = "firewood" | "kindling" | "salt";

export const DEFAULT_PRODUCTS = [
  {
    id: "fully-seasoned-pickup-load",
    name: "Fully Seasoned Pickup Load — Softwood",
    shortDescription:
      "L200 pickup bed full of fully seasoned softwood logs. This is a loose load, not bagged. The load is stacked when delivered.",
    unitLabel: "per load",
    sizeLabel: null as string | null,
    pricePence: 15000,
    image: "/images/pickup-load.jpg" as string | null,
    visual: "firewood" as ProductVisual,
    accent: "red",
    sortOrder: 1,
    active: true,
  },
  {
    id: "fully-seasoned-pickup-hardwood",
    name: "Fully Seasoned Pickup Load — Hardwood",
    shortDescription:
      "L200 pickup bed full of fully seasoned hardwood logs. This is a loose load, not bagged. The load is stacked when delivered.",
    unitLabel: "per load",
    sizeLabel: null as string | null,
    pricePence: 16500,
    image: "/images/pickup-load.jpg" as string | null,
    visual: "firewood" as ProductVisual,
    accent: "red",
    sortOrder: 2,
    active: true,
  },
  {
    id: "fully-seasoned-bulk-softwood",
    name: "Fully Seasoned Bulk Bag — Softwood",
    shortDescription: "Fully seasoned softwood logs supplied in a bulk bag, for a wood burner, fireplace or fire pit.",
    unitLabel: "per bag",
    sizeLabel: null as string | null,
    pricePence: 9500,
    image: "/images/bulk-bag-of-logs.jpg" as string | null,
    visual: "firewood" as ProductVisual,
    accent: "green",
    sortOrder: 3,
    active: true,
  },
  {
    id: "fully-seasoned-bulk-bag",
    name: "Fully Seasoned Bulk Bag — Hardwood",
    shortDescription: "Fully seasoned hardwood logs supplied in a bulk bag, for a wood burner, fireplace or fire pit.",
    unitLabel: "per bag",
    sizeLabel: null as string | null,
    pricePence: 11000,
    image: "/images/bulk-bag-of-logs.jpg" as string | null,
    visual: "firewood" as ProductVisual,
    accent: "green",
    sortOrder: 4,
    active: true,
  },
  {
    id: "pickup-load",
    name: "Part-Seasoned Pickup Load — Softwood",
    shortDescription:
      "L200 pickup bed full of part-seasoned softwood logs. This is a loose load, not bagged. The load is stacked when delivered.",
    unitLabel: "per load",
    sizeLabel: null as string | null,
    pricePence: 12000,
    image: "/images/pickup-load.jpg" as string | null,
    visual: "firewood" as ProductVisual,
    accent: "red",
    sortOrder: 5,
    active: true,
  },
  {
    id: "bulk-bag-of-logs",
    name: "Part-Seasoned Bulk Bag — Softwood",
    shortDescription: "Part-seasoned softwood logs supplied in a bulk bag, for a wood burner, fireplace or fire pit.",
    unitLabel: "per bag",
    sizeLabel: null as string | null,
    pricePence: 8000,
    image: "/images/bulk-bag-of-logs.jpg" as string | null,
    visual: "firewood" as ProductVisual,
    accent: "green",
    sortOrder: 6,
    active: true,
  },
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
    sortOrder: 7,
    active: true,
  },
  {
    id: "kindling",
    name: "Netted Bag of Kindling",
    shortDescription: "Dry kindling supplied in a 75cm × 45cm netted bag.",
    unitLabel: "per bag",
    sizeLabel: "75cm × 45cm" as string | null,
    pricePence: 700,
    image: "/images/kindling-bag.jpg" as string | null,
    visual: "kindling" as ProductVisual,
    accent: "orange",
    sortOrder: 8,
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
    sortOrder: 9,
    active: true,
  },
];

/**
 * How the six firewood options are grouped on the shop. Prices live only on
 * DEFAULT_PRODUCTS (and then the database). This list is ids and labels.
 * Fully seasoned is first. Pickup loads come before bulk bags in each section.
 * Part-seasoned is softwood only.
 */
export const FIREWOOD_SECTIONS = [
  {
    id: "fully-seasoned",
    heading: "Fully Seasoned Firewood",
    note: "Ready to burn. Choose softwood or hardwood — the price updates before you add it to your basket.",
    groups: [
      {
        id: "fully-seasoned-pickup",
        name: "Fully Seasoned Pickup Loads",
        optionIds: ["fully-seasoned-pickup-load", "fully-seasoned-pickup-hardwood"],
      },
      {
        id: "fully-seasoned-bags",
        name: "Fully Seasoned Bulk Bags",
        optionIds: ["fully-seasoned-bulk-softwood", "fully-seasoned-bulk-bag"],
      },
    ],
  },
  {
    id: "part-seasoned",
    heading: "Part-Seasoned Firewood",
    note: "Part-seasoned softwood only. These are not fully seasoned.",
    groups: [
      {
        id: "part-seasoned-pickup",
        name: "Part-Seasoned Pickup Loads",
        optionIds: ["pickup-load"],
      },
      {
        id: "part-seasoned-bags",
        name: "Part-Seasoned Bulk Bags",
        optionIds: ["bulk-bag-of-logs"],
      },
    ],
  },
] as const;

/** Button label for each firewood option. Part-seasoned says so explicitly. */
export const WOOD_OPTION_LABEL: Record<string, string> = {
  "fully-seasoned-pickup-load": "Softwood",
  "fully-seasoned-pickup-hardwood": "Hardwood",
  "fully-seasoned-bulk-softwood": "Softwood",
  "fully-seasoned-bulk-bag": "Hardwood",
  "pickup-load": "Part-seasoned softwood",
  "bulk-bag-of-logs": "Part-seasoned softwood",
};

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
