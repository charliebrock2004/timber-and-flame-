-- Installs the Pickup Load photo (/public/images/pickup-load.jpg).
-- Only if no photo is set yet, so an owner edit in /admin/products is kept.

UPDATE "products" SET "image" = '/images/pickup-load.jpg', "updated_at" = now()
WHERE "id" = 'pickup-load' AND ("image" IS NULL OR "image" = '');
