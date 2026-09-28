import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ActionForm } from "../ui";
import { updateProductAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products & prices" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await db.select().from(schema.products).orderBy(asc(schema.products.sortOrder));

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Products &amp; prices</h1>
      <p className="text-ink-soft mt-2">
        Prices include delivery within Crieff. Changes go live on the website straight away. Turn a product off to hide it from the shop.
      </p>

      <div className="mt-6 space-y-6">
        {products.map((p) => (
          <section key={p.id} className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1">
            <ActionForm action={updateProductAction} submitLabel={`Save ${p.name}`}>
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-4 sm:grid-cols-[1fr_12rem_7rem]">
                <div>
                  <label className="field-label" htmlFor={`n-${p.id}`}>
                    Name
                  </label>
                  <input id={`n-${p.id}`} name="name" defaultValue={p.name} required className="field" />
                </div>
                <div>
                  <label className="field-label" htmlFor={`p-${p.id}`}>
                    Price delivered in Crieff (£)
                  </label>
                  <input
                    id={`p-${p.id}`}
                    name="price"
                    inputMode="decimal"
                    defaultValue={(p.pricePence / 100).toFixed(2)}
                    required
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`s-${p.id}`}>
                    Order
                  </label>
                  <input id={`s-${p.id}`} name="sortOrder" type="number" min={0} defaultValue={p.sortOrder} className="field" />
                </div>
                <div className="sm:col-span-3">
                  <label className="field-label" htmlFor={`d-${p.id}`}>
                    Short description
                  </label>
                  <textarea
                    id={`d-${p.id}`}
                    name="shortDescription"
                    rows={2}
                    defaultValue={p.shortDescription}
                    required
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`u-${p.id}`}>
                    Unit
                  </label>
                  <input id={`u-${p.id}`} name="unitLabel" defaultValue={p.unitLabel} className="field" />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`z-${p.id}`}>
                    Size (optional)
                  </label>
                  <input
                    id={`z-${p.id}`}
                    name="sizeLabel"
                    defaultValue={p.sizeLabel ?? ""}
                    placeholder="e.g. 75cm × 45cm"
                    className="field"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="field-label" htmlFor={`i-${p.id}`}>
                    Photo (optional)
                  </label>
                  <input id={`i-${p.id}`} name="image" defaultValue={p.image ?? ""} placeholder="/images/kindling.jpg" className="field" />
                </div>
              </div>
              <label className="mt-4 flex items-center gap-3 font-semibold">
                <input type="checkbox" name="active" defaultChecked={p.active} className="accent-ember-700 h-5 w-5" />
                Available to order online
              </label>
            </ActionForm>
          </section>
        ))}
      </div>
      <p className="text-ink-soft mt-6 text-sm">
        Photos: add the file to <code>/public/images</code> and enter its path, e.g. <code>/images/kindling.jpg</code>. Without a photo, a
        simple illustration is shown.
      </p>
    </div>
  );
}
