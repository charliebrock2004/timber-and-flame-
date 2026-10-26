-- Installs the Bulk Bag of Logs photo (/public/images/bulk-bag-of-logs.jpg).
-- Only if no photo is set yet, so an owner edit in /admin/products is kept.

UPDATE "products" SET "image" = '/images/bulk-bag-of-logs.jpg', "updated_at" = now()
WHERE "id" = 'bulk-bag-of-logs' AND ("image" IS NULL OR "image" = '');
