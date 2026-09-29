"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { basket, useBasket, useBasketReady } from "../cart/cart-store";
import { CheckoutSteps } from "../cart/basket-view";
import { PhoneIcon } from "../icons";
import { draft, useDraft, type Draft } from "./draft-store";
import { checkDelivery, DeliveryResult } from "./delivery-result";
import { buildQuote, type ZoneRule } from "@/lib/delivery";
import { rules, type RuleField } from "@/lib/checkout-rules";
import { formatPence } from "@/lib/money";
import type { PublicProduct } from "@/lib/catalog";

type Props = {
  products: PublicProduct[];
  zones: ZoneRule[];
  payLaterEnabled: boolean;
  collectionEnabled: boolean;
  collectionInstructions: string | null;
  phoneDisplay: string;
  phoneE164: string;
};

type Step = 1 | 2 | 3;
const STEP_TITLES: Record<Step, string> = { 1: "Your details", 2: "Delivery details", 3: "Review your order" };
const STEP_OF_FIELD: Record<string, Step> = {
  customerName: 1,
  phone: 1,
  email: 1,
  postcode: 2,
  addressLine1: 2,
  addressLine2: 2,
  town: 2,
  notes: 2,
  fulfilment: 2,
};

export function CheckoutFlow(props: Props) {
  const router = useRouter();
  const items = useBasket();
  const ready = useBasketReady();
  const d = useDraft();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const productById = useMemo(() => new Map(props.products.map((p) => [p.id, p])), [props.products]);
  const lines = Object.entries(items)
    .filter(([id]) => productById.has(id))
    .map(([productId, quantity]) => ({ productId, quantity }));

  const delivery = d.fulfilment === "DELIVERY";
  const check = checkDelivery(d.postcode, props.zones);
  const deliveryCharge = !delivery
    ? 0
    : check.kind === "included" || check.kind === "charged" || check.kind === "tbc"
      ? check.zone.chargePence
      : 0;
  const quote = buildQuote(lines, props.products, deliveryCharge);
  const deliveryTbc = delivery && check.kind === "tbc";

  /* ───── validation ───── */
  const fieldsFor = useCallback(
    (s: Step): RuleField[] => {
      if (s === 1) return ["customerName", "phone", "email"];
      if (s === 2) return d.fulfilment === "DELIVERY" ? ["postcode", "addressLine1", "town"] : [];
      return [];
    },
    [d.fulfilment],
  );

  const errorFor = (f: string): string | null => {
    if (serverErrors[f]) return serverErrors[f];
    if (f in rules) return rules[f as RuleField](d[f as keyof Draft] as string);
    return null;
  };
  const stepErrors = (s: Step) => {
    const errs = fieldsFor(s).filter((f) => errorFor(f));
    if (s === 2 && delivery && check.kind === "none") errs.push("postcode");
    return errs;
  };

  /* ───── navigation (browser Back moves between steps) ───── */
  const goTo = useCallback((s: Step, push = true) => {
    setStep(s);
    if (push) window.history.pushState({ tfStep: s }, "", `/checkout?step=${s}`);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus());
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { tfStep?: Step } | null)?.tfStep ?? Number(new URLSearchParams(window.location.search).get("step")) ?? 1;
      setStep(([1, 2, 3].includes(s) ? s : 1) as Step);
    };
    window.history.replaceState({ ...(window.history.state ?? {}), tfStep: 1 }, "", "/checkout");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function next(from: Step) {
    const errs = stepErrors(from);
    if (errs.length) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(errs.map((f) => [f, true])) }));
      document.getElementById(`f-${errs[0]}`)?.focus();
      return;
    }
    goTo((from + 1) as Step);
  }

  function set(field: keyof Draft, value: string) {
    draft.update({ [field]: value } as Partial<Draft>);
    if (serverErrors[field]) setServerErrors((e) => ({ ...e, [field]: "" }));
    if (formError) setFormError(null);
  }

  /* ───── submit ───── */
  async function placeOrder() {
    for (const s of [1, 2] as Step[]) {
      if (stepErrors(s).length) {
        setTouched((t) => ({ ...t, ...Object.fromEntries(stepErrors(s).map((f) => [f, true])) }));
        goTo(s);
        return;
      }
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only product IDs + quantities + details. The server sets every price.
        body: JSON.stringify({ ...d, items: lines, paymentMethod: "PAY_LATER", website: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string; fields?: Record<string, string> };
      if (!res.ok || !data.redirectUrl) {
        setFormError(data.error ?? "Something went wrong. Please try again, or give us a call.");
        if (data.fields) {
          const fields = Object.fromEntries(Object.entries(data.fields).filter(([k]) => k in STEP_OF_FIELD));
          setServerErrors(fields);
          setTouched((t) => ({ ...t, ...Object.fromEntries(Object.keys(fields).map((k) => [k, true])) }));
          const first = Object.keys(fields)[0];
          if (first) goTo(STEP_OF_FIELD[first]);
          if (data.fields.items) setFormError(data.fields.items);
        }
        setSubmitting(false);
        return;
      }
      basket.clear();
      draft.clear();
      router.replace(data.redirectUrl);
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again, or give us a call.");
      setSubmitting(false);
    }
  }

  /* ───── render ───── */
  if (!ready) return <div className="container-site min-h-[50vh] py-16" aria-busy="true" />;
  if (lines.length === 0 && !submitting) {
    return (
      <div className="container-site py-16 text-center md:py-24">
        <h1 className="text-4xl font-bold">Your basket is empty</h1>
        <p className="text-ink-soft mt-3 text-lg">Add some firewood, kindling or road salt before checking out.</p>
        <Link href="/shop" className="btn btn-primary mt-8 px-10">
          Shop now
        </Link>
      </div>
    );
  }
  if (!props.payLaterEnabled) {
    return (
      <div className="container-site py-16 text-center">
        <h1 className="text-4xl font-bold">Online ordering is paused</h1>
        <p className="text-ink-soft mt-3 text-lg">Please give us a call to order.</p>
        <a href={`tel:${props.phoneE164}`} className="btn btn-primary mt-8 px-10">
          <PhoneIcon className="h-5 w-5" /> Call {props.phoneDisplay}
        </a>
      </div>
    );
  }

  const input = (
    field: RuleField | "addressLine2" | "notes",
    label: string,
    opts: {
      type?: string;
      autoComplete?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
      hint?: string;
      optional?: boolean;
      autoCapitalize?: string;
      className?: string;
    } = {},
  ) => {
    const err = touched[field] ? errorFor(field) : null;
    const id = `f-${field}`;
    return (
      <div className={opts.className}>
        <label htmlFor={id} className="field-label">
          {label} {opts.optional && <span className="text-ink-soft font-normal">(optional)</span>}
        </label>
        <input
          id={id}
          name={field}
          type={opts.type ?? "text"}
          autoComplete={opts.autoComplete}
          inputMode={opts.inputMode}
          autoCapitalize={opts.autoCapitalize}
          enterKeyHint="next"
          required={!opts.optional}
          value={d[field as keyof Draft] as string}
          onChange={(e) => set(field as keyof Draft, e.target.value)}
          onBlur={() => d[field as keyof Draft] && setTouched((t) => ({ ...t, [field]: true }))}
          aria-invalid={err ? true : undefined}
          aria-describedby={[err ? `${id}-err` : "", opts.hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined}
          className="field min-h-13 text-[1.0625rem]"
        />
        {opts.hint && !err && (
          <p id={`${id}-hint`} className="text-ink-soft mt-1 text-sm">
            {opts.hint}
          </p>
        )}
        {err && (
          <p id={`${id}-err`} className="field-error">
            {err}
          </p>
        )}
      </div>
    );
  };

  const summaryLines = (
    <ul className="divide-ink/10 divide-y">
      {quote.lines.map((l) => (
        <li key={l.productId} className="flex items-baseline justify-between gap-4 py-2">
          <span>
            <span className="font-semibold">{l.name}</span>
            <span className="text-ink-soft block text-sm">
              {l.quantity} × {formatPence(l.unitPricePence)}
            </span>
          </span>
          <span className="font-semibold whitespace-nowrap">{formatPence(l.lineTotalPence)}</span>
        </li>
      ))}
    </ul>
  );

  const deliveryValue = !delivery
    ? "Collection"
    : check.kind === "included"
      ? "Included"
      : check.kind === "charged"
        ? formatPence(check.zone.chargePence!)
        : check.kind === "tbc"
          ? "Small delivery charge may apply — we'll confirm this with you."
          : "Included in Crieff";

  const totals = (dark = false) => (
    <dl className={`space-y-1.5 ${dark ? "text-cream-200" : ""}`}>
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd>{formatPence(quote.subtotalPence)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="shrink-0">Delivery</dt>
        <dd className="text-right">{deliveryValue}</dd>
      </div>
      <div
        className={`flex items-baseline justify-between gap-4 border-t pt-2 ${dark ? "text-cream-50 border-white/15" : "border-ink/10"}`}
      >
        <dt className="label text-lg">Total</dt>
        <dd className="label text-right text-3xl font-semibold">
          {formatPence(quote.totalPence)}
          {deliveryTbc && <span className="block text-sm font-normal normal-case">+ delivery, to be confirmed</span>}
        </dd>
      </div>
    </dl>
  );

  return (
    <div className="container-site py-6 md:py-10">
      <CheckoutSteps current={step} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none md:text-4xl">
            {STEP_TITLES[step]}
          </h1>

          {/* Mobile order summary (collapsed) */}
          {step !== 3 && (
            <details className="bg-cream-50 ring-ink/5 mt-4 rounded-xl ring-1 lg:hidden">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 font-semibold">
                <span>Order summary ({lines.reduce((s, l) => s + l.quantity, 0)} items)</span>
                <span>{formatPence(quote.subtotalPence)}</span>
              </summary>
              <div className="border-ink/10 border-t px-4 pb-4">
                {summaryLines}
                <Link href="/basket" className="text-ember-700 mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline">
                  Change basket
                </Link>
              </div>
            </details>
          )}

          {formError && (
            <p role="alert" className="bg-ember-700 mt-4 rounded-lg p-4 font-semibold text-white">
              {formError}
            </p>
          )}

          {/* STEP 1 — customer */}
          {step === 1 && (
            <form
              noValidate
              className="bg-cream-50 shadow-card ring-ink/5 mt-5 space-y-4 rounded-xl p-5 ring-1 md:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                next(1);
              }}
            >
              <p className="text-ink-soft">So we can confirm your order and arrange delivery.</p>
              {input("customerName", "Full name", { autoComplete: "name", autoCapitalize: "words" })}
              {input("phone", "Phone number", {
                type: "tel",
                autoComplete: "tel",
                inputMode: "tel",
                hint: "We'll call or text to arrange delivery.",
              })}
              {input("email", "Email address", {
                type: "email",
                autoComplete: "email",
                inputMode: "email",
                hint: "We'll email your order confirmation here.",
              })}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </label>
              </div>
              <button type="submit" className="btn btn-primary min-h-14 w-full text-lg">
                Continue to delivery
              </button>
              <Link href="/basket" className="text-ember-700 flex min-h-11 items-center justify-center text-sm font-semibold underline">
                Back to basket
              </Link>
            </form>
          )}

          {/* STEP 2 — delivery */}
          {step === 2 && (
            <form
              noValidate
              className="bg-cream-50 shadow-card ring-ink/5 mt-5 space-y-4 rounded-xl p-5 ring-1 md:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                next(2);
              }}
            >
              {props.collectionEnabled && (
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="field-label">How would you like your order?</legend>
                  {(["DELIVERY", "COLLECTION"] as const).map((opt) => (
                    <label
                      key={opt}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 ${d.fulfilment === opt ? "border-ember-700 bg-white" : "border-cream-300"}`}
                    >
                      <input
                        type="radio"
                        name="fulfilment"
                        checked={d.fulfilment === opt}
                        onChange={() => draft.update({ fulfilment: opt })}
                        className="accent-ember-700 h-5 w-5"
                      />
                      <span className="font-semibold">{opt === "DELIVERY" ? "Deliver to me" : "I'll collect"}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              {delivery ? (
                <>
                  <div>
                    {input("postcode", "Postcode", {
                      autoComplete: "postal-code",
                      autoCapitalize: "characters",
                      hint: "We'll check whether you're in Crieff.",
                      className: "[&_input]:uppercase [&_input]:text-xl [&_input]:tracking-wider sm:max-w-xs",
                    })}
                    <div className="mt-3" aria-live="polite">
                      <DeliveryResult check={check} phoneDisplay={props.phoneDisplay} />
                    </div>
                  </div>
                  {input("addressLine1", "House number and street", { autoComplete: "address-line1" })}
                  {input("addressLine2", "Address line 2", { autoComplete: "address-line2", optional: true })}
                  {input("town", "Town or village", { autoComplete: "address-level2", autoCapitalize: "words" })}
                </>
              ) : (
                <p className="bg-cream-200/60 rounded-lg p-4 whitespace-pre-line">
                  {props.collectionInstructions ?? "We'll confirm collection details with you."}
                </p>
              )}
              <div>
                <label htmlFor="f-notes" className="field-label">
                  Delivery notes <span className="text-ink-soft font-normal">(optional)</span>
                </label>
                <textarea
                  id="f-notes"
                  name="notes"
                  rows={3}
                  maxLength={500}
                  value={d.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="e.g. where to leave your order, best time to call"
                  className="field text-[1.0625rem]"
                />
              </div>
              <button type="submit" className="btn btn-primary min-h-14 w-full text-lg">
                Review order
              </button>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="text-ember-700 flex min-h-11 w-full items-center justify-center text-sm font-semibold underline"
              >
                Back to your details
              </button>
            </form>
          )}

          {/* STEP 3 — review */}
          {step === 3 && (
            <div className="mt-5 space-y-4">
              <ReviewBlock title="Customer" onChange={() => goTo(1)}>
                <p className="font-semibold">{d.customerName}</p>
                <p>{d.phone}</p>
                <p className="break-all">{d.email}</p>
              </ReviewBlock>

              <ReviewBlock title={delivery ? "Delivery" : "Collection"} onChange={() => goTo(2)}>
                {delivery ? (
                  <>
                    <p>{d.addressLine1}</p>
                    {d.addressLine2 && <p>{d.addressLine2}</p>}
                    <p>{d.town}</p>
                    <p className="font-semibold">{check.kind !== "empty" && check.kind !== "invalid" ? check.postcode : d.postcode}</p>
                    <div className="mt-3">
                      <DeliveryResult check={check} phoneDisplay={props.phoneDisplay} compact />
                    </div>
                  </>
                ) : (
                  <p>{props.collectionInstructions ?? "We'll confirm collection details with you."}</p>
                )}
                {d.notes && <p className="text-ink-soft mt-2 text-sm whitespace-pre-line">Notes: {d.notes}</p>}
              </ReviewBlock>

              <section aria-labelledby="h-review-order" className="bg-char-900 text-cream-100 shadow-card rounded-xl p-5 md:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="h-review-order" className="label text-lg font-semibold">
                    Order
                  </h2>
                  <Link href="/basket" className="text-cream-200 inline-flex min-h-11 items-center text-sm font-semibold underline">
                    Change
                  </Link>
                </div>
                <ul className="mt-1 divide-y divide-white/10">
                  {quote.lines.map((l) => (
                    <li key={l.productId} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span>
                        <span className="text-cream-50 font-semibold">{l.name}</span>
                        <span className="text-cream-200/80 block">
                          {l.quantity} × {formatPence(l.unitPricePence)}
                        </span>
                      </span>
                      <span className="text-cream-50 font-semibold whitespace-nowrap">{formatPence(l.lineTotalPence)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-white/15 pt-3">{totals(true)}</div>
              </section>

              <p className="bg-cream-200/60 rounded-lg p-4">
                <strong>No payment is taken now.</strong> Timber &amp; Flame will contact you to arrange delivery and payment.
              </p>

              <button
                type="button"
                onClick={placeOrder}
                disabled={submitting || check.kind === "none"}
                aria-busy={submitting}
                className="btn btn-primary min-h-16 w-full text-xl"
              >
                {submitting ? "Placing your order…" : "Place order"}
              </button>
              <a
                href={`tel:${props.phoneE164}`}
                className="text-ink-soft flex min-h-11 items-center justify-center gap-2 text-sm hover:underline"
              >
                <PhoneIcon className="h-4 w-4" /> Questions? Call {props.phoneDisplay}
              </a>
            </div>
          )}
        </div>

        {/* Desktop order summary */}
        <aside
          aria-label="Order summary"
          className="bg-cream-50 shadow-card ring-ink/5 hidden rounded-xl p-6 ring-1 lg:sticky lg:top-28 lg:block"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="label text-xl font-semibold">Order summary</h2>
            <Link href="/basket" className="text-ember-700 text-sm font-semibold underline">
              Change
            </Link>
          </div>
          <div className="mt-2">{summaryLines}</div>
          <div className="border-ink/10 mt-2 border-t pt-3">{totals()}</div>
          <a href={`tel:${props.phoneE164}`} className="text-ink-soft mt-4 flex items-center justify-center gap-2 text-sm hover:underline">
            <PhoneIcon className="h-4 w-4" /> Need help? {props.phoneDisplay}
          </a>
        </aside>
      </div>
    </div>
  );
}

function ReviewBlock({ title, onChange, children }: { title: string; onChange: () => void; children: React.ReactNode }) {
  return (
    <section className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label text-ink-soft text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onChange}
          className="text-ember-700 inline-flex min-h-11 items-center px-1 text-sm font-semibold underline"
        >
          Change<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      <div className="mt-1 text-lg leading-relaxed">{children}</div>
    </section>
  );
}
