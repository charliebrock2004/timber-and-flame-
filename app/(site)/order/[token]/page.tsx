import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems } from "@/lib/orders";
import { getSettings } from "@/lib/catalog";
import { formatPence } from "@/lib/money";
import { deliveryKind, deliveryLineValue } from "@/lib/order-format";
import { CheckIcon, PhoneIcon } from "@/components/icons";
import { ClearBasket } from "@/components/cart/clear-basket";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order received",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // the URL contains the order's private token
};

export default async function OrderPage(props: PageProps<"/order/[token]">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();

  const [order, settings] = await Promise.all([getOrderWithItems({ accessToken: token }), getSettings()]);
  if (!order) notFound();

  const card = order.paymentMethod === "CARD";
  const paid = order.paymentStatus === "PAID";
  const awaiting = card && order.paymentStatus === "AWAITING_PAYMENT";
  const failed = card && (order.paymentStatus === "FAILED" || order.paymentStatus === "EXPIRED");
  const fromStripe = sp.from === "stripe";

  const deliveryLine = deliveryLineValue(order);
  const tbc = deliveryKind(order) === "tbc";

  return (
    <div className="container-site max-w-3xl py-10 md:py-16">
      {/* Only clear the basket once the order is actually placed/paid. */}
      {(!card || paid || fromStripe) && !failed && <ClearBasket />}
      {awaiting && (
        // Stripe's webhook normally lands within seconds; refresh until it does.
        <meta httpEquiv="refresh" content="4" />
      )}

      <div className="text-center">
        {failed ? (
          <>
            <h1 className="text-4xl font-bold">Payment not completed</h1>
            <p className="text-ink-soft mt-3 text-lg">
              Your card wasn&apos;t charged for order <strong>{order.orderNumber}</strong>. You can{" "}
              <Link href="/basket" className="text-ember-700 font-semibold underline">
                try again
              </Link>{" "}
              or call us on {settings.phoneDisplay}.
            </p>
          </>
        ) : awaiting ? (
          <>
            <h1 className="text-4xl font-bold">Confirming your payment…</h1>
            <p className="text-ink-soft mt-3 text-lg" role="status">
              This usually takes a few seconds. This page will update automatically.
            </p>
          </>
        ) : (
          <>
            <span className="bg-moss mx-auto grid h-16 w-16 place-items-center rounded-full text-white">
              <CheckIcon className="h-9 w-9" />
            </span>
            <h1 className="label mt-5 text-4xl font-semibold tracking-wide md:text-5xl">Order received</h1>
            <p className="mt-3 text-xl font-semibold">Thank you for your order.</p>
            <p className="text-ink-soft mt-1 text-lg">Your order has been sent to Timber &amp; Flame.</p>
          </>
        )}
      </div>

      <section aria-labelledby="h-order" className="bg-cream-50 shadow-card ring-ink/5 mt-10 overflow-hidden rounded-xl ring-1">
        <div className="bg-char-900 text-cream-100 flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 md:px-6">
          <h2 id="h-order" className="label text-lg">
            Order number
          </h2>
          <p className="label text-2xl font-semibold tracking-widest">{order.orderNumber}</p>
        </div>
        <div className="p-5 md:p-6">
          <table className="w-full text-left">
            <caption className="sr-only">Items ordered</caption>
            <thead className="label text-ink-soft text-sm">
              <tr>
                <th scope="col" className="pb-2 font-medium">
                  Item
                </th>
                <th scope="col" className="pb-2 text-center font-medium">
                  Qty
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Line total
                </th>
              </tr>
            </thead>
            <tbody className="divide-ink/10 divide-y">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2">
                    {i.productName}
                    <span className="text-ink-soft block text-sm">{formatPence(i.unitPricePence)} per bag</span>
                  </td>
                  <td className="py-2 text-center">{i.quantity}</td>
                  <td className="py-2 text-right">{formatPence(i.lineTotalPence)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-ink/10 border-t">
                <th scope="row" colSpan={2} className="pt-3 font-normal">
                  Subtotal
                </th>
                <td className="pt-3 text-right">{formatPence(order.subtotalPence)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={2} className="font-normal">
                  {order.fulfilment === "COLLECTION" ? "Collection" : `Delivery (${order.deliveryZoneName})`}
                </th>
                <td className="text-right">{deliveryLine}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={2} className="label pt-2 text-lg">
                  Total
                </th>
                <td className="label pt-2 text-right text-2xl font-semibold">
                  {formatPence(order.totalPence)}
                  {tbc && <span className="text-ink-soft block text-sm font-normal normal-case">+ delivery, to be confirmed</span>}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="border-ink/10 mt-6 grid gap-6 border-t pt-6 sm:grid-cols-2">
            <div>
              <h3 className="label text-ink-soft text-sm">{order.fulfilment === "COLLECTION" ? "Collection" : "Delivery address"}</h3>
              {order.fulfilment === "DELIVERY" ? (
                <address className="mt-1 not-italic">
                  {order.customerName}
                  <br />
                  {order.addressLine1}
                  {order.addressLine2 && (
                    <>
                      <br />
                      {order.addressLine2}
                    </>
                  )}
                  <br />
                  {order.town}
                  <br />
                  {order.postcode}
                </address>
              ) : (
                <p className="mt-1">{settings.collectionInstructions ?? "We'll confirm collection details with you."}</p>
              )}
            </div>
            <div>
              <h3 className="label text-ink-soft text-sm">Payment</h3>
              <p className="mt-1">{paid ? "Paid" : "Awaiting payment — Timber & Flame will arrange this with you."}</p>
            </div>
          </div>
        </div>
      </section>

      {!failed && (
        <section aria-labelledby="h-next" className="bg-cream-200/60 mt-8 rounded-xl p-5 md:p-6">
          <h2 id="h-next" className="label text-lg font-semibold">
            What happens next
          </h2>
          <p className="mt-2 text-lg font-semibold">Timber &amp; Flame will contact you regarding delivery and payment.</p>
          <p className="mt-1 text-lg">
            We&apos;ll be in touch on <strong>{order.phone}</strong>
            {tbc ? " and confirm the delivery charge for your area before anything is delivered" : ""}.
          </p>
          <p className="text-ink-soft mt-2">
            Please keep your order number handy. Questions? Call{" "}
            <a href={`tel:${settings.phoneE164}`} className="text-ember-700 font-semibold underline">
              {settings.phoneDisplay}
            </a>
            .
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href={`tel:${settings.phoneE164}`} className="btn btn-primary min-h-14 text-lg">
              <PhoneIcon className="h-5 w-5" /> Call {settings.phoneDisplay}
            </a>
            <Link href="/shop" className="btn btn-outline min-h-14 text-lg">
              Back to shop
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
