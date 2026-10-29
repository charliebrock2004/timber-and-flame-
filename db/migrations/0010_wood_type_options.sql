-- Softwood and hardwood options for fully seasoned loads and bags,
-- and explicit part-seasoned softwood labels. Drops the old pickup-load
-- quantity comparison. No deletes. Photos are unchanged on existing rows.
-- Idempotent: safe to run on every production build, after 0008, which
-- would otherwise put the previous names and prices back.
-- Existing ids stay so past orders and baskets still resolve:
--   fully-seasoned-pickup-load  → fully seasoned pickup, softwood, £150
--   fully-seasoned-bulk-bag     → fully seasoned bulk bag, hardwood, £110

UPDATE "products" SET
  "name" = 'Fully Seasoned Pickup Load — Softwood',
  "short_description" = 'L200 pickup bed full of fully seasoned softwood logs. This is a loose load, not bagged. The load is stacked when delivered.',
  "unit_label" = 'per load',
  "price_pence" = 15000,
  "sort_order" = 1,
  "active" = true,
  "updated_at" = now()
WHERE "id" = 'fully-seasoned-pickup-load';
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES (
  'fully-seasoned-pickup-hardwood',
  'Fully Seasoned Pickup Load — Hardwood',
  'L200 pickup bed full of fully seasoned hardwood logs. This is a loose load, not bagged. The load is stacked when delivered.',
  'per load',
  NULL,
  16500,
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
  "visual" = EXCLUDED."visual",
  "accent" = EXCLUDED."accent",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES (
  'fully-seasoned-bulk-softwood',
  'Fully Seasoned Bulk Bag — Softwood',
  'Fully seasoned softwood logs supplied in a bulk bag, for a wood burner, fireplace or fire pit.',
  'per bag',
  NULL,
  9500,
  '/images/bulk-bag-of-logs.jpg',
  'firewood',
  'green',
  true,
  3
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "short_description" = EXCLUDED."short_description",
  "unit_label" = EXCLUDED."unit_label",
  "price_pence" = EXCLUDED."price_pence",
  "visual" = EXCLUDED."visual",
  "accent" = EXCLUDED."accent",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "products" SET
  "name" = 'Fully Seasoned Bulk Bag — Hardwood',
  "short_description" = 'Fully seasoned hardwood logs supplied in a bulk bag, for a wood burner, fireplace or fire pit.',
  "unit_label" = 'per bag',
  "price_pence" = 11000,
  "sort_order" = 4,
  "active" = true,
  "updated_at" = now()
WHERE "id" = 'fully-seasoned-bulk-bag';
--> statement-breakpoint
UPDATE "products" SET
  "name" = 'Part-Seasoned Pickup Load — Softwood',
  "short_description" = 'L200 pickup bed full of part-seasoned softwood logs. This is a loose load, not bagged. The load is stacked when delivered.',
  "unit_label" = 'per load',
  "price_pence" = 12000,
  "sort_order" = 5,
  "active" = true,
  "updated_at" = now()
WHERE "id" = 'pickup-load';
--> statement-breakpoint
UPDATE "products" SET
  "name" = 'Part-Seasoned Bulk Bag — Softwood',
  "short_description" = 'Part-seasoned softwood logs supplied in a bulk bag, for a wood burner, fireplace or fire pit.',
  "unit_label" = 'per bag',
  "price_pence" = 8000,
  "sort_order" = 6,
  "active" = true,
  "updated_at" = now()
WHERE "id" = 'bulk-bag-of-logs';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 7, "updated_at" = now() WHERE "id" = 'seasoned-firewood';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 8, "updated_at" = now() WHERE "id" = 'kindling';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 9, "updated_at" = now() WHERE "id" = 'road-salt';
