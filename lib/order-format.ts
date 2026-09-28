/** Plain-English order wording shared by emails, the confirmation page and admin. */
import type { Order } from "@/db/schema";
import { formatPence } from "./money";

type DeliveryFields = Pick<Order, "fulfilment" | "deliveryZoneName" | "deliveryChargePence">;

/** Is delivery included (0), a known charge (>0), or still to be confirmed (null)? */
export function deliveryKind(o: DeliveryFields): "collection" | "included" | "charged" | "tbc" {
  if (o.fulfilment === "COLLECTION") return "collection";
  if (o.deliveryChargePence === null) return "tbc";
  return o.deliveryChargePence === 0 ? "included" : "charged";
}

/** e.g. "Included in Crieff" / "Outside Crieff — delivery charge to be confirmed" */
export function deliveryStatusText(o: DeliveryFields): string {
  switch (deliveryKind(o)) {
    case "collection":
      return "Collection";
    case "included":
      return `Included in ${o.deliveryZoneName ?? "Crieff"}`;
    case "tbc":
      return `${o.deliveryZoneName ?? "Outside Crieff"} — delivery charge to be confirmed`;
    default:
      return `${o.deliveryZoneName} — ${formatPence(o.deliveryChargePence!)}`;
  }
}

/** Short value for a "Delivery" row in a price summary. */
export function deliveryLineValue(o: DeliveryFields): string {
  switch (deliveryKind(o)) {
    case "collection":
      return "Collection";
    case "included":
      return "Included";
    case "tbc":
      return "To be confirmed";
    default:
      return formatPence(o.deliveryChargePence!);
  }
}

export function formatOrderDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" }).format(d);
}
