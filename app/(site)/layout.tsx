import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { getActiveProducts, getSettings, type PublicSettings } from "@/lib/catalog";
import { jsonLdScript, localBusinessJsonLd } from "@/lib/seo";
import { DEFAULT_SETTINGS } from "@/config/business";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  // The header and footer must still render if the database is down, so the
  // page's own "unavailable" message shows with a way to phone. They fall back
  // to the business contact details only — never to prices: with no live
  // products, the basket bar shows no totals and structured data lists no offers.
  const [s, p] = await Promise.allSettled([getSettings(), getActiveProducts()]);
  const settings: PublicSettings = s.status === "fulfilled" ? s.value : { ...DEFAULT_SETTINGS, announcement: null };
  const products = p.status === "fulfilled" ? p.value : [];
  const prices = p.status === "fulfilled" ? Object.fromEntries(products.map((x) => [x.id, x.pricePence])) : null;

  return (
    <>
      <a
        href="#main"
        className="bg-cream-50 text-ink sr-only z-50 rounded px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {settings.announcement && (
        <div className="bg-ember-700 px-4 py-2 text-center text-sm font-semibold text-white">{settings.announcement}</div>
      )}
      <Header phoneDisplay={settings.phoneDisplay} phoneE164={settings.phoneE164} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} />
      <MobileActionBar phoneE164={settings.phoneE164} phoneDisplay={settings.phoneDisplay} prices={prices} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessJsonLd(settings, products)) }} />
    </>
  );
}
