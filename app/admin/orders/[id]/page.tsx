import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrderWithItems, PAYMENT_LABELS, STATUS_LABELS, WORKFLOW_STATUSES } from "@/lib/orders";
import { deliveryStatusText } from "@/lib/order-format";
import { emailProvider } from "@/lib/email";
import { formatPence } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { ActionForm } from "../../ui";
import { resendOrderEmailAction, updateOrderAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await getOrderWithItems({ id });
  if (!order) notFound();

  const tbc = order.fulfilment === "DELIVERY" && order.deliveryChargePence === null;
  const mapsQuery = encodeURIComponent([order.addressLine1, order.town, order.postcode].filter(Boolean).join(", "));

  return (
    <div className="max-w-4xl">
      <Link href="/admin" className="text-ember-700 text-sm font-semibold underline">
        ← All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="label text-4xl font-semibold tracking-wider">{order.orderNumber}</h1>
        <p className="text-ink-soft">Placed {fmtDate(order.createdAt)}</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1">
          <h2 className="label text-ink-soft text-sm">Customer</h2>
          <p className="mt-1 text-xl font-semibold">{order.customerName}</p>
          <p className="mt-2">
            <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="text-ember-700 font-semibold underline">
              {order.phone}
            </a>
          </p>
          <p>
            <a href={`mailto:${order.email}`} className="text-ember-700 underline">
              {order.email}
            </a>
          </p>
          <h2 className="label text-ink-soft mt-5 text-sm">{order.fulfilment === "DELIVERY" ? "Deliver to" : "Collection"}</h2>
          {order.fulfilment === "DELIVERY" ? (
            <>
              <address className="mt-1 not-italic">
                {order.addressLine1}
                {order.addressLine2 && <>, {order.addressLine2}</>}
                <br />
                {order.town} {order.postcode}
              </address>
              <p className="mt-1 text-sm">
                Zone: <strong>{order.deliveryZoneName}</strong> ·{" "}
                <a
                  className="text-ember-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                >
                  Open in Maps
                </a>
              </p>
            </>
          ) : (
            <p className="mt-1">Customer will collect.</p>
          )}
          {order.notes && (
            <>
              <h2 className="label text-ink-soft mt-5 text-sm">Customer notes</h2>
              <p className="mt-1 whitespace-pre-line">{order.notes}</p>
            </>
          )}
        </section>

        <section className="bg-cream-50 shadow-card ring-ink/5 rounded-xl p-5 ring-1">
          <h2 className="label text-ink-soft text-sm">Items</h2>
          <table className="mt-2 w-full text-left">
            <tbody className="divide-ink/10 divide-y">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2">
                    {i.quantity} × {i.productName}
                  </td>
                  <td className="text-ink-soft py-2 text-right whitespace-nowrap">@ {formatPence(i.unitPricePence)}</td>
                  <td className="py-2 text-right">{formatPence(i.lineTotalPence)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2" colSpan={2}>
                  Subtotal
                </td>
                <td className="py-2 text-right">{formatPence(order.subtotalPence)}</td>
              </tr>
              <tr>
                <td className="py-2" colSpan={2}>
                  Delivery
                </td>
                <td className={`py-2 text-right ${tbc ? "text-ember-700 font-semibold" : ""}`}>
                  {order.fulfilment === "COLLECTION"
                    ? "—"
                    : tbc
                      ? "TBC"
                      : order.deliveryChargePence === 0
                        ? "Included"
                        : formatPence(order.deliveryChargePence!)}
                </td>
              </tr>
              <tr className="label text-lg">
                <td className="py-2" colSpan={2}>
                  Total
                </td>
                <td className="py-2 text-right font-semibold">
                  {formatPence(order.totalPence)}
                  {tbc && " + delivery"}
                </td>
              </tr>
            </tbody>
          </table>
          <dl className="border-ink/10 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-3 text-sm">
            <dt className="font-semibold">Delivery status</dt>
            <dd className={tbc ? "text-ember-700 font-semibold" : ""}>{deliveryStatusText(order)}</dd>
            <dt className="font-semibold">Payment status</dt>
            <dd>{PAYMENT_LABELS[order.paymentStatus]}</dd>
            <dt className="font-semibold">Order status</dt>
            <dd>{STATUS_LABELS[order.status]}</dd>
          </dl>
          {order.stripePaymentIntentId && <p className="text-ink-soft mt-1 text-xs">Stripe payment: {order.stripePaymentIntentId}</p>}
        </section>
      </div>

      <section className="bg-cream-50 shadow-card ring-ink/5 mt-6 rounded-xl p-5 ring-1">
        <h2 className="text-2xl font-bold">Update order</h2>
        <ActionForm action={updateOrderAction} submitLabel="Update order" className="mt-4">
          <input type="hidden" name="id" value={order.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="status">
                Order status
              </label>
              <select id="status" name="status" defaultValue={order.status} className="field">
                {[...WORKFLOW_STATUSES, ...(order.status === "PAID" ? (["PAID"] as const) : [])].map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            {order.paymentMethod === "PAY_LATER" && (
              <div>
                <label className="field-label" htmlFor="paymentStatus">
                  Payment received?
                </label>
                <select
                  id="paymentStatus"
                  name="paymentStatus"
                  defaultValue={order.paymentStatus === "UNPAID" ? "AWAITING_PAYMENT" : order.paymentStatus}
                  className="field"
                >
                  <option value="AWAITING_PAYMENT">Awaiting payment</option>
                  <option value="PAID">Paid</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
            )}
            {order.paymentMethod === "PAY_LATER" && order.fulfilment === "DELIVERY" && (
              <div>
                <label className="field-label" htmlFor="deliveryCharge">
                  Delivery charge (£)
                </label>
                <input
                  id="deliveryCharge"
                  name="deliveryCharge"
                  inputMode="decimal"
                  placeholder={tbc ? "Enter once agreed" : ""}
                  defaultValue={order.deliveryChargePence !== null ? (order.deliveryChargePence / 100).toFixed(2) : ""}
                  className="field"
                />
              </div>
            )}
          </div>
          {order.paymentMethod === "CARD" && (
            <p className="text-ink-soft mt-3 text-sm">
              Card payment status is updated automatically by Stripe. Refunds are made from the Stripe dashboard.
            </p>
          )}
          <p className="text-ink-soft mt-3 text-sm">
            Payment is never marked as received automatically — set it once you&apos;ve been paid.
          </p>
        </ActionForm>
      </section>

      <section className="bg-cream-50 shadow-card ring-ink/5 mt-6 rounded-xl p-5 ring-1">
        <h2 className="text-2xl font-bold">Emails</h2>
        {!emailProvider() && (
          <p className="bg-amber/15 mt-3 rounded-lg p-3 text-sm">Email isn&apos;t set up yet, so nothing can be sent. See the README.</p>
        )}
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <EmailStatus
            label="Order email to you"
            sentAt={order.ownerEmailSentAt}
            attempted={Boolean(order.ownerNotifiedAt)}
            orderId={order.id}
            which="owner"
            canSend={Boolean(emailProvider())}
          />
          <EmailStatus
            label={`Confirmation to customer (${order.email})`}
            sentAt={order.customerEmailSentAt}
            attempted={Boolean(order.ownerNotifiedAt)}
            orderId={order.id}
            which="customer"
            canSend={Boolean(emailProvider())}
          />
        </div>
      </section>
    </div>
  );
}

function EmailStatus(props: {
  label: string;
  sentAt: Date | null;
  attempted: boolean;
  orderId: string;
  which: "owner" | "customer";
  canSend: boolean;
}) {
  const failed = !props.sentAt;
  return (
    <div className={`rounded-lg p-4 ring-1 ${failed ? "bg-ember-700/5 ring-ember-700/30" : "ring-ink/10 bg-white"}`}>
      <p className="font-semibold break-words">{props.label}</p>
      <p className={failed ? "text-ember-700 font-semibold" : "text-moss font-semibold"}>
        {props.sentAt ? `Sent ${fmtDate(props.sentAt)}` : props.attempted ? "Email not sent" : "Not sent yet"}
      </p>
      {props.canSend && (
        <ActionForm action={resendOrderEmailAction} submitLabel={props.sentAt ? "Send again" : "Resend email"} className="mt-1">
          <input type="hidden" name="id" value={props.orderId} />
          <input type="hidden" name="which" value={props.which} />
        </ActionForm>
      )}
    </div>
  );
}
