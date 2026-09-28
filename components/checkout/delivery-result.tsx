"use client";

import { findZone, normalisePostcode, type ZoneRule } from "@/lib/delivery";
import { formatPence } from "@/lib/money";
import { CheckIcon, TruckIcon } from "../icons";

export type DeliveryCheck =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "none"; postcode: string }
  | { kind: "included" | "tbc" | "charged"; postcode: string; zone: ZoneRule };

/** Same zone logic the server uses — this is only a preview; the server decides. */
export function checkDelivery(raw: string, zones: ZoneRule[]): DeliveryCheck {
  if (!raw.trim()) return { kind: "empty" };
  const postcode = normalisePostcode(raw);
  if (!postcode) return { kind: "invalid" };
  const zone = findZone(postcode, zones);
  if (!zone) return { kind: "none", postcode };
  if (zone.chargePence === null) return { kind: "tbc", postcode, zone };
  return { kind: zone.chargePence === 0 ? "included" : "charged", postcode, zone };
}

/** The answer to "do you deliver to me, and what does it cost?" */
export function DeliveryResult({
  check,
  phoneDisplay,
  compact = false,
}: {
  check: DeliveryCheck;
  phoneDisplay: string;
  compact?: boolean;
}) {
  if (check.kind === "empty" || check.kind === "invalid") return null;
  const pad = compact ? "p-3" : "p-4";
  if (check.kind === "none") {
    return (
      <p role="status" className={`bg-ember-700/10 text-ember-800 rounded-lg ${pad} font-semibold`}>
        Sorry, we can&apos;t take online orders for {check.postcode} — please call {phoneDisplay} and we&apos;ll see what we can do.
      </p>
    );
  }
  if (check.kind === "included") {
    return (
      <p role="status" className={`bg-moss/12 text-ink flex items-start gap-2.5 rounded-lg ${pad}`}>
        <CheckIcon className="text-moss mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <strong className="text-moss block">{check.zone.name} — delivery included</strong>
          {!compact && <span className="text-ink-soft text-sm">Delivery to {check.postcode} is included in our prices.</span>}
        </span>
      </p>
    );
  }
  return (
    <p role="status" className={`bg-amber/15 text-ink flex items-start gap-2.5 rounded-lg ${pad}`}>
      <TruckIcon className="text-amber mt-0.5 h-5 w-5 shrink-0" />
      <span>
        <strong className="block">{check.zone.name}</strong>
        {check.kind === "tbc" ? (
          <span>Small delivery charge may apply — we&apos;ll confirm this with you.</span>
        ) : (
          <span>Delivery charge: {formatPence(check.zone.chargePence!)}</span>
        )}
      </span>
    </p>
  );
}
