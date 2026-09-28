import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BRAND } from "@/config/business";
import { siteUrl } from "@/lib/site";

const slab = localFont({
  src: [
    { path: "./fonts/zilla-slab-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/zilla-slab-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-slab",
  display: "swap",
});
const oswald = localFont({
  src: [
    { path: "./fonts/oswald-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/oswald-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-oswald",
  display: "swap",
});
const body = localFont({
  src: [
    { path: "./fonts/source-sans-3-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/source-sans-3-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/source-sans-3-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND.name} | Firewood & Kindling Delivery in Crieff, Perthshire`,
    template: `%s | ${BRAND.name}, Crieff`,
  },
  description:
    "Seasoned firewood, kindling and road salt from Timber & Flame in Crieff, Perthshire. Order online — delivery in Crieff included in the price.",
  applicationName: BRAND.name,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: BRAND.name,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Timber & Flame Firewood — bags of firewood, Crieff" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#1c1a19",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${slab.variable} ${oswald.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
