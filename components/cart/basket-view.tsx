"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { basket, useBasket, useBasketReady } from "./cart-store";
import { QuantityStepper } from "../quantity-stepper";
import { ProductVisual } from "../product-visual";
import { PhoneIcon } from "../icons";
import { draft, useDraft } from "../checkout/draft-store";
import { checkDelivery, DeliveryResult } from "../checkout/delivery-result";
import { buildQuote, type ZoneRule } from "@/lib/delivery";
import { formatPence } from "@/lib/money";
import type { PublicProduct } from "@/lib/catalog";

type Props = {
  products: PublicProduct[];
  zones: ZoneRule[];
  phoneDisplay: string;
  phoneE164: string;
  cancelled: boolean;
};

/** Step 1 of ordering: review the basket, check the postcode, go to checkout. */
export function BasketView(props: Props) {
  const items = useBasket();
  const ready = useBasketReady();
  const d = useDraft();
  const productById = useMemo(() => new Map(props.products.map((p) => [p.id, p])), [props.products]);

  // Drop anything in the stored basket that's no longer on sale.
  const unavailable = Object.keys(items).filter((id) => !productById.has(id));
  useEffect(() => {
    unavailable.forEach((id) => basket.remove(id));
  }, [unavailable.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = Object.entries(items)
    .filter(([id]) => productById.has(id))
    .map(([productId, quantity]) => ({ productId, quantity }));
  const quote = buildQuote(lines, props.products, 0);
  const check = checkDelivery(d.postcode, props.zones);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  if (!ready) return <div className="container-site min-h-[50vh] py-16" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="container-site py-16 text-center md:py-24">
        <h1 className="text-4xl font-bold">Your basket is empty</h1>
        <p className="text-ink-soft mt-3 text-lg">Add some firewood, kindling or road salt to get started.</p>
        <Link href="/shop" className="btn btn-primary mt-8 px-10">
          Shop now
        </Link>
      </div>
    );
  }

  return (
    <div className="container-site pt-8 pb-32 md:py-12">
      <CheckoutSteps current={0} />
      <h1 className="mt-5 text-4xl font-bold md:text-5xl">Your basket</h1>
      <p className="text-ink-soft mt-2">Prices are per bag and include delivery within Crieff.</p>
      {props.cancelled && (
        <p role="status" className="bg-amber/15 mt-4 rounded-lg p-4 font-semibold">
          Payment was cancelled — nothing has been charged. Your basket is still here.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <section aria-label="Items in your basket" className="bg-cream-50 shadow-card ring-ink/5 rounded-xl ring-1">
          <ul className="divide-ink/10 divide-y">
            {quote.lines.map((l) => {
              const p = productById.get(l.productId)!;
              return (
                <li
                  key={l.productId}
                  className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 p-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center md:p-5"
                >
                  <div className="bg-wood-800 relative h-18 w-18 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                    <ProductVisual image={p.image} visual={p.visual} name={p.name} sizes="80px" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg leading-snug font-semibold">{p.name}</p>
                    {p.sizeLabel && <p className="text-ink-soft text-sm">{p.sizeLabel}</p>}
                    <p className="text-ink-soft text-sm">{formatPence(l.unitPricePence)} per bag · delivery included in Crieff</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                    <QuantityStepper value={l.quantity} onChange={(q) => basket.set(l.productId, q)} label={p.name} />
                    <div className="flex items-center gap-3">
                      <p className="label text-ink text-lg whitespace-nowrap" aria-live="polite">
                        {l.quantity} × {formatPence(l.unitPricePence)} = <strong>{formatPence(l.lineTotalPence)}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 -mt-1 flex justify-end sm:col-span-3">
                    <button
                      type="button"
                      onClick={() => basket.remove(l.productId)}
                      className="text-ember-700 hover:bg-ember-700/10 inline-flex min-h-11 items-center rounded px-3 text-sm font-semibold underline underline-offset-2"
                      aria-label={`Remove ${p.name} from basket`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-ink/10 border-t p-4 md:px-5">
            <Link href="/shop" className="text-ember-700 inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
              + Add more items
            </Link>
          </div>
        </section>

        <aside
          aria-labelledby="h-basket-summary"
          className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1 md:p-6 lg:sticky lg:top-28"
        >
          <h2 id="h-basket-summary" className="label text-xl font-semibold">
            Summary
          </h2>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between gap-4">
              <dt>
                Subtotal ({count} {count === 1 ? "bag" : "bags"})
              </dt>
              <dd className="font-semibold">{formatPence(quote.subtotalPence)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd className="text-right">
                {check.kind === "included" ? "Included" : check.kind === "tbc" ? "To be confirmed" : "Included in Crieff"}
              </dd>
            </div>
          </dl>

          <div className="border-ink/10 mt-4 border-t pt-4">
            <label htmlFor="basket-postcode" className="field-label">
              Check delivery to your postcode
            </label>
            <input
              id="basket-postcode"
              value={d.postcode}
              onChange={(e) => draft.update({ postcode: e.target.value })}
              autoComplete="postal-code"
              autoCapitalize="characters"
              placeholder="e.g. PH7 3AA"
              aria-invalid={check.kind === "invalid" ? true : undefined}
              aria-describedby="basket-postcode-hint"
              className="field uppercase"
            />
            <div id="basket-postcode-hint" className="mt-2" aria-live="polite">
              {check.kind === "invalid" && d.postcode.trim().length >= 5 ? (
                <p className="field-error">That doesn&apos;t look like a full UK postcode yet.</p>
              ) : (
                <DeliveryResult check={check} phoneDisplay={props.phoneDisplay} compact />
              )}
            </div>
          </div>

          <Link href="/checkout" className="btn btn-primary mt-5 hidden w-full text-lg lg:flex">
            Checkout
          </Link>
          <p className="text-ink-soft mt-3 text-center text-sm">No payment is taken online. We&apos;ll contact you to arrange it.</p>
          <a
            href={`tel:${props.phoneE164}`}
            className="text-ink-soft mt-2 flex min-h-11 items-center justify-center gap-2 text-sm hover:underline"
          >
            <PhoneIcon className="h-4 w-4" /> Rather order by phone? {props.phoneDisplay}
          </a>
        </aside>
      </div>

      {/* Mobile: checkout always under the thumb */}
      <div className="bg-char-900/97 fixed inset-x-0 bottom-0 z-40 border-t border-black/20 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,.25)] lg:hidden">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <a href={`tel:${props.phoneE164}`} className="btn btn-outline-light min-h-13 px-4" aria-label={`Call ${props.phoneDisplay}`}>
            <PhoneIcon className="h-5 w-5" />
          </a>
          <Link href="/checkout" className="btn btn-primary min-h-13 text-lg">
            Checkout · {formatPence(quote.subtotalPence)}
          </Link>
        </div>
      </div>
    </div>
  );
}

const STEPS = ["Basket", "Your details", "Delivery", "Review"];

/** Progress indicator shared by the basket and checkout steps. */
export function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm" aria-label="Checkout progress">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={active ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${done || active ? "bg-ember-700" : "bg-cream-300"}`} aria-hidden />
            <span className={`label truncate ${active ? "text-ink font-semibold" : "text-ink-soft"}`}>
              <span className="sr-only">{done ? "Completed: " : active ? "Current step: " : ""}</span>
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
