import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { OrderWithItems } from "@/db/schema";
import { formatPence } from "./money";
import { BRAND } from "@/config/business";
import { siteUrl } from "./site";
import { deliveryKind, deliveryLineValue, deliveryStatusText, formatOrderDate, STATUS_LABELS } from "./order-format";

/* ─────────────────────────── Transport ───────────────────────────
 * Configure ONE of these (checked in this order):
 *
 * 1. Gmail (simplest — sends from the business's own Gmail):
 *      GMAIL_USER=timberflame84@gmail.com
 *      GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (Google Account → Security →
 *                                                2-Step Verification → App passwords)
 * 2. Any SMTP server:
 *      SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS, [SMTP_SECURE=false for 587/25]
 * 3. Resend (needs a verified sending domain):
 *      RESEND_API_KEY, ORDER_EMAIL_FROM
 *
 * Optional: ORDER_EMAIL_FROM  — "From" header (defaults to the SMTP/Gmail user)
 *           ORDER_NOTIFICATION_EMAIL — where new orders go (defaults to the
 *           business email in /admin/settings: timberflame84@gmail.com)
 * If nothing is configured, orders are still saved and shown in /admin.
 */

type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string };

export function emailProvider(): "gmail" | "smtp" | "resend" | null {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.SMTP_HOST && process.env.SMTP_USER !== undefined) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM) return "resend";
  return null;
}

let transport: Transporter | null = null;
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 };

function smtp(): Transporter {
  if (transport) return transport;
  if (emailProvider() === "gmail") {
    transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
      ...TIMEOUTS,
    });
  } else {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      ...TIMEOUTS,
    });
  }
  return transport;
}

function fromAddress(): string {
  if (process.env.ORDER_EMAIL_FROM) return process.env.ORDER_EMAIL_FROM;
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || "orders@localhost";
  return `"${BRAND.name}" <${user}>`;
}

async function send(mail: Mail): Promise<boolean> {
  const provider = emailProvider();
  if (!provider) {
    console.warn(`[email] not configured — skipped "${mail.subject}" to ${mail.to}`);
    return false;
  }
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress(),
          to: [mail.to],
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
    } else {
      await smtp().sendMail({
        from: fromAddress(),
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        replyTo: mail.replyTo,
      });
    }
    return true;
  } catch (e) {
    console.error(`[email] send failed "${mail.subject}" to ${mail.to}:`, (e as Error).message);
    return false;
  }
}

/* ─────────────────────────── Content ─────────────────────────── */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function totalText(o: OrderWithItems): string {
  return deliveryKind(o) === "tbc" ? `${formatPence(o.totalPence)} + delivery (to be confirmed)` : formatPence(o.totalPence);
}

function paymentText(o: OrderWithItems): string {
  return o.paymentStatus === "PAID" ? "Paid" : o.paymentStatus === "REFUNDED" ? "Refunded" : "Awaiting payment";
}

function addressLines(o: OrderWithItems): { address: string; town: string; postcode: string } {
  return {
    address: [o.addressLine1, o.addressLine2].filter(Boolean).join(", ") || "—",
    town: o.town ?? "—",
    postcode: o.postcode ?? "—",
  };
}

