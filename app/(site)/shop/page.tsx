import type { Metadata } from "next";
import { openGraphFor } from "@/lib/seo";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Eyebrow } from "@/components/sections";
import { TruckIcon } from "@/components/icons";
import { getActiveProducts, getSettings } from "@/lib/catalog";
import { DELIVERY_COPY } from "@/config/business";

export const revalidate = 3600;

const TITLE = "Buy Firewood, Kindling & Road Salt in Crieff";
const DESCRIPTION =
  "Order seasoned firewood, netted bags of kindling and road salt from Timber & Flame in Crieff, Perthshire. Clear prices with delivery in Crieff included.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/shop" },
  openGraph: openGraphFor("/shop", `${TITLE} | Timber & Flame Firewood`, DESCRIPTION),
};

export default async function ShopPage() {
  const [products, settings] = await Promise.all([getActiveProducts(), getSettings()]);
  return (
    <>
      <section className="slats text-cream-100">
        <div className="container-site py-10 md:py-14">
          <Eyebrow tone="light">Shop</Eyebrow>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Firewood, kindling &amp; road salt</h1>
          <p className="text-cream-200/85 mt-3 max-w-2xl text-lg">
            Every price includes delivery within Crieff. Choose how many you need and add them to your basket — you&apos;ll see your total
            before you order.
          </p>
        </div>
      </section>

      <div className="border-ink/10 bg-cream-50 border-b">
        <p className="container-site flex items-center gap-2 py-3 text-sm font-semibold">
          <TruckIcon className="text-ember-700 h-5 w-5 shrink-0" />
          <span>
            {DELIVERY_COPY.headline}. <span className="text-ink-soft font-normal">{DELIVERY_COPY.outside}</span>{" "}
            <Link href="/delivery" className="text-ember-700 underline underline-offset-2">
              Delivery info
            </Link>
          </span>
        </p>
      </div>

      <section aria-label="Products" className="container-site py-10 md:py-14">
        {products.length === 0 ? (
          <p className="bg-cream-50 rounded-lg p-6 text-lg">
            Nothing is available to order online right now. Please call{" "}
            <a className="text-ember-700 font-semibold underline" href={`tel:${settings.phoneE164}`}>
              {settings.phoneDisplay}
            </a>
            .
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <div key={p.id} id={p.id} className="scroll-mt-28">
                <ProductCard product={p} priority={i === 0} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link href="/basket" className="btn btn-primary px-10">
            Go to basket
          </Link>
          <p className="text-ink-soft">
            Need a larger amount or have a question? Call{" "}
            <a className="text-ember-700 font-semibold underline underline-offset-2" href={`tel:${settings.phoneE164}`}>
              {settings.phoneDisplay}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
