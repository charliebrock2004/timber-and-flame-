import Link from "next/link";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatPence } from "@/lib/money";
import { PAYMENT_LABELS, STATUS_LABELS, WORKFLOW_STATUSES } from "@/lib/orders";
import { emailProvider, ownerRecipient } from "@/lib/email";
import { deliveryStatusText, deliveryKind } from "@/lib/order-format";
import type { OrderStatus } from "@/db/schema";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-amber/20 text-ink",
  PAID: "bg-moss/20 text-moss",
  PREPARING: "bg-sky/15 text-sky",
  OUT_FOR_DELIVERY: "bg-sky/25 text-sky",
  COMPLETED: "bg-ink/10 text-ink-soft",
  CANCELLED: "bg-ember-700/10 text-ember-700",
};

export default async function OrdersPage(props: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const filter = typeof sp.status === "string" && sp.status in STATUS_LABELS ? (sp.status as OrderStatus) : null;
  const o = schema.orders;

  const [rows, counts, [stats], [settings]] = await Promise.all([
    db.query.orders.findMany({
      where: filter ? eq(o.status, filter) : undefined,
      orderBy: desc(o.createdAt),
      limit: 200,
      with: { items: true },
    }),
    db.select({ status: o.status, n: count() }).from(o).groupBy(o.status),
    db
      .select({
        n: count(),
        total: sql<number>`coalesce(sum(${o.totalPence}), 0)::int`,
      })
      .from(o)
      .where(and(gte(o.createdAt, sql`now() - interval '30 days'`), sql`${o.status} <> 'CANCELLED'`)),
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
  ]);
  const provider = emailProvider();
  const notifyTo = ownerRecipient(settings?.contactEmail ?? null);
  const statuses = [...WORKFLOW_STATUSES, ...(hasStatus(counts, "PAID") ? (["PAID"] as const) : [])];
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>;
  const open = (countBy.PENDING ?? 0) + (countBy.PAID ?? 0) + (countBy.PREPARING ?? 0) + (countBy.OUT_FOR_DELIVERY ?? 0);

  return (
    <div>
      {!provider ? (
        <p className="bg-amber/15 mb-6 rounded-lg p-4 text-sm">
          <strong>Order emails are not set up yet.</strong> New orders are saved here, but no email is sent to you or the customer. Add the
          Gmail settings (see README) to switch them on.
        </p>
      ) : (
        <p className="bg-moss/10 mb-6 rounded-lg p-4 text-sm">
          New orders are emailed to <strong>{notifyTo ?? "—"}</strong> and a confirmation goes to the customer. Online payment isn&apos;t
          live yet — every order starts as <strong>Awaiting payment</strong>.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open orders" value={String(open)} />
        <Stat label="Orders (30 days)" value={String(stats?.n ?? 0)} />
        <Stat label="Order value (30 days)" value={formatPence(stats?.total ?? 0)} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-3xl font-bold">Orders</h1>
        <FilterLink href="/admin" active={!filter} label="All" />
        {statuses.map((s) => (
          <FilterLink key={s} href={`/admin?status=${s}`} active={filter === s} label={`${STATUS_LABELS[s]} (${countBy[s] ?? 0})`} />
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="bg-cream-50 mt-8 rounded-lg p-6">No orders yet.</p>
      ) : (
        <div className="bg-cream-50 shadow-card ring-ink/5 mt-6 overflow-x-auto rounded-xl ring-1">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="label bg-char-900 text-cream-200 text-xs">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-ink/10 divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${r.id}`}
                      className="text-ember-700 font-semibold whitespace-nowrap underline underline-offset-2"
                    >
                      {r.orderNumber}
                    </Link>
                    {r.ownerNotifiedAt && (!r.ownerEmailSentAt || !r.customerEmailSentAt) && (
                      <div className="text-ember-700 text-xs font-semibold" title="Open the order to resend">
                        Email not sent
                        <span className="block font-normal">
                          {[!r.ownerEmailSentAt && "to you", !r.customerEmailSentAt && "to customer"].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.customerName}</div>
                    <div>{r.phone}</div>
                    <div className="text-ink-soft">
                      {r.fulfilment === "DELIVERY" ? `${r.town ?? ""} ${r.postcode ?? ""}` : "Collection"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</td>
                  <td className={`px-4 py-3 ${deliveryKind(r) === "tbc" ? "text-ember-700 font-semibold" : ""}`}>
                    {deliveryStatusText(r)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                    {formatPence(r.totalPence)}
                    {r.fulfilment === "DELIVERY" && r.deliveryChargePence === null && (
                      <div className="text-ember-700 text-xs font-normal">+ delivery TBC</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{PAYMENT_LABELS[r.paymentStatus]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1">
      <p className="label text-ink-soft text-xs">{label}</p>
      <p className="label mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-ink text-cream-50" : "bg-cream-50 ring-ink/10 ring-1 hover:bg-white"}`}
    >
      {label}
    </Link>
  );
}

function hasStatus(counts: { status: string; n: number }[], status: string) {
  return counts.some((c) => c.status === status && c.n > 0);
}
