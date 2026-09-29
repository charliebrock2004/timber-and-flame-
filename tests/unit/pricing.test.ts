import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuote, findZone, normalisePostcode, postcodeMatches, type ZoneRule } from "@/lib/delivery";
import { formatPence, formatPenceShort, parsePoundsToPence } from "@/lib/money";
import { DEFAULT_DELIVERY_ZONES } from "@/config/catalog";

const PRICES = [
  { id: "seasoned-firewood", name: "Seasoned Firewood", pricePence: 1000 },
  { id: "kindling", name: "Netted Bag of Kindling", pricePence: 700 },
  { id: "road-salt", name: "Road Salt", pricePence: 500 },
  { id: "pickup-load", name: "Pickup Load", pricePence: 12000 },
];
const ZONES: ZoneRule[] = DEFAULT_DELIVERY_ZONES;

test("money formatting and parsing", () => {
  assert.equal(formatPence(3000), "£30.00");
  assert.equal(formatPenceShort(1000), "£10");
  assert.equal(formatPenceShort(450), "£4.50");
  assert.equal(parsePoundsToPence("10"), 1000);
  assert.equal(parsePoundsToPence("£4.5"), 450);
  assert.equal(parsePoundsToPence("-1"), null);
  assert.equal(parsePoundsToPence("abc"), null);
  assert.equal(parsePoundsToPence("1.234"), null);
});

test("3 × firewood is 3 × £10 = £30, not £10", () => {
  const q = buildQuote([{ productId: "seasoned-firewood", quantity: 3 }], PRICES, 0);
  assert.deepEqual(q.lines[0], {
    productId: "seasoned-firewood",
    name: "Seasoned Firewood",
    unitPricePence: 1000,
    quantity: 3,
    lineTotalPence: 3000,
  });
  assert.equal(q.subtotalPence, 3000);
  assert.equal(q.totalPence, 3000);
});

test("mixed basket totals", () => {
  const q = buildQuote(
    [
      { productId: "seasoned-firewood", quantity: 2 },
      { productId: "kindling", quantity: 3 },
      { productId: "road-salt", quantity: 1 },
    ],
    PRICES,
    0,
  );
  assert.deepEqual(
    q.lines.map((l) => l.lineTotalPence),
    [2000, 2100, 500],
  );
  assert.equal(q.subtotalPence, 4600);
});

test("unknown products and zero quantities are ignored", () => {
  const q = buildQuote(
    [
      { productId: "gold-bars", quantity: 5 },
      { productId: "road-salt", quantity: 0 },
      { productId: "kindling", quantity: 1 },
    ],
    PRICES,
    0,
  );
  assert.equal(q.lines.length, 1);
  assert.equal(q.subtotalPence, 700);
});

test("delivery charge to be confirmed is never added to the total", () => {
  const q = buildQuote([{ productId: "seasoned-firewood", quantity: 1 }], PRICES, null);
  assert.equal(q.deliveryChargePence, null);
  assert.equal(q.totalPence, 1000);
  const charged = buildQuote([{ productId: "seasoned-firewood", quantity: 1 }], PRICES, 350);
  assert.equal(charged.totalPence, 1350);
});

test("postcode normalisation", () => {
  assert.equal(normalisePostcode("ph73aa"), "PH7 3AA");
  assert.equal(normalisePostcode("  PH7   3AA "), "PH7 3AA");
  assert.equal(normalisePostcode("PH1 5XY"), "PH1 5XY");
  assert.equal(normalisePostcode("EH1 1YZ"), "EH1 1YZ");
  assert.equal(normalisePostcode("PH7"), null);
  assert.equal(normalisePostcode("hello"), null);
});

test("postcode prefix matching is exact on the district", () => {
  assert.equal(postcodeMatches("PH7 3AA", "PH7"), true);
  assert.equal(postcodeMatches("PH70 1AA", "PH7"), false);
  assert.equal(postcodeMatches("PH7 3AA", "PH7 3"), true);
  assert.equal(postcodeMatches("PH7 4AA", "PH7 3"), false);
});

test("zones come from configuration: Crieff included, elsewhere to be confirmed", () => {
  assert.equal(findZone("PH7 3AA", ZONES)?.id, "crieff");
  assert.equal(findZone("PH7 3AA", ZONES)?.chargePence, 0);
  const outside = findZone("PH1 5XY", ZONES);
  assert.equal(outside?.id, "outside-crieff");
  assert.equal(outside?.chargePence, null);
  assert.equal(findZone("PH70 1AA", ZONES)?.id, "outside-crieff");
});

test("PH7 is only Crieff because the zone config says so", () => {
  const narrowed = ZONES.map((z) => (z.id === "crieff" ? { ...z, postcodePrefixes: ["PH7 4"] } : z));
  assert.equal(findZone("PH7 4AB", narrowed)?.id, "crieff");
  assert.equal(findZone("PH7 3AA", narrowed)?.id, "outside-crieff");
  const disabled = ZONES.map((z) => (z.id === "crieff" ? { ...z, enabled: false } : z));
  assert.equal(findZone("PH7 3AA", disabled)?.id, "outside-crieff");
  assert.equal(
    findZone(
      "PH1 5XY",
      ZONES.filter((z) => z.id === "crieff"),
    ),
    null,
  );
});
