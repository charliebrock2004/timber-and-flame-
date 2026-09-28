import "server-only";
import Stripe from "stripe";

/**
 * Stripe is optional until the owner adds keys. Card payment is only
 * offered at checkout when STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are
 * both set — without the webhook we could never confirm a payment, and we
 * never mark an order paid on the strength of a browser redirect.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "Timber & Flame Firewood" } });
  return client;
}
