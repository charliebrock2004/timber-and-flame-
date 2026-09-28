/**
 * Timber & Flame — database schema (Drizzle ORM, Postgres).
 * Works with Neon / Vercel Postgres / Supabase / any Postgres 13+.
 *
 * Change this file, then run `npm run db:generate` to create a migration
 * and `npm run db:migrate` to apply it.
 */
import { relations } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const products = pgTable("products", {
  id: text("id").primaryKey(), // stable slug, e.g. "seasoned-firewood"
  name: text("name").notNull(),
  shortDescription: text("short_description").notNull(),
  unitLabel: text("unit_label").notNull().default("per bag"),
  sizeLabel: text("size_label"), // supplied spec, e.g. "75cm × 45cm"
  pricePence: integer("price_pence").notNull(),
  image: text("image"), // /public path or absolute URL; null = illustration
  visual: text("visual").notNull().default("firewood"),
  accent: text("accent").notNull().default("green"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const deliveryZones = pgTable("delivery_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  postcodePrefixes: text("postcode_prefixes").array().notNull().default([]), // empty = catch-all
  chargePence: integer("charge_pence"), // null = to be confirmed
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Single row (id = 1) of editable business settings. */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  phoneDisplay: text("phone_display").notNull(),
  phoneE164: text("phone_e164").notNull(),
  contactEmail: text("contact_email"),
  addressLine: text("address_line"),
  openingHours: text("opening_hours"),
  standLocation: text("stand_location"),
  payLaterEnabled: boolean("pay_later_enabled").notNull().default(true),
  collectionEnabled: boolean("collection_enabled").notNull().default(false),
  collectionInstructions: text("collection_instructions"),
  announcement: text("announcement"),
  ...timestamps,
});

export const orderStatus = pgEnum("order_status", ["PENDING", "PAID", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"]);
export const paymentStatus = pgEnum("payment_status", [
  "UNPAID", // legacy value; new orders use AWAITING_PAYMENT
  "AWAITING_PAYMENT", // order placed, payment to be arranged / not yet received
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
]);
export const paymentMethod = pgEnum("payment_method", ["CARD", "PAY_LATER"]);
export const fulfilment = pgEnum("fulfilment", ["DELIVERY", "COLLECTION"]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(), // random uuid
    orderNumber: text("order_number").notNull().unique(), // e.g. TF-4K7Q9M
    accessToken: text("access_token").notNull().unique(), // unguessable token for the customer's page
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    town: text("town"),
    postcode: text("postcode"),
    notes: text("notes"),
    fulfilment: fulfilment("fulfilment").notNull(),
    deliveryZoneId: text("delivery_zone_id"),
    deliveryZoneName: text("delivery_zone_name"),
    deliveryChargePence: integer("delivery_charge_pence"), // null = TBC
    subtotalPence: integer("subtotal_pence").notNull(),
    totalPence: integer("total_pence").notNull(), // subtotal + known delivery
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull(),
    status: orderStatus("status").notNull().default("PENDING"),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    ownerNotifiedAt: timestamp("owner_notified_at", { withTimezone: true }), // claim lock: notification attempted
    ownerEmailSentAt: timestamp("owner_email_sent_at", { withTimezone: true }), // business email actually delivered to provider
    customerEmailSentAt: timestamp("customer_email_sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("orders_created_idx").on(t.createdAt), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(), // snapshot at time of order
    unitPricePence: integer("unit_price_pence").notNull(), // snapshot at time of order
    quantity: integer("quantity").notNull(),
    lineTotalPence: integer("line_total_pence").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderWithItems = Order & { items: OrderItem[] };
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
