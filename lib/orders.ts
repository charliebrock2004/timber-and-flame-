import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { buildQuote, findZone, normalisePostcode } from "./delivery";
import type { CheckoutInput } from "./validation";
import type { OrderWithItems } from "@/db/schema";
import { sendCustomerConfirmation, sendOwnerNotification } from "./email";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

// No 0/O/1/I/L — easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newOrderNumber(): string {
  return "TF-" + Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function getOrderWithItems(where: { id: string } | { accessToken: string }): Promise<OrderWithItems | null> {
  const cond = "id" in where ? eq(schema.orders.id, where.id) : eq(schema.orders.accessToken, where.accessToken);
  const order = await db.query.orders.findFirst({ where: cond, with: { items: true } });
  return order ?? null;
}

/**
 * Creates an order from validated input. Prices, products and the delivery
 * charge are all read fresh from the database here — the browser only tells
 * us WHICH products and HOW MANY. Nothing it sends about money is used.
 */
export async function createOrder(input: CheckoutInput, opts: { stripeAvailable: boolean }): Promise<OrderWithItems> {
  const ids = input.items.map((i) => i.productId);
  const [[settings], products, zones] = await Promise.all([
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
    db
      .select()
      .from(schema.products)
      .where(and(inArray(schema.products.id, ids), eq(schema.products.active, true))),
    db.select().from(schema.deliveryZones),
  ]);
  if (!settings) throw new Error("Site settings missing — run `npm run db:seed`");

  if (products.length !== input.items.length) {
    throw new CheckoutError("One of the items in your basket is no longer available. Please review your basket.", "items");
  }

  // Fulfilment + delivery charge — decided on the server.
  let deliveryZoneId: string | null = null;
  let deliveryZoneName: string | null = null;
  let deliveryChargePence: number | null = 0;
  let postcode: string | null = null;

  if (input.fulfilment === "COLLECTION") {
    if (!settings.collectionEnabled) throw new CheckoutError("Collection isn't available at the moment.", "fulfilment");
  } else {
    postcode = normalisePostcode(input.postcode);
    if (!postcode) throw new CheckoutError("Please enter a valid UK postcode", "postcode");
    const zone = findZone(postcode, zones);
    if (!zone) throw new CheckoutError("Sorry, we don't currently deliver to that postcode — please give us a call.", "postcode");
    deliveryZoneId = zone.id;
    deliveryZoneName = zone.name;
    deliveryChargePence = zone.chargePence;
  }

  // Payment rules.
  if (input.paymentMethod === "CARD") {
    if (!opts.stripeAvailable) throw new CheckoutError("Card payment isn't available yet.", "paymentMethod");
    if (deliveryChargePence === null)
      throw new CheckoutError(
        "We need to confirm the delivery charge for your area first, so card payment isn't available for this order. Please choose ‘Order now, pay later’.",
        "paymentMethod",
      );
  } else if (!settings.payLaterEnabled) {
    throw new CheckoutError("Online ordering is paused at the moment — please give us a call to order.", "form");
  }

  const quote = buildQuote(input.items, products, deliveryChargePence);
  if (quote.subtotalPence <= 0) throw new CheckoutError("Your basket is empty", "items");

  const isDelivery = input.fulfilment === "DELIVERY";
  const orderId = randomUUID();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(schema.orders).values({
          id: orderId,
          orderNumber: newOrderNumber(),
          accessToken: randomBytes(24).toString("base64url"),
          customerName: input.customerName,
          phone: input.phone,
          email: input.email.toLowerCase(),
          addressLine1: isDelivery ? input.addressLine1 : null,
          addressLine2: isDelivery ? input.addressLine2 || null : null,
          town: isDelivery ? input.town : null,
          postcode,
          notes: input.notes || null,
          fulfilment: input.fulfilment,
          deliveryZoneId,
          deliveryZoneName,
          deliveryChargePence,
          subtotalPence: quote.subtotalPence,
          totalPence: quote.totalPence,
          paymentMethod: input.paymentMethod,
          // Online payment isn't live: every order starts as awaiting payment.
          paymentStatus: "AWAITING_PAYMENT",
          status: "PENDING",
        });
        await tx.insert(schema.orderItems).values(
          quote.lines.map((l) => ({
            id: randomUUID(),
            orderId,
            productId: l.productId,
            productName: l.name,
            unitPricePence: l.unitPricePence,
            quantity: l.quantity,
            lineTotalPence: l.lineTotalPence,
          })),
        );
      });
      return (await getOrderWithItems({ id: orderId }))!;
    } catch (e) {
      // 23505 = unique violation → order-number collision (astronomically rare); retry.
      if ((e as { cause?: { code?: string } }).cause?.code === "23505" || (e as { code?: string }).code === "23505") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate an order number");
}

/**
 * Emails Timber & Flame and the customer — once per order. The conditional
 * update is a lock, so a retried request can't double-send. Whether each
 * email actually went out is recorded, so /admin can flag a failure and
 * the owner can resend it. An email failure never loses the order.
 */
export async function notifyOrderPlaced(orderId: string): Promise<{ owner: boolean; customer: boolean } | null> {
  const claimed = await db
    .update(schema.orders)
    .set({ ownerNotifiedAt: new Date() })
    .where(and(eq(schema.orders.id, orderId), isNull(schema.orders.ownerNotifiedAt)))
    .returning({ id: schema.orders.id });
  if (claimed.length === 0) return null;
  const [order, [settings]] = await Promise.all([
    getOrderWithItems({ id: orderId }),
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
  ]);
  if (!order) return null;
  const businessEmail = settings?.contactEmail ?? null;
  const [owner, customer] = await Promise.all([
    sendOwnerNotification(order, businessEmail),
    sendCustomerConfirmation(order, settings?.phoneDisplay ?? "", businessEmail),
  ]);
  const now = new Date();
  if (owner || customer) {
    await db
      .update(schema.orders)
      .set({ ...(owner ? { ownerEmailSentAt: now } : {}), ...(customer ? { customerEmailSentAt: now } : {}) })
      .where(eq(schema.orders.id, orderId));
  }
  return { owner, customer };
}

/** Admin "resend" — sends the business notification again (e.g. after fixing email settings). */
export async function resendOwnerNotification(orderId: string): Promise<boolean> {
  const [order, [settings]] = await Promise.all([
    getOrderWithItems({ id: orderId }),
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
  ]);
  if (!order) return false;
  const ok = await sendOwnerNotification(order, settings?.contactEmail ?? null);
  if (ok) await db.update(schema.orders).set({ ownerEmailSentAt: new Date() }).where(eq(schema.orders.id, orderId));
  return ok;
}

/** Statuses the owner moves an order through (PAID is only set by an online payment). */
export const WORKFLOW_STATUSES = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as const;

export const STATUS_LABELS = {
  PENDING: "New",
  PAID: "Paid",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const PAYMENT_LABELS = {
  UNPAID: "Awaiting payment",
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  FAILED: "Payment failed",
  EXPIRED: "Checkout expired",
  REFUNDED: "Refunded",
} as const;
