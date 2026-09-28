import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { CatalogUnavailable } from "@/components/unavailable";
import { CatalogUnavailableError, getLiveCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic"; // always fresh prices + delivery rules

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage() {
  let catalog;
  try {
    catalog = await getLiveCatalog();
  } catch (e) {
    if (e instanceof CatalogUnavailableError) return <CatalogUnavailable />;
    throw e;
  }
  const { products, zones, settings } = catalog;
  return (
    <CheckoutFlow
      products={products}
      zones={zones}
      payLaterEnabled={settings.payLaterEnabled}
      collectionEnabled={settings.collectionEnabled}
      collectionInstructions={settings.collectionInstructions}
      phoneDisplay={settings.phoneDisplay}
      phoneE164={settings.phoneE164}
    />
  );
}
