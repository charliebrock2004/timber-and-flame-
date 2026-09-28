import Link from "next/link";
import { Logo } from "./logo";
import { BRAND } from "@/config/business";
import { NAV } from "@/lib/site";
import type { PublicSettings } from "@/lib/catalog";

export function Footer({ settings }: { settings: PublicSettings }) {
  return (
    <footer className="slats text-cream-200 pb-24 md:pb-0">
      <div className="container-site grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo tone="light" className="h-16 w-auto" sizes="140px" />
          <p className="text-cream-200/80 mt-4 max-w-sm">
            {BRAND.tagline}. Firewood, kindling and road salt supplied in {BRAND.serviceAreaSummary}.
          </p>
        </div>
        <div>
          <h2 className="label text-ember-200 text-sm">Contact</h2>
          <address className="mt-3 space-y-1 not-italic">
            <p className="text-cream-100 font-semibold">{BRAND.name}</p>
            {settings.addressLine && <p>{settings.addressLine}</p>}
            <p>
              {BRAND.town}, {BRAND.region}
            </p>
            <p>
              <a href={`tel:${settings.phoneE164}`} className="text-cream-100 text-lg font-semibold underline-offset-4 hover:underline">
                {settings.phoneDisplay}
              </a>
            </p>
            {settings.contactEmail && (
              <p>
                <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                  {settings.contactEmail}
                </a>
              </p>
            )}
          </address>
        </div>
        <div>
          <h2 className="label text-ember-200 text-sm">Explore</h2>
          <ul className="mt-3 space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-block py-1 underline-offset-4 hover:text-white hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/basket" className="inline-block py-1 underline-offset-4 hover:text-white hover:underline">
                Basket
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site text-cream-200/60 flex flex-col gap-1 py-5 text-sm sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. {BRAND.town}, {BRAND.region}.
          </p>
          <p>Thank you for supporting a local small business.</p>
        </div>
      </div>
    </footer>
  );
}
