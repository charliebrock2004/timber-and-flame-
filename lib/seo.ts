import type { Metadata } from "next";
import { BRAND } from "@/config/business";
import type { PublicProduct, PublicSettings } from "./catalog";
import { siteUrl } from "./site";

/**
 * schema.org LocalBusiness for Google. Only facts we actually know are
 * included — no invented street address, hours or ratings.
 */
export function localBusinessJsonLd(settings: PublicSettings, products: PublicProduct[]) {
  const url = siteUrl();
  const prices = products.map((p) => p.pricePence / 100);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}/#business`,
    name: BRAND.name,
    alternateName: BRAND.shortName,
    slogan: BRAND.tagline,
    description: `Firewood, kindling and road salt supplied in ${BRAND.serviceAreaSummary}, with delivery included in the price within Crieff and a local honesty stand.`,
    url,
    telephone: settings.phoneE164,
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    image: [`${url}/images/honesty-stand.jpg`, `${url}/images/firewood-bags.jpg`],
    logo: `${url}/images/logo.png`,
    address: {
      "@type": "PostalAddress",
      ...(settings.addressLine ? { streetAddress: settings.addressLine } : {}),
      addressLocality: BRAND.town,
      addressRegion: BRAND.region,
      addressCountry: BRAND.country,
    },
    areaServed: [
      { "@type": "City", name: "Crieff" },
      { "@type": "AdministrativeArea", name: "Perthshire" },
    ],
    ...(prices.length ? { priceRange: `£${Math.min(...prices)}–£${Math.max(...prices)}` } : {}),
    currenciesAccepted: "GBP",
    ...(products.length ? { hasOfferCatalog: offerCatalog(url, products) } : {}),
  };
}

function offerCatalog(url: string, products: PublicProduct[]) {
  return {
    "@type": "OfferCatalog",
    name: "Firewood, kindling and road salt",
    itemListElement: products.map((p) => ({
      "@type": "Offer",
      price: (p.pricePence / 100).toFixed(2),
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      url: `${url}/shop#${p.id}`,
      description: `${p.unitLabel === "per bag" ? "Per bag" : p.unitLabel}, delivered in Crieff`,
      areaServed: { "@type": "City", name: "Crieff" },
      itemOffered: {
        "@type": "Product",
        name: p.name,
        description: p.sizeLabel ? `${p.shortDescription} Bag size ${p.sizeLabel}.` : p.shortDescription,
      },
    })),
  };
}

/** Serialise JSON-LD safely (prevents `</script>` breaking out). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Open Graph for a page. Next.js REPLACES (not merges) the parent's
 * openGraph object when a page sets one, so every page must carry the
 * full set — image, site name, locale — not just its URL.
 */
export function openGraphFor(path: string, title?: string, description?: string): Metadata["openGraph"] {
  return {
    type: "website",
    locale: "en_GB",
    siteName: BRAND.name,
    url: path,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Timber & Flame Firewood — bags of firewood, Crieff" }],
  };
}
