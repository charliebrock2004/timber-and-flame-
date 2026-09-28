import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { CheckoutError, createOrder, notifyOrderPlaced } from "@/lib/orders";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { db, schema } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { BRAND, DEFAULT_SETTINGS } from "@/config/business";

export const runtime = "nodejs";

/**
 * POST /api/checkout
 * Body: product IDs + quantities + customer details. NO prices.
 * The server prices everything from the database and returns where to go next:
 *   - card  → Stripe Checkout URL (order marked paid only by the webhook)
 *   - later → the order confirmation page
 */
export async function POST(req: Request) {
  const limit = rateLimit(`checkout:${clientIp(req.headers)}`, Number(process.env.CHECKOUT_RATE_LIMIT ?? 10), 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts — please wait a few minutes or give us a call." }, { status: 429 });

  // Same-origin check (defence in depth against cross-site form posts).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  const stripeAvailable = isStripeConfigured();

  try {
    const order = await createOrder(parsed.data, { stripeAvailable });

    if (order.paymentMethod === "PAY_LATER") {
      // The order is saved. Nothing after this point may report failure to the
      // customer — they'd retry and place a duplicate. An email problem is
      // recorded on the order (admin shows "Email not sent" + Resend).
      try {
        await notifyOrderPlaced(order.id);
      } catch (e) {
        console.error(`[checkout] order ${order.orderNumber} saved but notification step failed`, e);
      }
      return NextResponse.json({ redirectUrl: `/order/${order.accessToken}` });
    }

    // Card: build the Stripe session from the SERVER-side order lines.
    const base = siteUrl();
    const lineItems = order.items.map((i) => ({
      quantity: i.quantity,
      price_data: { currency: "gbp", unit_amount: i.unitPricePence, product_data: { name: i.productName } },
    }));
    if (order.deliveryChargePence && order.deliveryChargePence > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: order.deliveryChargePence,
          product_data: { name: `Delivery — ${order.deliveryZoneName}` },
        },
      });
    }

    const session = await getStripe()
      .checkout.sessions.create(
        {
          mode: "payment",
          line_items: lineItems,
          customer_email: order.email,
          client_reference_id: order.id,
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
          payment_intent_data: {
            metadata: { orderId: order.id, orderNumber: order.orderNumber },
            description: `${BRAND.shortName} order ${order.orderNumber}`,
          },
          success_url: `${base}/order/${order.accessToken}?from=stripe`,
          cancel_url: `${base}/basket?cancelled=1`,
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
        },
        { idempotencyKey: `order-${order.id}` },
      )
      .catch(async (e) => {
        // Don't leave a half-made order sitting as "awaiting payment".
        await db.update(schema.orders).set({ paymentStatus: "FAILED", status: "CANCELLED" }).where(eq(schema.orders.id, order.id));
        throw e;
      });

    await db.update(schema.orders).set({ stripeSessionId: session.id }).where(eq(schema.orders.id, order.id));
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ redirectUrl: session.url });
  } catch (e) {
    if (e instanceof CheckoutError) {
      return NextResponse.json({ error: e.message, fields: e.field ? { [e.field]: e.message } : undefined }, { status: 422 });
    }
    console.error("[checkout] failed — no order was saved", e);
    return NextResponse.json(
      {
        error: `Sorry — we can't take orders online right now, so nothing has been ordered. Please try again in a few minutes or call ${DEFAULT_SETTINGS.phoneDisplay}.`,
      },
      { status: 503 },
    );
  }
}
