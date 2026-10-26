import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DEFAULT_PRODUCTS } from "@/config/catalog";
import { buildQuote } from "@/lib/delivery";
import { formatPence } from "@/lib/money";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PRICES = DEFAULT_PRODUCTS.map((p) => ({ id: p.id, name: p.name, pricePence: p.pricePence }));
const total = (...lines: [string, number][]) =>
  buildQuote(
    lines.map(([productId, quantity]) => ({ productId, quantity })),
    PRICES,
    0,
  ).totalPence;

test("catalogue is exactly the five current products, in order", () => {
  assert.deepEqual(
    DEFAULT_PRODUCTS.map((p) => [p.id, p.name, p.pricePence, p.unitLabel, p.sizeLabel, p.active]),
    [
      ["seasoned-firewood", "Seasoned Firewood", 1000, "per bag", null, true],
      ["kindling", "Netted Bag of Kindling", 700, "per bag", "75cm × 45cm", true],
      ["road-salt", "Road Salt", 500, "per bag", null, true],
      ["pickup-load", "Pickup Load", 12000, "per load", null, true],
      ["bulk-bag-of-logs", "Bulk Bag of Logs", 8000, "per bag", null, true],
    ],
  );
});

test("Pickup Load description is the supplied wording and never calls it a bag", () => {
  const p = DEFAULT_PRODUCTS.find((x) => x.id === "pickup-load")!;
  for (const s of [
    "L200 pickup bed full of logs.",
    "Part seasoned.",
    "Equivalent to approximately 1½ bulk bags.",
    "This is a loose load, not bagged.",
    "The load is stacked when delivered.",
  ])
    assert.ok(p.shortDescription.includes(s), s);
  assert.equal(p.unitLabel, "per load");
  assert.ok(p.shortDescription.length <= 240, "fits the admin description limit");
});

test("Pickup Load quantities and combinations", () => {
  assert.equal(formatPence(total(["pickup-load", 1])), "£120.00");
  assert.equal(formatPence(total(["pickup-load", 2])), "£240.00");
  assert.equal(total(["pickup-load", 1], ["kindling", 1]), 12700);
  assert.equal(total(["pickup-load", 1], ["seasoned-firewood", 1], ["road-salt", 1]), 13500);
  assert.equal(total(["pickup-load", 1], ["kindling", 2]), 13400);
  assert.equal(total(["kindling", 1]), 700);
  assert.equal(total(["kindling", 2]), 1400);
});

test("kindling is £7 and the supplied photo is installed (full frame, green net)", async () => {
  const k = DEFAULT_PRODUCTS.find((x) => x.id === "kindling")!;
  assert.equal(k.pricePence, 700);
  assert.equal(k.image, "/images/kindling-bag.jpg");
  const file = path.join(ROOT, "public", k.image);
  const meta = await sharp(file).metadata();
  assert.equal(`${meta.width}×${meta.height}`, "816×1262", "uploaded photo, uncropped");
  assert.ok(fs.statSync(file).size < 400_000, "web-sized");
  // Centre of the bag is the green net: green channel clearly dominates.
  const { data } = await sharp(file)
    .extract({ left: 250, top: 500, width: 300, height: 400 })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  assert.ok(g > r + 15 && g > b + 15, `expected a green bag, got rgb(${r},${g},${b})`);
});

test("old honesty-stand prices are not in current source, seed data or migrations' end state", () => {
  const scan = (dir: string): string[] =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) return scan(rel);
      return /\.(tsx?|json|sql)$/.test(e.name) ? [rel] : [];
    });
  const files = [...scan("app"), ...scan("components"), ...scan("config"), ...scan("lib"), "db/seed.ts", "db/schema.ts"];
  const bad: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    // "£3" / "£4" as a whole-pound price, or 300/400 pence as a price.
    for (const m of text.matchAll(/£\s?[34](?![\d.,])|pricePence:\s*(?:300|400)\b|price_pence"?\s*[:=]\s*(?:300|400)\b/g))
      bad.push(`${f}: ${m[0]}`);
  }
  assert.deepEqual(bad, []);
});

