import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { emailProvider, ownerRecipient } from "@/lib/email";
import { ActionForm } from "../ui";
import { updateSettingsAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [s] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  if (!s)
    return (
      <p>
        Settings missing — run <code>npm run db:seed</code>.
      </p>
    );

  const text = (name: keyof typeof s, label: string, hint?: string, multiline = false) => (
    <div className={multiline ? "sm:col-span-2" : ""}>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      {multiline ? (
        <textarea id={name} name={name} rows={3} defaultValue={(s[name] as string | null) ?? ""} className="field" />
      ) : (
        <input id={name} name={name} defaultValue={(s[name] as string | null) ?? ""} className="field" />
      )}
      {hint && <p className="text-ink-soft mt-1 text-sm">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Business settings</h1>
      <p className="text-ink-soft mt-2">Leave anything you don&apos;t want shown blank — blank fields are simply hidden on the website.</p>

      <section className="bg-cream-50 shadow-card ring-ink/5 mt-6 rounded-xl p-5 ring-1">
        <ActionForm action={updateSettingsAction} submitLabel="Save settings">
          <h2 className="label text-lg font-semibold">Contact</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {text("phoneDisplay", "Phone (as shown)", "e.g. 07535 759768")}
            {text("phoneE164", "Phone (international)", "e.g. +447535759768 — used for tap-to-call")}
            {text("contactEmail", "Business email", "Shown on the site. New orders are emailed here too.")}
            {text("addressLine", "Street address", "Optional. Town and region are always shown.")}
            {text("openingHours", "Opening / availability", "Free text, e.g. ‘Deliveries Mon–Sat’. Shown on Contact.", true)}
            {text("standLocation", "Honesty stand location", "Where customers can find the stand.", true)}
            {text("announcement", "Site banner", "Optional message across the top of every page.", true)}
          </div>

          <h2 className="label mt-8 text-lg font-semibold">Ordering</h2>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="payLaterEnabled" defaultChecked={s.payLaterEnabled} className="accent-ember-700 mt-1 h-5 w-5" />
              <span>
                <strong>Accept online orders</strong>
                <span className="text-ink-soft block text-sm">
                  Customers place an order online (awaiting payment) and you arrange delivery and payment when you contact them. Untick to
                  pause online ordering.
                </span>
              </span>
            </label>
            <p className="bg-cream-200/60 rounded-lg p-3 text-sm">
              Order emails:{" "}
              <strong>
                {emailProvider()
                  ? `ON — new orders go to ${ownerRecipient(s.contactEmail) ?? "(no address set)"}`
                  : "OFF — add the Gmail settings (see README)"}
              </strong>
              <br />
              Online payment: <strong>not live yet</strong> — orders are marked “Awaiting payment”.
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="collectionEnabled"
                defaultChecked={s.collectionEnabled}
                className="accent-ember-700 mt-1 h-5 w-5"
              />
              <span>
                <strong>Offer collection</strong>
                <span className="text-ink-soft block text-sm">Lets customers choose to collect instead of delivery.</span>
              </span>
            </label>
            <div className="grid sm:grid-cols-2">
              {text("collectionInstructions", "Collection instructions", "Shown to customers who choose collection.", true)}
            </div>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
