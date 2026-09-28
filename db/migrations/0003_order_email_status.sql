ALTER TABLE "orders" ADD COLUMN "owner_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_email_sent_at" timestamp with time zone;--> statement-breakpoint
-- Online payment isn't live yet: existing pay-later orders are "awaiting payment".
UPDATE "orders" SET "payment_status" = 'AWAITING_PAYMENT', "updated_at" = now()
WHERE "payment_method" = 'PAY_LATER' AND "payment_status" = 'UNPAID';
