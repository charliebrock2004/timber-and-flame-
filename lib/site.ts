/** Absolute site URL, used for canonical links, sitemap, Stripe redirects. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/delivery", label: "Delivery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
