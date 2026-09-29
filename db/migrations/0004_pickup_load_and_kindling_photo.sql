-- Adds the Pickup Load product and installs the real kindling photo.
-- Safe on production: it never resets anything, deletes nothing, and never
-- overwrites a value the owner has since changed in /admin/products.

-- 1. Pickup Load — £120 per load, delivered. Inserted only if it isn't there yet.
INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES (
  'pickup-load',
  'Pickup Load',
  'L200 pickup bed full of logs. Part seasoned. Equivalent to approximately 1½ bulk bags. This is a loose load, not bagged. The load is stacked when delivered.',
  'per load',
  NULL,
  12000,
  NULL,
  'firewood',
  'red',
  true,
  4
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- 2. Kindling photo (/public/images/kindling-bag.jpg) — only if no photo is set yet.
UPDATE "products" SET "image" = '/images/kindling-bag.jpg', "updated_at" = now()
WHERE "id" = 'kindling' AND ("image" IS NULL OR "image" = '');
--> statement-breakpoint
-- 3. Stale honesty-stand prices must never be the online price. Fix ONLY rows still
--    holding exactly the old figure (kindling £3, road salt £4); any other price is
--    a deliberate owner edit and is left alone.
UPDATE "products" SET "price_pence" = 700, "updated_at" = now() WHERE "id" = 'kindling' AND "price_pence" = 300;
--> statement-breakpoint
UPDATE "products" SET "price_pence" = 500, "updated_at" = now() WHERE "id" = 'road-salt' AND "price_pence" = 400;
