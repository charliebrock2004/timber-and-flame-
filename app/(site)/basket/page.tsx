import type { Metadata } from "next";
import { BasketView } from "@/components/cart/basket-view";
import { getActiveProducts, getDeliveryZones, getSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic"; // always fresh prices

export const metadata: Metadata = {
  title: "Your Basket",
  robots: { index: false, follow: true },
  alternates: { canonical: "/basket" },
};

export default async function BasketPage(props: PageProps<"/basket">) {
  const [products, zones, settings, sp] = await Promise.all([getActiveProducts(), getDeliveryZones(), getSettings(), props.searchParams]);
  return (
    <BasketView
      products={products}
      zones={zones}
      phoneDisplay={settings.phoneDisplay}
      phoneE164={settings.phoneE164}
      cancelled={sp.cancelled === "1"}
    />
  );
}
