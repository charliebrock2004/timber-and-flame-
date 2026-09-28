import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { and, eq, ne } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { notifyOrderPlaced } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * Stripe → us. This is the ONLY place an order becomes PAID.
 * Configure in Stripe Dashboard → Developers → Webhooks:
 *   URL:    https://YOUR-DOMAIN/api/stripe/webhook
 *   Events: checkout.session.completed,
 *           checkout.session.async_payment_succeeded,
 *           checkout.session.async_payment_failed,
 *           checkout.session.expired
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  const raw = await req.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    console.warn("[stripe] bad signature", (e as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return NextResponse.json({ received: true });

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order || order.stripeSessionId !== session.id) {
    console.warn("[stripe] session/order mismatch", session.id, orderId);
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (session.payment_status !== "paid") break; // e.g. delayed methods — wait for async_payment_succeeded
      // Belt and braces: amount Stripe collected must equal what we priced.
      if (session.amount_total !== order.totalPence || session.currency !== "gbp") {
        console.error("[stripe] AMOUNT MISMATCH", { orderId, expected: order.totalPence, got: session.amount_total });
        break;
      }
      const updated = await db
        .update(schema.orders)
        .set({
          paymentStatus: "PAID",
          status: "PAID",
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        })
        .where(and(eq(schema.orders.id, orderId), ne(schema.orders.paymentStatus, "PAID")))
        .returning({ id: schema.orders.id });
      if (updated.length) await notifyOrderPlaced(orderId);
      break;
    }
    case "checkout.session.async_payment_failed":
      await db
        .update(schema.orders)
        .set({ paymentStatus: "FAILED" })
        .where(and(eq(schema.orders.id, orderId), ne(schema.orders.paymentStatus, "PAID")));
      break;
    case "checkout.session.expired":
      await db
        .update(schema.orders)
        .set({ paymentStatus: "EXPIRED", status: "CANCELLED" })
        .where(and(eq(schema.orders.id, orderId), eq(schema.orders.paymentStatus, "AWAITING_PAYMENT")));
      break;
  }
  return NextResponse.json({ received: true });
}
