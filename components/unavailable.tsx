import { PhoneIcon } from "./icons";
import { BRAND, DEFAULT_SETTINGS } from "@/config/business";

/**
 * Shown when products / prices can't be read from the database. It never
 * shows a price: the only details here are the business's contact details,
 * so customers can still order by phone.
 */
export function CatalogUnavailable({ onRetry, headingLevel = 1 }: { onRetry?: () => void; headingLevel?: 1 | 2 }) {
  const H = headingLevel === 1 ? "h1" : "h2";
  const { phoneDisplay, phoneE164, contactEmail } = DEFAULT_SETTINGS;
  return (
    <div className="container-site py-14 md:py-20">
      <div role="alert" className="bg-cream-50 shadow-card ring-ink/5 mx-auto max-w-2xl rounded-xl p-6 text-center ring-1 md:p-10">
        <H className="text-3xl font-bold md:text-4xl">Online ordering is temporarily unavailable</H>
        <p className="text-ink-soft mt-4 text-lg">
          We can&apos;t show live prices or take orders online right now. Nothing has been ordered and you haven&apos;t been charged. Please
          try again in a few minutes — or call {BRAND.shortName} and we&apos;ll take your order by phone.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={`tel:${phoneE164}`} className="btn btn-primary px-8 text-lg">
            <PhoneIcon className="h-5 w-5" /> Call {phoneDisplay}
          </a>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="btn btn-outline px-8 text-lg">
              Try again
            </button>
          ) : (
            contactEmail && (
              <a href={`mailto:${contactEmail}`} className="btn btn-outline px-8 text-lg">
                Email us
              </a>
            )
          )}
        </div>
      </div>
    </div>
  );
}
