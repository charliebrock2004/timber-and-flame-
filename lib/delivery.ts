/**
 * Pure delivery + pricing logic, shared by the browser (for a live preview)
 * and the server (for the authoritative total). The server NEVER trusts a
 * total sent by the browser — it re-runs this with prices from the database.
 */

export type ZoneRule = {
  id: string;
  name: string;
  description: string | null;
  postcodePrefixes: string[];
  chargePence: number | null;
  enabled: boolean;
  sortOrder: number;
};

/** UK postcode, reasonably strict. Accepts with or without the space. */
const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/;

export function normalisePostcode(raw: string): string | null {
  const up = raw.toUpperCase().replace(/\s+/g, " ").trim();
  const m = UK_POSTCODE.exec(up);
  return m ? `${m[1]} ${m[2]}` : null;
}

/**
 * Does `postcode` (normalised, "PH7 3AB") fall under `prefix`?
 * "PH7" matches the whole district only — it must NOT match "PH70 …".
 * "PH7 3" matches that sector.
 */
export function postcodeMatches(postcode: string, prefix: string): boolean {
  const p = prefix.toUpperCase().replace(/\s+/g, " ").trim();
  if (!p) return false;
  if (!p.includes(" ")) return postcode.split(" ")[0] === p;
  return postcode.startsWith(p);
}

/**
 * Pick the zone for a postcode: first enabled zone (by sortOrder) with a
 * matching prefix, else the first enabled catch-all (no prefixes).
 * Returns null if nothing applies (i.e. we don't deliver there).
 */
export function findZone(postcode: string, zones: ZoneRule[]): ZoneRule | null {
  const enabled = zones.filter((z) => z.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const specific = enabled.find((z) => z.postcodePrefixes.length > 0 && z.postcodePrefixes.some((pre) => postcodeMatches(postcode, pre)));
  return specific ?? enabled.find((z) => z.postcodePrefixes.length === 0) ?? null;
}

export type LineInput = { productId: string; quantity: number };
export type PriceRow = { id: string; name: string; pricePence: number };

export type Quote = {
  lines: { productId: string; name: string; unitPricePence: number; quantity: number; lineTotalPence: number }[];
  subtotalPence: number;
  /** null = delivery charge to be confirmed */
  deliveryChargePence: number | null;
  totalPence: number;
};

export function buildQuote(lines: LineInput[], prices: PriceRow[], deliveryChargePence: number | null): Quote {
  const byId = new Map(prices.map((p) => [p.id, p]));
  const out: Quote["lines"] = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p || l.quantity <= 0) continue;
    out.push({
      productId: p.id,
      name: p.name,
      unitPricePence: p.pricePence,
      quantity: l.quantity,
      lineTotalPence: p.pricePence * l.quantity,
    });
  }
  const subtotalPence = out.reduce((s, l) => s + l.lineTotalPence, 0);
  return {
    lines: out,
    subtotalPence,
    deliveryChargePence,
    totalPence: subtotalPence + (deliveryChargePence ?? 0),
  };
}
