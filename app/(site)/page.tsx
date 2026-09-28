import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { openGraphFor } from "@/lib/seo";
import standWide from "@/public/images/stand-wide.jpg";
import { Logo } from "@/components/logo";
import { ProductCard } from "@/components/product-card";
import { DeliveryCards, Eyebrow, FinalCta, HonestyStandSection } from "@/components/sections";
import { FlameIcon, PhoneIcon, PinIcon, TagIcon, TruckIcon } from "@/components/icons";
import { getActiveProducts, getDeliveryZones, getSettings } from "@/lib/catalog";
import { BRAND, DELIVERY_COPY } from "@/config/business";
import { formatPenceShort } from "@/lib/money";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Firewood, Kindling & Road Salt Delivered in Crieff | Timber & Flame Firewood";
  let description: string;
  try {
    const [products, settings] = await Promise.all([getActiveProducts(), getSettings()]);
    const prices = products.map((p) => `${p.name.toLowerCase()} ${formatPenceShort(p.pricePence)}`).join(", ");
    description = `Local firewood and logs supplier in Crieff, Perthshire: ${prices} a bag — delivered in Crieff. Order online or call ${settings.phoneDisplay}.`;
  } catch {
    // Never put prices in the description unless they came from the database.
    description = "Local firewood, logs, kindling and road salt supplier in Crieff, Perthshire, with delivery included in Crieff.";
  }
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: openGraphFor("/", title, description),
  };
}

const WHY = [
  { icon: PinIcon, title: "Local", body: "Based in Crieff and supplying Crieff and the surrounding area." },
  { icon: TagIcon, title: "Honest prices", body: "Clear per-bag prices, shown up front, with delivery in Crieff included." },
  { icon: TruckIcon, title: "Convenient delivery", body: "Delivered to your door in Crieff. Surrounding areas too." },
  { icon: FlameIcon, title: "Quality firewood", body: "Quality seasoned firewood supplied in convenient bags." },
];

export default async function HomePage() {
  const [products, zones, settings] = await Promise.all([getActiveProducts(), getDeliveryZones(), getSettings()]);

  return (
    <>
      {/* HERO */}
      <section className="slats text-cream-100 relative overflow-hidden">
        <div className="container-site grid items-center gap-10 py-7 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="text-center lg:text-left">
            <h1 className="mx-auto max-w-[15rem] sm:max-w-xs md:max-w-md lg:mx-0">
              <Logo tone="light" priority className="h-auto w-full" sizes="(min-width: 768px) 448px, 320px" />
            </h1>
            <p className="label text-ember-200 mt-4 text-base md:mt-6 md:text-xl">{BRAND.tagline}</p>
            <p className="text-cream-200/90 mx-auto mt-2 max-w-lg text-base md:mt-3 md:text-xl lg:mx-0">
              Quality firewood, kindling and road salt supplied in {BRAND.serviceAreaSummary}.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center md:mt-7 lg:justify-start">
              <Link href="/shop" className="btn btn-primary px-8 text-lg">
                Shop now
              </Link>
              <a href={`tel:${settings.phoneE164}`} className="btn btn-outline-light px-6 text-lg">
                <PhoneIcon className="h-5 w-5" /> Call {settings.phoneDisplay}
              </a>
            </div>
            <ul className="label text-cream-200/80 mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm md:mt-7 lg:justify-start">
              <li className="flex items-center gap-2">
                <TruckIcon className="text-ember-400 h-4 w-4" /> {DELIVERY_COPY.short}
              </li>
              <li className="flex items-center gap-2">
                <TagIcon className="text-ember-400 h-4 w-4" /> Honest prices
              </li>
              <li className="flex items-center gap-2">
                <PinIcon className="text-ember-400 h-4 w-4" /> Crieff, Perthshire
              </li>
            </ul>
          </div>
          <figure className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] ring-1 ring-white/10">
              <Image
                src={standWide}
                alt="Bags of firewood stacked in the Timber & Flame honesty stand"
                sizes="(min-width: 1024px) 560px, 0px"
                className="h-[26rem] w-full object-cover object-[50%_22%]"
                placeholder="blur"
                priority
              />
            </div>
            <figcaption className="label bg-cream-100 text-ink absolute -bottom-4 left-6 rounded px-3 py-1.5 text-sm shadow-lg">
              Our stand, Crieff
            </figcaption>
          </figure>
        </div>
      </section>

      {/* DELIVERY STRIP — the headline promise */}
      <div className="bg-ember-700 text-white">
        <p className="container-site flex flex-col items-center justify-center gap-x-3 gap-y-0.5 py-3 text-center sm:flex-row">
          <span className="label flex items-center gap-2 text-lg font-semibold tracking-wider">
            <TruckIcon className="h-5 w-5" /> {DELIVERY_COPY.headline}
          </span>
          <span className="text-ember-200 text-sm">{DELIVERY_COPY.outside}</span>
        </p>
      </div>

      {/* PRODUCTS */}
      <section aria-labelledby="products-heading" className="container-site py-14 md:py-20">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Order online</Eyebrow>
            <h2 id="products-heading" className="mt-2 text-4xl font-bold md:text-5xl">
              Firewood, kindling &amp; road salt
            </h2>
          </div>
          <p className="text-ink-soft md:text-right">
            Prices per bag, <strong className="text-ink">delivery in Crieff included.</strong>
          </p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i === 0} />
          ))}
        </div>
      </section>

      {/* WHY */}
      <section aria-labelledby="why-heading" className="border-ink/10 bg-cream-50 border-y">
        <div className="container-site py-14 md:py-16">
          <h2 id="why-heading" className="text-center text-3xl font-bold md:text-4xl">
            Why Timber &amp; Flame
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, title, body }) => (
              <li key={title} className="text-center">
                <span className="bg-ember-700 text-cream-50 mx-auto grid h-14 w-14 place-items-center rounded-full">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="label mt-4 text-xl font-semibold">{title}</h3>
                <p className="text-ink-soft mx-auto mt-2 max-w-[16rem]">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HonestyStandSection settings={settings} />

      {/* DELIVERY */}
      <section aria-labelledby="delivery-heading" className="container-site py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-center">
          <div>
            <Eyebrow>Delivery</Eyebrow>
            <h2 id="delivery-heading" className="mt-2 text-4xl font-bold md:text-5xl">
              Brought to your door
            </h2>
            <p className="text-ink-soft mt-4 text-lg">
              Delivery is included in our advertised prices within Crieff. We also supply surrounding areas, where a small delivery charge
              may apply — we&apos;ll confirm it with you.
            </p>
            <Link href="/delivery" className="text-ember-700 mt-5 inline-block font-semibold underline underline-offset-4">
              Delivery details
            </Link>
          </div>
          <DeliveryCards zones={zones} />
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section aria-labelledby="about-heading" className="bg-cream-200/60">
        <div className="container-site py-14 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>About us</Eyebrow>
            <h2 id="about-heading" className="mt-2 text-3xl font-bold md:text-4xl">
              A small local firewood supplier in Crieff
            </h2>
            <p className="text-ink-soft mt-4 text-lg">
              Timber &amp; Flame keeps things simple: quality firewood, kindling and road salt at honest prices, sold from our honesty stand
              and delivered around Crieff. Every order supports a local small business.
            </p>
            <Link href="/about" className="text-ember-700 mt-5 inline-block font-semibold underline underline-offset-4">
              More about us
            </Link>
          </div>
        </div>
      </section>

      <FinalCta phoneDisplay={settings.phoneDisplay} phoneE164={settings.phoneE164} />
    </>
  );
}