function itemsTable(o: OrderWithItems): string {
  const cell = "padding:6px 8px;border-bottom:1px solid #e9dfd3;";
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="${cell}">${esc(i.productName)}</td><td style="${cell}text-align:center">${i.quantity}</td><td style="${cell}text-align:right">${formatPence(i.unitPricePence)}</td><td style="${cell}text-align:right">${formatPence(i.lineTotalPence)}</td></tr>`,
    )
    .join("");
  const foot = (label: string, value: string, bold = false) =>
    `<tr><td colspan="3" style="padding:6px 8px;text-align:right;${bold ? "font-weight:bold" : ""}">${label}</td><td style="padding:6px 8px;text-align:right;${bold ? "font-weight:bold" : ""}">${esc(value)}</td></tr>`;
  return `<table style="border-collapse:collapse;width:100%;max-width:560px;font-size:15px">
<thead><tr style="background:#2a2624;color:#f4ede4"><th style="padding:6px 8px;text-align:left">Product</th><th style="padding:6px 8px">Quantity</th><th style="padding:6px 8px;text-align:right">Unit price</th><th style="padding:6px 8px;text-align:right">Line total</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot>${foot("Subtotal", formatPence(o.subtotalPence))}${foot("Delivery", deliveryLineValue(o))}${foot("Total", totalText(o), true)}</tfoot></table>`;
}

const wrap = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;color:#2e1510;line-height:1.5;max-width:600px">${inner}<p style="color:#5b4238;font-size:13px;margin-top:24px">${esc(BRAND.name)} · ${BRAND.town}, ${BRAND.region}</p></div>`;

const h = (t: string) => `<h3 style="margin:20px 0 6px;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#7e1e24">${t}</h3>`;

/** Business notification: everything needed to deliver and get paid. */
export function ownerEmail(o: OrderWithItems, to: string): Mail {
  const a = addressLines(o);
  const itemLines = o.items.map(
    (i) =>
      `  ${i.productName}\n    Quantity: ${i.quantity}   Unit price: ${formatPence(i.unitPricePence)}   Line total: ${formatPence(i.lineTotalPence)}`,
  );
  const text = [
    "NEW ORDER",
    "",
    `Order number: ${o.orderNumber}`,
    `Date/time: ${formatOrderDate(o.createdAt)}`,
    "",
    "CUSTOMER",
    `Name: ${o.customerName}`,
    `Phone: ${o.phone}`,
    `Email: ${o.email}`,
    "",
    o.fulfilment === "COLLECTION" ? "COLLECTION" : "DELIVERY",
    ...(o.fulfilment === "DELIVERY" ? [`Address: ${a.address}`, `Town: ${a.town}`, `Postcode: ${a.postcode}`] : ["Customer will collect"]),
    "",
    "ORDER",
    ...itemLines,
    "",
    `SUBTOTAL: ${formatPence(o.subtotalPence)}`,
    `DELIVERY: ${deliveryLineValue(o)}`,
    `TOTAL: ${totalText(o)}`,
    "",
    "DELIVERY STATUS:",
    deliveryStatusText(o),
    "",
    "PAYMENT STATUS:",
    paymentText(o),
    "",
    "ORDER STATUS:",
    STATUS_LABELS[o.status],
    ...(o.notes ? ["", "CUSTOMER NOTES:", o.notes] : []),
    "",
    `Manage this order: ${siteUrl()}/admin/orders/${o.id}`,
  ].join("\n");

  const html = wrap(`
<h2 style="margin:0 0 4px;font-size:22px">NEW ORDER</h2>
<p style="margin:0"><strong>Order number:</strong> ${esc(o.orderNumber)}<br><strong>Date/time:</strong> ${esc(formatOrderDate(o.createdAt))}</p>
${h("Customer")}
<p style="margin:0"><strong>Name:</strong> ${esc(o.customerName)}<br><strong>Phone:</strong> <a href="tel:${esc(o.phone.replace(/[^\d+]/g, ""))}">${esc(o.phone)}</a><br><strong>Email:</strong> <a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>
${h(o.fulfilment === "COLLECTION" ? "Collection" : "Delivery")}
<p style="margin:0">${o.fulfilment === "DELIVERY" ? `<strong>Address:</strong> ${esc(a.address)}<br><strong>Town:</strong> ${esc(a.town)}<br><strong>Postcode:</strong> ${esc(a.postcode)}` : "Customer will collect"}</p>
${h("Order")}
${itemsTable(o)}
${h("Delivery status")}
<p style="margin:0;font-weight:bold">${esc(deliveryStatusText(o))}</p>
${h("Payment status")}
<p style="margin:0;font-weight:bold">${esc(paymentText(o))}</p>
${h("Order status")}
<p style="margin:0;font-weight:bold">${esc(STATUS_LABELS[o.status])}</p>
${o.notes ? `${h("Customer notes")}<p style="margin:0;white-space:pre-line">${esc(o.notes)}</p>` : ""}
<p style="margin-top:20px"><a href="${siteUrl()}/admin/orders/${o.id}" style="background:#7e1e24;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Manage this order</a></p>`);

  return { to, subject: `New Timber & Flame Order #${o.orderNumber}`, text, html, replyTo: o.email };
}

/** Customer confirmation. Never says the order has been paid unless it has. */
export function customerEmail(o: OrderWithItems, phoneDisplay: string, businessEmail: string | null): Mail {
  const a = addressLines(o);
  const received = "Your order has been received. Timber & Flame will contact you regarding delivery and payment.";
  const text = [
    `Hi ${o.customerName.split(" ")[0]},`,
    "",
    "Thank you for your order.",
    "",
    `Order number: ${o.orderNumber}`,
    "",
    ...o.items.map((i) => `${i.quantity} × ${i.productName} @ ${formatPence(i.unitPricePence)} = ${formatPence(i.lineTotalPence)}`),
    "",
    `Subtotal: ${formatPence(o.subtotalPence)}`,
    `Delivery: ${deliveryKind(o) === "tbc" ? "Small delivery charge may apply — we'll confirm this with you" : deliveryLineValue(o)}`,
    `Total: ${totalText(o)}`,
    "",
    o.fulfilment === "DELIVERY" ? `Delivery address: ${[a.address, a.town, a.postcode].join(", ")}` : "Collection",
    "",
    received,
    "",
    `Questions? Call ${phoneDisplay}${businessEmail ? ` or email ${businessEmail}` : ""}.`,
    `View your order: ${siteUrl()}/order/${o.accessToken}`,
    "",
    BRAND.name,
    `${BRAND.town}, ${BRAND.region}`,
  ].join("\n");

  const html = wrap(`
<h2 style="margin:0 0 4px;font-size:22px">Thank you for your order.</h2>
<p style="margin:0 0 12px"><strong>Order number:</strong> ${esc(o.orderNumber)}</p>
${itemsTable(o)}
${deliveryKind(o) === "tbc" ? `<p style="margin:10px 0 0">Small delivery charge may apply — we'll confirm this with you.</p>` : ""}
${o.fulfilment === "DELIVERY" ? `${h("Delivery address")}<p style="margin:0">${esc(a.address)}<br>${esc(a.town)}<br>${esc(a.postcode)}</p>` : ""}
<p style="margin:20px 0 0;font-weight:bold">${esc(received)}</p>
<p style="margin:12px 0 0">Questions? Call <a href="tel:${esc(phoneDisplay.replace(/\s/g, ""))}">${esc(phoneDisplay)}</a>${businessEmail ? ` or email <a href="mailto:${esc(businessEmail)}">${esc(businessEmail)}</a>` : ""}.</p>
<p style="margin:12px 0 0"><a href="${siteUrl()}/order/${esc(o.accessToken)}">View your order online</a></p>`);

  return {
    to: o.email,
    subject: `Timber & Flame Order #${o.orderNumber}`,
    text,
    html,
    ...(businessEmail ? { replyTo: businessEmail } : {}),
  };
}

/** Where business notifications go: env override, else the business email in settings. */
export function ownerRecipient(settingsEmail: string | null): string | null {
  return process.env.ORDER_NOTIFICATION_EMAIL?.trim() || settingsEmail || null;
}

export async function sendOwnerNotification(o: OrderWithItems, settingsEmail: string | null): Promise<boolean> {
  const to = ownerRecipient(settingsEmail);
  if (!to) {
    console.warn("[email] no business email set — owner not emailed for", o.orderNumber);
    return false;
  }
  return send(ownerEmail(o, to));
}

export async function sendCustomerConfirmation(o: OrderWithItems, phoneDisplay: string, businessEmail: string | null): Promise<boolean> {
  return send(customerEmail(o, phoneDisplay, businessEmail));
}
