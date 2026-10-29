import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DEFAULT_PRODUCTS, FIREWOOD_SECTIONS, WOOD_OPTION_LABEL } from "@/config/catalog";
import { arrangeCatalogue } from "@/lib/firewood-groups";
import type { PublicProduct } from "@/lib/catalog";
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

test("catalogue is the nine current products, fully seasoned options first", () => {
  assert.deepEqual(
    DEFAULT_PRODUCTS.map((p) => [p.id, p.name, p.pricePence, p.unitLabel, p.sizeLabel, p.active]),
    [
      ["fully-seasoned-pickup-load", "Fully Seasoned Pickup Load — Softwood", 15000, "per load", null, true],
      ["fully-seasoned-pickup-hardwood", "Fully Seasoned Pickup Load — Hardwood", 16500, "per load", null, true],
      ["fully-seasoned-bulk-softwood", "Fully Seasoned Bulk Bag — Softwood", 9500, "per bag", null, true],
      ["fully-seasoned-bulk-bag", "Fully Seasoned Bulk Bag — Hardwood", 11000, "per bag", null, true],
      ["pickup-load", "Part-Seasoned Pickup Load — Softwood", 12000, "per load", null, true],
      ["bulk-bag-of-logs", "Part-Seasoned Bulk Bag — Softwood", 8000, "per bag", null, true],
      ["seasoned-firewood", "Seasoned Firewood", 1000, "per bag", null, true],
      ["kindling", "Netted Bag of Kindling", 700, "per bag", "75cm × 45cm", true],
      ["road-salt", "Road Salt", 500, "per bag", null, true],
    ],
  );
});

