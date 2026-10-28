-- Display order only. Does not change names, prices, photos or descriptions.
UPDATE "products" SET "sort_order" = 1, "updated_at" = now() WHERE "id" = 'fully-seasoned-pickup-load';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 2, "updated_at" = now() WHERE "id" = 'pickup-load';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 3, "updated_at" = now() WHERE "id" = 'fully-seasoned-bulk-bag';
--> statement-breakpoint
UPDATE "products" SET "sort_order" = 4, "updated_at" = now() WHERE "id" = 'bulk-bag-of-logs';
