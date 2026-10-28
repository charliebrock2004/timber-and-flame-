-- Part-seasoned and fully seasoned pickup loads and bulk bags.
-- Keeps the existing product ids (pickup-load, bulk-bag-of-logs) so baskets
-- and past orders still resolve. New options are separate products.
-- Photos are the existing files; this does not replace any image asset.
-- Idempotent: safe to run again. No deletes.

UPDATE "products" SET
  "name" = 'Part Seasoned Pickup Load',
  "short_description" = 'L200 pickup bed full of logs. Part seasoned. Equivalent to approximately 1½ bulk bags. This is a loose load, not bagged. The load is stacked when delivered.',
  "unit_label" = 'per load',
  "price_pence" = 12000,
  "sort_order" = 1,
  "active" = true,
  "updated_at" = now()
WHERE "id" = 'pickup-load';
--> statement-breakpoint
UPDATE "products" SET
  "name" = 'Part Seasoned Bulk Bag',
  "short_description" = 'Stock up on part-seasoned firewood with our bulk bag of logs, ideal for keeping your wood burner, fireplace or fire pit supplied. A convenient option for homes looking for a reliable supply of firewood from Timber and Flame.',
  "unit_label" = 'per bag',
  "price_pence" = 8000,
  "sort_order" = 3,
  "active" = true,
  "updated_at" = now()
WHERE "id" = 'bulk-bag-of-logs';
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES (
  'fully-seasoned-pickup-load',
  'Fully Seasoned Pickup Load',
  'L200 pickup bed full of logs. Fully seasoned. Equivalent to approximately 1½ bulk bags. This is a loose load, not bagged. The load is stacked when delivered.',
  'per load',
  NULL,
  16000,
  '/images/pickup-load.jpg',
  'firewood',
  'red',
  true,
  2
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "short_description" = EXCLUDED."short_description",
  "unit_label" = EXCLUDED."unit_label",
  "price_pence" = EXCLUDED."price_pence",
  "image" = EXCLUDED."image",
  "visual" = EXCLUDED."visual",
  "accent" = EXCLUDED."accent",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES (
  'fully-seasoned-bulk-bag',
  'Fully Seasoned Bulk Bag',
  'Stock up on fully seasoned firewood with our bulk bag of logs, ideal for keeping your wood burner, fireplace or fire pit supplied. A convenient option for homes looking for a reliable supply of firewood from Timber and Flame.',
  'per bag',
  NULL,
  11000,
  '/images/bulk-bag-of-logs.jpg',
  'firewood',
  'green',
  true,
  4
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "short_description" = EXCLUDED."short_description",
  "unit_label" = EXCLUDED."unit_label",
  "price_pence" = EXCLUDED."price_pence",
  "image" = EXCLUDED."image",
  "visual" = EXCLUDED."visual",
  "accent" = EXCLUDED."accent",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 5, "updated_at" = now() WHERE "id" = 'seasoned-firewood';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 6, "updated_at" = now() WHERE "id" = 'kindling';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 7, "updated_at" = now() WHERE "id" = 'road-salt';