test("Pickup Load description is a loose stacked load and does not claim a bulk-bag equivalent", () => {
  const p = DEFAULT_PRODUCTS.find((x) => x.id === "pickup-load")!;
  for (const s of [
    "L200 pickup bed full of part-seasoned softwood logs.",
    "This is a loose load, not bagged.",
    "The load is stacked when delivered.",
  ])
    assert.ok(p.shortDescription.includes(s), s);
  assert.equal(p.unitLabel, "per load");
  assert.doesNotMatch(p.shortDescription, /1½|1\.5|bulk bag/i);
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

test("fully seasoned pickup is softwood at £150 and hardwood at £165, same photo, no bag-equivalent claim", () => {
  const part = DEFAULT_PRODUCTS.find((x) => x.id === "pickup-load")!;
  const soft = DEFAULT_PRODUCTS.find((x) => x.id === "fully-seasoned-pickup-load")!;
  const hard = DEFAULT_PRODUCTS.find((x) => x.id === "fully-seasoned-pickup-hardwood")!;
  assert.equal(soft.name, "Fully Seasoned Pickup Load — Softwood");
  assert.equal(soft.pricePence, 15000);
  assert.equal(formatPence(soft.pricePence), "£150.00");
  assert.equal(formatPence(total(["fully-seasoned-pickup-load", 1])), "£150.00");
  assert.equal(hard.pricePence, 16500);
  assert.equal(formatPence(total(["fully-seasoned-pickup-hardwood", 1])), "£165.00");
  assert.equal(formatPence(total(["fully-seasoned-pickup-hardwood", 2])), "£330.00");
  assert.equal(soft.unitLabel, "per load");
  assert.equal(hard.unitLabel, "per load");
  assert.equal(soft.image, part.image);
  assert.equal(hard.image, "/images/pickup-load.jpg");
  assert.match(soft.shortDescription, /fully seasoned softwood/i);
  assert.match(hard.shortDescription, /fully seasoned hardwood/i);
  for (const p of [soft, hard, part]) {
    assert.doesNotMatch(p.shortDescription, /1½|1\.5|equivalent/i);
    assert.ok(p.shortDescription.length <= 240);
  }
});

test("Part Seasoned Pickup Load uses the supplied L200 photo, not the bag photo", async () => {
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

test("bulk bags are softwood and hardwood when fully seasoned, and part-seasoned softwood only at £80", () => {
  const part = DEFAULT_PRODUCTS.find((x) => x.id === "bulk-bag-of-logs")!;
  const hard = DEFAULT_PRODUCTS.find((x) => x.id === "fully-seasoned-bulk-bag")!;
  const soft = DEFAULT_PRODUCTS.find((x) => x.id === "fully-seasoned-bulk-softwood")!;
  assert.equal(part.name, "Part-Seasoned Bulk Bag — Softwood");
  assert.equal(part.pricePence, 8000);
  assert.equal(formatPence(part.pricePence), "£80.00");
  assert.equal(formatPence(total(["bulk-bag-of-logs", 1])), "£80.00");
  assert.equal(formatPence(total(["bulk-bag-of-logs", 2])), "£160.00");
  assert.equal(part.unitLabel, "per bag");
  assert.equal(part.sizeLabel, null);
  assert.equal(part.image, "/images/bulk-bag-of-logs.jpg");
  assert.equal(part.visual, "firewood");
  assert.equal(part.active, true);
  assert.match(part.shortDescription, /part-seasoned softwood/i);
  assert.match(part.shortDescription, /bulk bag/i);
  assert.equal(soft.pricePence, 9500);
  assert.equal(formatPence(total(["fully-seasoned-bulk-softwood", 1])), "£95.00");
  assert.match(soft.shortDescription, /fully seasoned softwood/i);
  assert.equal(hard.name, "Fully Seasoned Bulk Bag — Hardwood");
  assert.equal(hard.pricePence, 11000);
  assert.equal(formatPence(hard.pricePence), "£110.00");
  assert.equal(formatPence(total(["fully-seasoned-bulk-bag", 1])), "£110.00");
  assert.equal(soft.image, part.image);
  assert.equal(hard.image, part.image);
  assert.equal(hard.unitLabel, "per bag");
  assert.match(hard.shortDescription, /fully seasoned hardwood/i);
  for (const p of [part, soft, hard]) {
    assert.doesNotMatch(p.shortDescription, /moisture|kiln|oak|birch|\bash\b|cubic|m³|litre|cm\b|1½|1\.5/i);
    assert.ok(p.shortDescription.length <= 240);
  }
  const file = path.join(ROOT, "public", part.image!);
  assert.ok(fs.existsSync(file), "bulk bag photo is in public/images");
});

test("migration 0008 sets the four seasoned prices without deleting or replacing photos", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0008_seasoned_options.sql"), "utf8");
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE)\b/i.test(code));
  assert.match(sql, /'Part Seasoned Pickup Load'/);
  assert.match(sql, /'Fully Seasoned Pickup Load'/);
  assert.match(sql, /'Part Seasoned Bulk Bag'/);
  assert.match(sql, /'Fully Seasoned Bulk Bag'/);
  assert.match(sql, /WHERE "id" = 'pickup-load'/);
  assert.match(sql, /12000/);
  assert.match(sql, /16000/);
  assert.match(sql, /8000/);
  assert.match(sql, /11000/);
  assert.match(sql, /\/images\/pickup-load\.jpg/);
  assert.match(sql, /\/images\/bulk-bag-of-logs\.jpg/);
  assert.doesNotMatch(sql, /\/images\/(?!pickup-load\.jpg|bulk-bag-of-logs\.jpg)/);
});

test("catalogue sort is fully seasoned, then part-seasoned, then the other products", () => {
  assert.deepEqual(
    DEFAULT_PRODUCTS.map((p) => [p.id, p.sortOrder]),
    [
      ["fully-seasoned-pickup-load", 1],
      ["fully-seasoned-pickup-hardwood", 2],
      ["fully-seasoned-bulk-softwood", 3],
      ["fully-seasoned-bulk-bag", 4],
      ["pickup-load", 5],
      ["bulk-bag-of-logs", 6],
      ["seasoned-firewood", 7],
      ["kindling", 8],
      ["road-salt", 9],
    ],
  );
});

test("shop groups fully seasoned above part-seasoned, with the six prices on the matching options", () => {
  const products: PublicProduct[] = DEFAULT_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    shortDescription: p.shortDescription,
    unitLabel: p.unitLabel,
    sizeLabel: p.sizeLabel,
    pricePence: p.pricePence,
    image: p.image,
    visual: p.visual,
    accent: p.accent,
  }));
  const { sections, other } = arrangeCatalogue(products);
  assert.deepEqual(
    sections.map((s) => s.heading),
    ["Fully Seasoned Firewood", "Part-Seasoned Firewood"],
  );
  assert.deepEqual(
    sections.flatMap((s) => s.groups.map((g) => [g.name, ...g.options.map((o) => [o.label, o.product.id, o.product.pricePence])])),
    [
      [
        "Fully Seasoned Pickup Loads",
        ["Softwood", "fully-seasoned-pickup-load", 15000],
        ["Hardwood", "fully-seasoned-pickup-hardwood", 16500],
      ],
      ["Fully Seasoned Bulk Bags", ["Softwood", "fully-seasoned-bulk-softwood", 9500], ["Hardwood", "fully-seasoned-bulk-bag", 11000]],
      ["Part-Seasoned Pickup Loads", ["Part-seasoned softwood", "pickup-load", 12000]],
      ["Part-Seasoned Bulk Bags", ["Part-seasoned softwood", "bulk-bag-of-logs", 8000]],
    ],
  );
  assert.deepEqual(
    other.map((p) => p.id),
    ["seasoned-firewood", "kindling", "road-salt"],
  );
  assert.deepEqual(
    FIREWOOD_SECTIONS.flatMap((s) => s.groups.flatMap((g) => [...g.optionIds])),
    Object.keys(WOOD_OPTION_LABEL),
  );
  const hardwoodPart = sections
    .find((s) => s.id === "part-seasoned")!
    .groups.flatMap((g) => g.options)
    .filter((o) => /hardwood/i.test(o.label) || /hardwood/i.test(o.product.name));
  assert.deepEqual(hardwoodPart, []);
});

