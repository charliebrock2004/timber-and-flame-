import type { Metadata } from "next";
import { openGraphFor } from "@/lib/seo";
import Link from "next/link";
import { DeliveryCards, Eyebrow, FinalCta } from "@/components/sections";
import { getDeliveryZones, getSettings } from "@/lib/catalog";
import { DELIVERY_COPY } from "@/config/business";
import { PhoneIcon } from "@/components/icons";

export const revalidate = 3600;

const TITLE = "Firewood & Kindling Delivery in Crieff";
const DESCRIPTION =
  "Local firewood, kindling and road salt delivery from Timber & Flame. Delivery is included in our prices within Crieff; a small charge may apply elsewhere in Perthshire.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/delivery" },
  openGraph: openGraphFor("/delivery", `${TITLE} | Timber & Flame Firewood`, DESCRIPTION),
};

export default async function DeliveryPage() {
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  const outsideTbc = zones.some((z) => z.enabled && z.chargePence === null);

  return (
    <>
      <section className="slats text-cream-100">
        <div className="container-site py-10 md:py-14">
          <Eyebrow tone="light">Delivery</Eyebrow>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Local delivery from Timber &amp; Flame</h1>
          <div className="text-cream-200/90 mt-4 max-w-2xl space-y-2 text-lg">
            <p>We supply firewood, kindling and road salt in Crieff and surrounding areas.</p>
            <p>
              <strong className="text-white">Delivery is included in our advertised prices within Crieff.</strong>
            </p>
            <p>For deliveries outside Crieff, a small delivery charge may apply.</p>
            <p>{DELIVERY_COPY.outsideContact}</p>
          </div>
        </div>
      </section>

      <section className="container-site py-12 md:py-16">
        <DeliveryCards zones={zones} />

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">How it works</h2>
            <ol className="mt-5 space-y-4">
              {[
                ["Choose your bags", "Add firewood, kindling or road salt to your basket."],
                ["Enter your address", "Your postcode tells us which delivery option applies — you'll see it before you order."],
                ["Place your order", "You'll get an order number straight away."],
                ["We get in touch", "Timber & Flame will contact you to arrange your delivery."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="label bg-ember-700 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-white">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="block">{t}</strong>
                    <span className="text-ink-soft">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-cream-50 ring-ink/10 rounded-xl p-6 ring-1">
            <h2 className="text-2xl font-bold">Outside Crieff?</h2>
            <p className="text-ink-soft mt-3">
              {DELIVERY_COPY.outside}
              {outsideTbc
                ? " You can still place your order online — we'll confirm the delivery cost with you before anything is delivered."
                : " The charge is shown in your basket once you enter your postcode."}
            </p>
            <p className="text-ink-soft mt-3">{DELIVERY_COPY.outsideContact}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">
                Order now
              </Link>
              <a href={`tel:${settings.phoneE164}`} className="btn btn-outline">
                <PhoneIcon className="h-5 w-5" /> Call {settings.phoneDisplay}
              </a>
              {settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent("Delivery outside Crieff")}`}
                  className="btn btn-outline"
                >
                  Email us
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <FinalCta phoneDisplay={settings.phoneDisplay} phoneE164={settings.phoneE164} />
    </>
  );
}
