"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductVisual } from "./product-visual";
import { QuantityStepper } from "./quantity-stepper";
import { CheckIcon, TruckIcon } from "./icons";
import { basket, useBasket } from "./cart/cart-store";
import { formatPenceShort } from "@/lib/money";
import { DELIVERY_COPY } from "@/config/business";
import type { PublicProduct } from "@/lib/catalog";

const STRIPE: Record<string, string> = {
  green: "bg-moss",
  orange: "bg-amber",
  blue: "bg-sky",
  red: "bg-ember-700",
};

/**
 * Styled after the stand's price board: coloured stripe, condensed caps,
 * big price. Quantity + add are right on the card so ordering is 1–2 taps.
 */
export function ProductCard({ product, priority = false }: { product: PublicProduct; priority?: boolean }) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const inBasket = useBasket()[product.id] ?? 0;

  function add() {
    basket.add(product.id, qty);
    setJustAdded(true);
    setQty(1);
    window.setTimeout(() => setJustAdded(false), 2200);
  }

  return (
    <article className="group bg-cream-50 shadow-card ring-ink/5 flex flex-col overflow-hidden rounded-xl ring-1">
      <div className="bg-wood-800 relative aspect-[4/3] overflow-hidden">
        <ProductVisual image={product.image} visual={product.visual} name={product.name} priority={priority} />
      </div>
      <div className="relative flex flex-1 flex-col p-5 pl-7">
        <span className={`absolute inset-y-5 left-0 w-1.5 rounded-r ${STRIPE[product.accent] ?? "bg-ember-700"}`} aria-hidden />
        <h3 className="label text-ink text-[1.4rem] leading-tight font-semibold tracking-[0.04em]">{product.name}</h3>
        {product.sizeLabel && (
          <p className="label text-ink-soft mt-1 text-base">
            <span className="sr-only">Bag size: </span>
            {product.sizeLabel}
          </p>
        )}

        {/* Price — per bag, clearly; delivery included in Crieff */}
        <p className="mt-3 flex items-baseline gap-2">
          <span className="label text-ink text-5xl leading-none font-semibold">{formatPenceShort(product.pricePence)}</span>
          <span className="label text-ink text-xl font-semibold">{product.unitLabel}</span>
        </p>
        <p className="text-moss mt-2 flex items-center gap-2 font-semibold">
          <TruckIcon className="h-5 w-5 shrink-0" /> {DELIVERY_COPY.short}
        </p>
        <p className="text-ink-soft text-sm">{DELIVERY_COPY.outside}</p>

        <p className="text-ink-soft mt-3 flex-1">{product.shortDescription}</p>

        <div className="border-ink/10 mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <QuantityStepper value={qty} onChange={setQty} label={product.name} />
          <p className="label text-ink text-lg" aria-live="polite">
            {qty} × {formatPenceShort(product.pricePence)} = <strong>{formatPenceShort(product.pricePence * qty)}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="btn btn-primary mt-3 w-full text-lg whitespace-nowrap"
          aria-describedby={`status-${product.id}`}
        >
          {justAdded ? (
            <>
              <CheckIcon className="h-5 w-5" /> Added to basket
            </>
          ) : (
            "Add to basket"
          )}
        </button>
        <p id={`status-${product.id}`} className="text-ink-soft mt-3 min-h-6 text-sm" aria-live="polite">
          {inBasket > 0 && (
            <>
              <span className="text-moss font-semibold">{inBasket} in your basket</span> ·{" "}
              <Link href="/basket" className="text-ember-700 font-semibold underline underline-offset-2">
                View basket
              </Link>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
