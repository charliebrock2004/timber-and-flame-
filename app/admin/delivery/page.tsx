import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ActionForm } from "../ui";
import { updateZoneAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delivery" };

export default async function AdminDeliveryPage() {
  await requireAdmin();
  const zones = await db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sortOrder));

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Delivery zones</h1>
      <div className="text-ink-soft mt-3 space-y-2">
        <p>
          Each order&apos;s postcode is matched against these zones, top to bottom. A zone with <strong>no postcode prefixes</strong>{" "}
          catches every postcode that didn&apos;t match an earlier zone.
        </p>
        <p>
          <strong>Charge:</strong> <code>0</code> = free · an amount like <code>5</code> = fixed charge · <strong>blank</strong> = &ldquo;to
          be confirmed&rdquo; (customers can still order, but card payment is switched off for that zone until you set a price).
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {zones.map((z) => (
          <section key={z.id} className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1">
            <ActionForm action={updateZoneAction} submitLabel={`Save ${z.name}`}>
              <input type="hidden" name="id" value={z.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor={`zn-${z.id}`}>
                    Zone name
                  </label>
                  <input id={`zn-${z.id}`} name="name" defaultValue={z.name} className="field" />
                </div>
                <div>
                  <label className="field-label" htmlFor={`zc-${z.id}`}>
                    Charge (£)
                  </label>
                  <input
                    id={`zc-${z.id}`}
                    name="charge"
                    inputMode="decimal"
                    placeholder="Blank = to be confirmed"
                    defaultValue={z.chargePence === null ? "" : (z.chargePence / 100).toFixed(2)}
                    className="field"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`zp-${z.id}`}>
                    Postcode prefixes (comma separated)
                  </label>
                  <input
                    id={`zp-${z.id}`}
                    name="prefixes"
                    defaultValue={z.postcodePrefixes.join(", ")}
                    placeholder="e.g. PH7  or  PH7 3, PH7 4 — leave blank for 'everywhere else'"
                    className="field uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`zd-${z.id}`}>
                    Description shown to customers
                  </label>
                  <input id={`zd-${z.id}`} name="description" defaultValue={z.description ?? ""} className="field" />
                </div>
              </div>
              <label className="mt-4 flex items-center gap-3 font-semibold">
                <input type="checkbox" name="enabled" defaultChecked={z.enabled} className="accent-ember-700 h-5 w-5" />
                We deliver to this zone
              </label>
            </ActionForm>
          </section>
        ))}
      </div>
    </div>
  );
}
