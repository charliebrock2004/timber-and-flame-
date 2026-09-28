import type { Metadata } from "next";
import { openGraphFor } from "@/lib/seo";
import Link from "next/link";
import { Eyebrow } from "@/components/sections";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { getSettings } from "@/lib/catalog";
import { BRAND, DELIVERY_COPY } from "@/config/business";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = "Contact — Order Firewood in Crieff";
  const description = `Contact Timber & Flame Firewood, Crieff, Perthshire. Call ${s.phoneDisplay}${s.contactEmail ? ` or email ${s.contactEmail}` : ""} to order firewood, kindling or road salt.`;
  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    openGraph: openGraphFor("/contact", `${title} | Timber & Flame Firewood`, description),
  };
}

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <>
      <section className="slats text-cream-100">
        <div className="container-site py-10 md:py-14">
          <Eyebrow tone="light">Contact</Eyebrow>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Get in touch</h1>
          <p className="text-cream-200/85 mt-3 max-w-xl text-lg">Call, email or order online — whatever suits you.</p>
        </div>
      </section>

      <section className="container-site grid gap-8 py-12 md:grid-cols-2 md:py-16">
        <div className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-6 ring-1 md:p-8">
          <h2 className="label text-2xl font-semibold tracking-wider">{BRAND.name}</h2>
          <p className="text-ink-soft mt-2 flex items-center gap-2">
            <PinIcon className="text-ember-700 h-5 w-5" />
            {s.addressLine ? `${s.addressLine}, ` : ""}
            {BRAND.town}, {BRAND.region}
          </p>

          <p className="label text-ink-soft mt-8 text-sm">Phone</p>
          <a href={`tel:${s.phoneE164}`} className="label text-ink hover:text-ember-700 mt-1 block text-4xl font-semibold">
            {s.phoneDisplay}
          </a>
          {s.contactEmail && (
            <>
              <p className="label text-ink-soft mt-6 text-sm">Email</p>
              <a href={`mailto:${s.contactEmail}`} className="text-ember-700 mt-1 block text-lg font-semibold break-all underline">
                {s.contactEmail}
              </a>
            </>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a href={`tel:${s.phoneE164}`} className="btn btn-primary text-lg">
              <PhoneIcon className="h-5 w-5" /> Call now
            </a>
            {s.contactEmail && (
              <a href={`mailto:${s.contactEmail}`} className="btn btn-outline text-lg">
                <MailIcon className="h-5 w-5" /> Email us
              </a>
            )}
          </div>
          {s.openingHours && (
            <>
              <p className="label text-ink-soft mt-8 text-sm">Availability</p>
              <p className="mt-1 whitespace-pre-line">{s.openingHours}</p>
            </>
          )}
        </div>

        <div className="woodgrain text-cream-100 flex flex-col justify-center rounded-xl p-6 md:p-8">
          <h2 className="text-3xl font-bold">Ready to order?</h2>
          <p className="text-cream-200/85 mt-3 text-lg">
            Order online in a couple of minutes — you&apos;ll see your total, including delivery, before you place the order.
          </p>
          <Link href="/shop" className="btn btn-light mt-6 self-start px-8">
            Order online
          </Link>
          <p className="text-cream-200/75 mt-6">
            {DELIVERY_COPY.headline}. {DELIVERY_COPY.outside}
          </p>
        </div>
      </section>
    </>
  );
}
