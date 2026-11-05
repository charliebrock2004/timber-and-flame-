import Image from "next/image";
import logStore from "@/public/images/log-store.jpg";
import { Eyebrow } from "./sections";

const INCLUDED = [
  "A handmade timber log store, built by WeeJob Joinery.",
  "The log store filled with firewood supplied by Timber & Flame.",
  "A complete ready-to-use package for storing firewood in the garden.",
];

const DIMENSIONS = [
  { label: "Height", value: "126.2 cm" },
  { label: "Width", value: "180 cm" },
  { label: "Depth", value: "82.3 cm" },
];

export function LogStoreOffer() {
  return (
    <section
      id="log-store-offer"
      aria-labelledby="log-store-heading"
      className="border-ink/10 bg-cream-50 scroll-mt-24 border-y md:scroll-mt-28"
    >
      <div className="container-site grid items-center gap-8 py-12 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-12 md:py-16 lg:gap-16">
        <figure>
          <div className="shadow-card ring-ink/10 relative overflow-hidden rounded-xl ring-1">
            <Image
              src={logStore}
              alt="Handmade timber log store with a slatted roof, filled with split firewood, on a concrete pad in a garden"
              sizes="(min-width: 768px) 42vw, 100vw"
              className="h-auto w-full"
              placeholder="blur"
            />
          </div>
          <figcaption className="text-ink-soft mt-3 text-sm">The handmade log store, filled and ready for the garden.</figcaption>
        </figure>

        <div>
          <Eyebrow>Limited-time special offer</Eyebrow>
          <h2 id="log-store-heading" className="mt-3 text-4xl font-bold md:text-5xl">
            Handmade log store & firewood package
          </h2>
          <p className="text-ink-soft mt-4 text-lg">Keep your firewood neatly stored and ready for the colder months.</p>
          <p className="text-ink mt-3 text-lg">
            Get our handmade timber log store, professionally built by WeeJob Joinery and filled with firewood from Timber & Flame.
          </p>

          <ul className="mt-5 space-y-2.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="bg-ember-700 mt-2 h-2 w-2 shrink-0 rounded-full" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="border-ink/10 mt-7 border-t pt-6">
            <h3 id="log-store-dimensions" className="label text-ember-700 text-sm">
              Product Dimensions
            </h3>
            <p className="text-ink mt-2 text-lg font-semibold">
              126.2 cm × 180 cm × 82.3 cm <span className="text-ink-soft text-base font-normal">(H × W × D)</span>
            </p>
            <dl aria-labelledby="log-store-dimensions" className="mt-3 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
              {DIMENSIONS.map(({ label, value }) => (
                <div key={label} className="ring-ink/10 rounded-lg bg-white/60 px-2.5 py-2.5 ring-1 sm:px-3">
                  <dt className="label text-ink-soft text-xs">{label}</dt>
                  <dd className="font-display mt-1 text-lg leading-tight font-bold whitespace-nowrap sm:text-xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-ink/10 mt-7 border-t pt-6">
            <p className="sr-only">Original price £500. Promotional price £400. Save £100, which is 20% off.</p>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3" aria-hidden>
              <p className="flex items-baseline gap-3">
                <span className="text-ink-soft font-display decoration-ember-700/80 text-3xl line-through decoration-2">£500</span>
                <span className="font-display text-6xl leading-none font-bold tracking-tight md:text-7xl">£400</span>
              </p>
              <p className="label bg-ember-700 text-cream-50 mb-1 rounded px-3 py-2 text-sm">Save £100 — 20% off</p>
            </div>
            <p className="text-ink-soft mt-4 max-w-xl text-sm">
              A limited-time collaboration. Timber & Flame supplies the firewood and handles the sale. WeeJob Joinery designs and builds the
              timber log store.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="tel:07940554342" className="btn btn-primary px-8 text-lg">
              Enquire now
            </a>
            <p className="text-ink-soft text-sm sm:max-w-[14rem]">Call 07940 554342. This offer is enquiry only.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
