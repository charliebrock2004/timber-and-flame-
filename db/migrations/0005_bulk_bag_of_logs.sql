-- Adds the Bulk Bag of Logs product — £80 per bag.
-- Safe on production: inserted only if it isn't there yet. Never overwrites
-- a price, name, photo or sort order the owner has since changed in /admin.

INSERT INTO "products" ("id", "name", "short_description", "unit_label", "size_label", "price_pence", "image", "visual", "accent", "active", "sort_order")
VALUES (
  'bulk-bag-of-logs',
  'Bulk Bag of Logs',
  'Stock up on quality firewood with our bulk bag of logs, ideal for keeping your wood burner, fireplace or fire pit supplied. A convenient option for homes looking for a reliable supply of firewood from Timber and Flame.',
  'per bag',
  NULL,
  8000,
  NULL,
  'firewood',
  'green',
  true,
  5
)
ON CONFLICT ("id") DO NOTHING;
