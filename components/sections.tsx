import Image from "next/image";
import Link from "next/link";
import standPhoto from "@/public/images/honesty-stand.jpg";
import { formatPence } from "@/lib/money";
import type { ZoneRule } from "@/lib/delivery";
import type { PublicSettings } from "@/lib/catalog";
import { DELIVERY_COPY } from "@/config/business";
import { HandshakeIcon, PhoneIcon, PinIcon, TruckIcon } from "./icons";

export function Eyebrow({ children, tone = "ember" }: { children: React.ReactNode; tone?: "ember" | "light" }) {
  return (
    <p className={`label flex items-center gap-3 text-sm ${tone === "light" ? "text-ember-200" : "text-ember-700"}`}>
      <span className={`h-px w-8 ${tone === "light" ? "bg-ember-200/60" : "bg-ember-700/60"}`} aria-hidden />
      {children}
    </p>
  );
}

/** Plain-English wording for a zone's charge. Never invents a figure. */
export function zoneChargeText(z: ZoneRule): string {
  if (z.chargePence === 0) return "Free / included delivery";
  if (z.chargePence === null) return "Small delivery charge may apply";
  return `${formatPence(z.chargePence)} delivery`;
}

export function DeliveryCards({ zones }: { zones: ZoneRule[] }) {
  const enabled = zones.filter((z) => z.enabled);
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {enabled.map((z) => {
        const free = z.chargePence === 0;
        return (
          <li key={z.id} className={`rounded-xl p-6 ring-1 ${free ? "bg-ember-700 ring-ember-800 text-white" : "bg-cream-50 ring-ink/10"}`}>
            <TruckIcon className={`h-7 w-7 ${free ? "text-ember-200" : "text-ember-700"}`} />
            <h3 className="label mt-3 text-2xl font-semibold">{z.name}</h3>
            <p className={`mt-1 text-lg font-semibold ${free ? "text-white" : "text-ink"}`}>{zoneChargeText(z)}</p>
            {z.description && <p className={`mt-2 ${free ? "text-ember-200" : "text-ink-soft"}`}>{z.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function HonestyStandSection({ settings, headingLevel = 2 }: { settings: PublicSettings; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby="stand-heading" className="bg-cream-200/60">
      <div className="container-site grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <figure className="relative">
          <div className="shadow-card ring-ink/10 relative overflow-hidden rounded-xl ring-1">
            <Image
              src={standPhoto}
              alt="The Timber & Flame honesty stand: a slatted timber shelter stacked with red net bags of firewood, with a price board and cash box"
              sizes="(min-width: 768px) 50vw, 100vw"
              className="h-auto w-full"
              placeholder="blur"
            />
          </div>
          <figcaption className="text-ink-soft mt-3 text-sm">The Timber &amp; Flame honesty stand in Crieff.</figcaption>
        </figure>
        <div>
          <Eyebrow>Also in Crieff</Eyebrow>
          <H id="stand-heading" className="mt-3 text-4xl font-bold md:text-5xl">
            Visit our honesty stand
          </H>
          <p className="text-ink-soft mt-5 text-lg">
            As well as delivering, Timber &amp; Flame runs a local honesty stand, an important part of the business. It&apos;s stocked with
            bagged firewood, kindling and road salt: take what you need and pay at the stand. Simple, local and built on trust.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex gap-3">
              <HandshakeIcon className="text-ember-700 mt-0.5 h-6 w-6 shrink-0" />
              <span>
                <strong>Paying at the stand:</strong> cash in the box, bank transfer, or scan the code on the stand to pay.
              </span>
            </li>
            <li className="flex gap-3">
              <PinIcon className="text-ember-700 mt-0.5 h-6 w-6 shrink-0" />
              <span>
                {settings.standLocation ? (
                  <>
                    <strong>Where:</strong> {settings.standLocation}
                  </>
                ) : (
                  <>
                    <strong>Where:</strong> in Crieff — give us a call and we&apos;ll point you to it.
                  </>
                )}
              </span>
            </li>
          </ul>
          <p className="text-ink-soft mt-6 text-sm">
            Stand prices are shown on the board at the stand and are paid there, separately from online orders. Want it brought to your
            door? Order online for delivery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-primary">
              Order for delivery
            </Link>
            <a href={`tel:${settings.phoneE164}`} className="btn btn-outline">
              <PhoneIcon className="h-5 w-5" /> {settings.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ phoneDisplay, phoneE164 }: { phoneDisplay: string; phoneE164: string }) {
  return (
    <section aria-labelledby="cta-heading" className="woodgrain text-cream-100">
      <div className="container-site py-16 text-center md:py-20">
        <p className="label text-ember-200">Keep warm this season</p>
        <h2 id="cta-heading" className="mx-auto mt-3 max-w-2xl text-4xl font-bold md:text-5xl">
          Order your firewood
        </h2>
        <p className="text-cream-200/85 mx-auto mt-4 max-w-xl text-lg">
          Pick your bags, tell us where to bring them, done. {DELIVERY_COPY.headline} — {DELIVERY_COPY.outside.toLowerCase()}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="btn btn-primary px-8">
            Order now
          </Link>
          <a href={`tel:${phoneE164}`} className="btn btn-outline-light px-8">
            <PhoneIcon className="h-5 w-5" /> Call {phoneDisplay}
          </a>
        </div>
      </div>
    </section>
  );
}
