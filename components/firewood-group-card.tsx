"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductVisual } from "./product-visual";
import { QuantityStepper } from "./quantity-stepper";
import { CheckIcon, TruckIcon } from "./icons";
import { basket, useBasket } from "./cart/cart-store";
import { formatPenceShort } from "@/lib/money";
import { DELIVERY_COPY } from "@/config/business";
import type { FirewoodOption } from "@/lib/firewood-groups";

const STRIPE: Record<string, string> = {
  green: "bg-moss",
  orange: "bg-amber",
  blue: "bg-sky",
  red: "bg-ember-700",
};

/**
 * One firewood product (a pickup load, or a bulk bag) with a wood-type
 * selector. The selected option is what gets added to the basket — its own
 * product id, so checkout prices that exact option from the database.
 */
export function FirewoodGroupCard({
  name,
  options,
  priority = false,
  titleAs = "h3",
}: {
  name: string;
  options: FirewoodOption[];
  priority?: boolean;
  titleAs?: "h3" | "h4";
}) {
  const [selectedId, setSelectedId] = useState(options[0]?.product.id ?? "");
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const basketState = useBasket();
  const selected = options.find((o) => o.product.id === selectedId) ?? options[0];
  if (!selected) return null;

  const product = selected.product;
  const inBasket = basketState[product.id] ?? 0;
  const Title = titleAs;

  function choose(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setQty(1);
    setJustAdded(false);
  }

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
        <Title className="label text-ink text-[1.4rem] leading-tight font-semibold tracking-[0.04em]">{name}</Title>

        <div role="radiogroup" aria-label={`${name} wood type`} className={`mt-4 grid gap-2 ${options.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {options.map((option) => {
            const on = option.product.id === product.id;
            const price = formatPenceShort(option.product.pricePence);
            return (
              <button
                key={option.product.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(option.product.id)}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border-[1.5px] px-3 py-2 text-left ${
                  on ? "border-ember-700 bg-ember-700 text-white" : "border-cream-300 text-ink hover:bg-cream-100 bg-white"
                }`}
              >
                <span className="label text-base leading-tight font-semibold">{option.label}</span>
                <span className="label text-lg font-semibold">{price}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 flex items-baseline gap-2" aria-live="polite">
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
          <span className="sr-only"> {product.name}</span>
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