test("product copy no longer claims a pickup load equals 1.5 bulk bags", () => {
  const scan = (dir: string): string[] =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) return scan(rel);
      return /\.(tsx?|json|md)$/.test(e.name) ? [rel] : [];
    });
  const files = [...scan("app"), ...scan("components"), ...scan("config"), ...scan("lib"), "README.md", "db/seed.ts"];
  const bad: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    if (/1½|1\.5 bulk|approximately 1½|equivalent to approximately/i.test(text)) bad.push(f);
  }
  assert.deepEqual(bad, []);
});

test("migration 0010 sets the six wood options without deleting products or image files", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0010_wood_type_options.sql"), "utf8");
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE)\b/i.test(code));
  assert.match(sql, /'Fully Seasoned Pickup Load — Softwood'/);
  assert.match(sql, /'Fully Seasoned Pickup Load — Hardwood'/);
  assert.match(sql, /'Fully Seasoned Bulk Bag — Softwood'/);
  assert.match(sql, /'Fully Seasoned Bulk Bag — Hardwood'/);
  assert.match(sql, /'Part-Seasoned Pickup Load — Softwood'/);
  assert.match(sql, /'Part-Seasoned Bulk Bag — Softwood'/);
  assert.match(sql, /15000/);
  assert.match(sql, /16500/);
  assert.match(sql, /9500/);
  assert.match(sql, /11000/);
  assert.match(sql, /12000/);
  assert.match(sql, /8000/);
  assert.match(sql, /'fully-seasoned-pickup-hardwood'/);
  assert.match(sql, /'fully-seasoned-bulk-softwood'/);
  assert.match(sql, /WHERE "id" = 'pickup-load'/);
  assert.match(sql, /WHERE "id" = 'fully-seasoned-pickup-load'/);
  assert.match(sql, /WHERE "id" = 'fully-seasoned-bulk-bag'/);
  assert.match(sql, /WHERE "id" = 'bulk-bag-of-logs'/);
  assert.doesNotMatch(sql, /1½|1\.5/);
  assert.match(sql, /\/images\/pickup-load\.jpg/);
  assert.match(sql, /\/images\/bulk-bag-of-logs\.jpg/);
});

test("migration 0009 changes sort order only", () => {
  const sql = fs.readFileSync(path.join(ROOT, "db/migrations/0009_product_order.sql"), "utf8");
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(!/\b(DELETE|DROP|TRUNCATE|INSERT)\b/i.test(code));
  assert.doesNotMatch(code, /price_pence|name|short_description|image/i);
  assert.match(sql, /'fully-seasoned-pickup-load'/);
  assert.match(sql, /"sort_order" = 1/);
  assert.match(sql, /"id" = 'pickup-load'/);
  assert.match(sql, /"sort_order" = 2/);
  assert.match(sql, /'fully-seasoned-bulk-bag'/);
  assert.match(sql, /"sort_order" = 3/);
  assert.match(sql, /'bulk-bag-of-logs'/);
  assert.match(sql, /"sort_order" = 4/);
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
