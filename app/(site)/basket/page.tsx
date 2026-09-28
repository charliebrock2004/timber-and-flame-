import type { Metadata } from "next";
import { BasketView } from "@/components/cart/basket-view";
import { CatalogUnavailable } from "@/components/unavailable";
import { CatalogUnavailableError, getLiveCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic"; // always fresh prices

export const metadata: Metadata = {
  title: "Your Basket",
  robots: { index: false, follow: true },
  alternates: { canonical: "/basket" },
};

export default async function BasketPage(props: PageProps<"/basket">) {
  const sp = await props.searchParams;
  let catalog;
  try {
    catalog = await getLiveCatalog();
  } catch (e) {
    if (e instanceof CatalogUnavailableError) return <CatalogUnavailable />;
    throw e;
  }
  const { products, zones, settings } = catalog;
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
