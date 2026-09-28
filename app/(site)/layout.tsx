import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { getActiveProducts, getSettings } from "@/lib/catalog";
import { jsonLdScript, localBusinessJsonLd } from "@/lib/seo";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, products] = await Promise.all([getSettings(), getActiveProducts()]);
  const prices = Object.fromEntries(products.map((p) => [p.id, p.pricePence]));

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
