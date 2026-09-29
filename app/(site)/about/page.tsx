import type { Metadata } from "next";
import { openGraphFor } from "@/lib/seo";
import Image from "next/image";
import bags from "@/public/images/firewood-bags.jpg";
import { Eyebrow, FinalCta, HonestyStandSection } from "@/components/sections";
import { getSettings } from "@/lib/catalog";

export const revalidate = 3600;

const TITLE = "About Us — Local Firewood Supplier in Crieff";
const DESCRIPTION =
  "Timber & Flame is a small local firewood supplier based in Crieff, Perthshire, selling seasoned firewood, kindling and road salt at honest prices.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: openGraphFor("/about", `${TITLE} | Timber & Flame Firewood`, DESCRIPTION),
};

const VALUES = [
  ["Local", "We're based in Crieff and supply Crieff and the surrounding area."],
  ["Straightforward", "A few good products, sold by the bag or by the load. Nothing complicated."],
  ["Honest pricing", "Clear prices, shown up front, with delivery in Crieff included."],
  ["Convenient delivery", "Delivered to your door in Crieff, and surrounding areas too."],
  ["Quality firewood", "Quality seasoned firewood supplied in convenient bags."],
];

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <>
      <section className="slats text-cream-100">
        <div className="container-site py-10 md:py-14">
          <Eyebrow tone="light">About</Eyebrow>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">A local firewood supplier in Crieff</h1>
        </div>
      </section>

      <section className="container-site grid gap-10 py-12 md:grid-cols-2 md:items-center md:py-16">
        <div className="text-ink-soft space-y-4 text-lg">
          <p>
            <strong className="text-ink">Timber &amp; Flame Firewood</strong> is a small, local business based in Crieff, Perthshire. We
            supply seasoned firewood, kindling and road salt to homes in Crieff and the surrounding area.
          </p>
          <p>
            Our motto is on every sign we put up — <em>Quality Wood • Honest Prices</em>. You&apos;ll find us at our honesty stand in
            Crieff, and now you can order online and have your order delivered.
          </p>
          <p>Thank you for supporting a local small business — and keep warm!</p>
        </div>
        <div className="shadow-card ring-ink/10 relative overflow-hidden rounded-xl ring-1">
          <Image
            src={bags}
            alt="Red net bags filled with split firewood logs"
            sizes="(min-width: 768px) 50vw, 100vw"
            placeholder="blur"
            className="h-auto w-full"
          />
        </div>
      </section>

      <section aria-labelledby="values-heading" className="border-ink/10 bg-cream-50 border-t">
        <div className="container-site py-12 md:py-16">
          <h2 id="values-heading" className="text-3xl font-bold">
            What we&apos;re about
          </h2>
          <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map(([t, d]) => (
              <div key={t} className="border-ember-700 border-t-4 pt-4">
                <dt className="label text-lg font-semibold">{t}</dt>
                <dd className="text-ink-soft mt-1">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <HonestyStandSection settings={settings} />
      <FinalCta phoneDisplay={settings.phoneDisplay} phoneE164={settings.phoneE164} />
    </>
  );
}
