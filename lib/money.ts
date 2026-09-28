/** All money is handled as integer pence. Formatting happens only at the edge. */

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const gbpShort = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** £10.00 */
export function formatPence(pence: number): string {
  return gbp.format(pence / 100);
}

/** £10 (drops .00 for whole pounds — nicer on price tags) */
export function formatPenceShort(pence: number): string {
  return pence % 100 === 0 ? gbpShort.format(pence / 100) : gbp.format(pence / 100);
}

/**
 * Parse an admin-entered pounds value ("10", "10.5", "£10.50") into pence.
 * Returns null for anything that isn't a clean, non-negative amount.
 */
export function parsePoundsToPence(input: string): number | null {
  const cleaned = input.trim().replace(/^£/, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