test("Pickup Load uses the supplied L200 photo, not the bag photo", async () => {
  const p = DEFAULT_PRODUCTS.find((x) => x.id === "pickup-load")!;
  assert.equal(p.image, "/images/pickup-load.jpg");
  assert.notEqual(p.image, "/images/firewood-bags.jpg");
  const file = path.join(ROOT, "public", p.image!);
  const meta = await sharp(file).metadata();
  assert.equal(`${meta.width}×${meta.height}`, "1500×1792");
  assert.ok(fs.statSync(file).size < 500_000, "web-sized");
  // Lower centre is the blue tailgate, not the pale bag photo.
  const { data } = await sharp(file)
    .extract({ left: 200, top: 1640, width: 500, height: 120 })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  assert.ok(b > r + 10 && b > g, `expected the blue L200, got rgb(${r},${g},${b})`);
});

test("migration 0006 sets the pickup photo only when none is set", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0006_pickup_load_photo.sql"), "utf8");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE)\b/i.test(sql.replace(/--.*$/gm, "")));
  assert.match(sql, /'pickup-load' AND \("image" IS NULL/);
  assert.match(sql, /\/images\/pickup-load\.jpg/);
  assert.doesNotMatch(sql, /price_pence/i);
});

test("Bulk Bag of Logs is £80 per bag, with the supplied bulk-bag photo and no invented specification", () => {
  const p = DEFAULT_PRODUCTS.find((x) => x.id === "bulk-bag-of-logs")!;
  assert.equal(p.name, "Bulk Bag of Logs");
  assert.equal(p.pricePence, 8000);
  assert.equal(formatPence(p.pricePence), "£80.00");
  assert.equal(formatPence(total(["bulk-bag-of-logs", 1])), "£80.00");
  assert.equal(formatPence(total(["bulk-bag-of-logs", 2])), "£160.00");
  assert.equal(p.unitLabel, "per bag");
  assert.equal(p.sizeLabel, null);
  assert.equal(p.image, "/images/bulk-bag-of-logs.jpg");
  assert.equal(p.visual, "firewood");
  assert.equal(p.active, true);
  assert.ok(p.shortDescription.length <= 240, "fits the admin description limit");
  assert.match(p.shortDescription, /bulk bag of logs/i);
  assert.doesNotMatch(p.shortDescription, /moisture|kiln|hardwood|softwood|oak|birch|ash|cubic|m³|litre|cm\b/i);
  const file = path.join(ROOT, "public", p.image);
  assert.ok(fs.existsSync(file), "bulk bag photo is in public/images");
});

test("migration 0007 sets the bulk bag photo only when none is set", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0007_bulk_bag_photo.sql"), "utf8");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE)\b/i.test(sql.replace(/--.*$/gm, "")));
  assert.match(sql, /'bulk-bag-of-logs' AND \("image" IS NULL/);
  assert.match(sql, /\/images\/bulk-bag-of-logs\.jpg/);
  assert.doesNotMatch(sql, /price_pence/i);
});

test("migration 0005 inserts the bulk bag once and never deletes or resets", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0005_bulk_bag_of_logs.sql"), "utf8");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE|UPDATE)\b/i.test(sql.replace(/--.*$/gm, "")));
  assert.match(sql, /ON CONFLICT \("id"\) DO NOTHING/);
  assert.match(sql, /'bulk-bag-of-logs'/);
  assert.match(sql, /8000/);
  assert.equal((sql.match(/8000/g) ?? []).length, 1);
});

test("migration 0004 only fixes exact stale prices and never deletes or resets", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0004_pickup_load_and_kindling_photo.sql"), "utf8");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE)\b/i.test(sql.replace(/--.*$/gm, "")));
  assert.match(sql, /ON CONFLICT \("id"\) DO NOTHING/);
  assert.match(sql, /"id" = 'kindling' AND "price_pence" = 300/);
  assert.match(sql, /"id" = 'road-salt' AND "price_pence" = 400/);
  assert.match(sql, /'kindling' AND \("image" IS NULL/);
});
