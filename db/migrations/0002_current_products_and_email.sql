-- Current product line-up and prices (all prices include delivery within Crieff).
-- Runs once. After this, prices are managed in /admin/products.
INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES
  ('seasoned-firewood', 'Seasoned Firewood', 'Quality seasoned firewood supplied in convenient bags.', 'per bag', NULL, 1000, '/images/firewood-bags.jpg', 'firewood', 'green', true, 1),
  ('kindling', 'Netted Bag of Kindling', 'Dry kindling supplied in a 75cm × 45cm netted bag.', 'per bag', '75cm × 45cm', 700, NULL, 'kindling', 'orange', true, 2),
  ('road-salt', 'Road Salt', 'Road salt for helping keep paths, driveways and access areas safer during icy weather.', 'per bag', NULL, 500, NULL, 'salt', 'blue', true, 3)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "short_description" = EXCLUDED."short_description",
  "unit_label" = EXCLUDED."unit_label",
  "size_label" = EXCLUDED."size_label",
  "price_pence" = EXCLUDED."price_pence",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
--> statement-breakpoint
-- Exactly three products on sale: hide anything else (kept for order history).
UPDATE "products" SET "active" = false, "updated_at" = now()
WHERE "id" NOT IN ('seasoned-firewood', 'kindling', 'road-salt');
--> statement-breakpoint
UPDATE "site_settings" SET "contact_email" = 'timberflame84@gmail.com', "updated_at" = now()
WHERE "id" = 1 AND ("contact_email" IS NULL OR "contact_email" = '');
--> statement-breakpoint
UPDATE "delivery_zones" SET "description" = 'Delivery is included in our advertised prices within Crieff.', "updated_at" = now()
WHERE "id" = 'crieff';
--> statement-breakpoint
UPDATE "delivery_zones" SET "description" = 'Contact us if you''re outside Crieff and we''ll confirm the delivery cost.', "updated_at" = now()
WHERE "id" = 'outside-crieff';
