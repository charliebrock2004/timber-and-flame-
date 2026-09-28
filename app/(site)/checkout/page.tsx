import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { getActiveProducts, getDeliveryZones, getSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic"; // always fresh prices + delivery rules

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage() {
  const [products, zones, settings] = await Promise.all([getActiveProducts(), getDeliveryZones(), getSettings()]);
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
