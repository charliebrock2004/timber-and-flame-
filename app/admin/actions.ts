"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { checkCredentials, endSession, isAdminConfigured, requireAdmin, startSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parsePoundsToPence } from "@/lib/money";
import { resendOrderEmail } from "@/lib/orders";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/* ───────────── Auth ───────────── */

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!isAdminConfigured())
    return { error: "Admin login isn't configured yet. See the README (ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET)." };
  const ip = clientIp(await headers());
  const rl = rateLimit(`login:${ip}`, 5, 15 * 60_000);
  if (!rl.ok) return { error: "Too many attempts. Try again in 15 minutes." };

  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!(await checkCredentials(email, password))) return { error: "Email or password is incorrect." };

  await startSession(email.trim().toLowerCase());
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/* ───────────── Orders ───────────── */

const STATUS = z.enum(schema.orderStatus.enumValues);
const PAYMENT = z.enum(schema.paymentStatus.enumValues);

export async function updateOrderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      status: STATUS,
      paymentStatus: PAYMENT.optional(),
      deliveryCharge: z.string().optional(),
    })
    .safeParse({
      id: form.get("id"),
      status: form.get("status"),
      paymentStatus: form.get("paymentStatus") || undefined,
      deliveryCharge: form.get("deliveryCharge") ?? undefined,
    });
  if (!parsed.success) return { error: "Invalid update." };
  const { id, status, paymentStatus, deliveryCharge } = parsed.data;

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order) return { error: "Order not found." };

  const patch: Partial<typeof schema.orders.$inferInsert> = { status };

  // Card payment status is owned by Stripe — only pay-later orders can be marked manually.
  if (paymentStatus && order.paymentMethod === "PAY_LATER") {
    if (!["AWAITING_PAYMENT", "PAID", "REFUNDED"].includes(paymentStatus)) return { error: "Invalid payment status." };
    patch.paymentStatus = paymentStatus;
  }

  // Owner can confirm a TBC delivery charge after speaking to the customer.
  if (
    deliveryCharge !== undefined &&
    deliveryCharge.trim() !== "" &&
    order.fulfilment === "DELIVERY" &&
    order.paymentMethod === "PAY_LATER"
  ) {
    const pence = parsePoundsToPence(deliveryCharge);
    if (pence === null) return { error: "Delivery charge must be an amount like 5 or 4.50." };
    patch.deliveryChargePence = pence;
    patch.totalPence = order.subtotalPence + pence;
  }

  await db.update(schema.orders).set(patch).where(eq(schema.orders.id, id));
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  return { ok: true, message: "Order updated." };
}

export async function resendOrderEmailAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), which: z.enum(["owner", "customer"]) })
    .safeParse({ id: form.get("id"), which: form.get("which") });
  if (!parsed.success) return { error: "Invalid order." };
  const { id, which } = parsed.data;
  const ok = await resendOrderEmail(id, which);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  const label = which === "owner" ? "Order email to you" : "Confirmation to the customer";
  return ok ? { ok: true, message: `${label} sent.` } : { error: "Couldn't send the email — check the email settings (see README)." };
}

/* ───────────── Products ───────────── */

export async function updateProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().min(1).max(64),
      name: z.string().trim().min(2).max(60),
      shortDescription: z.string().trim().min(5).max(240),
      unitLabel: z.string().trim().min(2).max(30),
      sizeLabel: z.string().trim().max(40),
      price: z.string(),
      image: z
        .string()
        .trim()
        .max(300)
        .refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://"), "Image must be a /path or https:// URL"),
      active: z.boolean(),
      sortOrder: z.coerce.number().int().min(0).max(999),
    })
    .safeParse({
      id: form.get("id"),
      name: form.get("name"),
      shortDescription: form.get("shortDescription"),
      unitLabel: form.get("unitLabel"),
      sizeLabel: form.get("sizeLabel") ?? "",
      price: form.get("price"),
      image: form.get("image") ?? "",
      active: form.get("active") === "on",
      sortOrder: form.get("sortOrder"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  const pricePence = parsePoundsToPence(parsed.data.price);
  if (pricePence === null || pricePence <= 0) return { error: "Price must be an amount like 10 or 3.50." };

  const { id, price: _p, image, sizeLabel, ...rest } = parsed.data;
  const res = await db
    .update(schema.products)
    .set({ ...rest, pricePence, image: image || null, sizeLabel: sizeLabel || null })
    .where(eq(schema.products.id, id))
    .returning({ id: schema.products.id });
  if (!res.length) return { error: "Product not found." };
  refreshPublic();
  return { ok: true, message: `Saved ${rest.name}.` };
}

/* ───────────── Delivery zones ───────────── */

export async function updateZoneAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const chargeRaw = String(form.get("charge") ?? "").trim();
  const prefixesRaw = String(form.get("prefixes") ?? "");
  const enabled = form.get("enabled") === "on";

  if (name.length < 2 || name.length > 40) return { error: "Zone name must be 2–40 characters." };
  let chargePence: number | null = null;
  if (chargeRaw !== "") {
    chargePence = parsePoundsToPence(chargeRaw);
    if (chargePence === null) return { error: "Charge must be an amount like 0, 5 or 4.50 — or blank for ‘to be confirmed’." };
  }
  const prefixes = prefixesRaw
    .split(/[,\n]/)
    .map((p) => p.toUpperCase().replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (prefixes.some((p) => !/^[A-Z]{1,2}\d[A-Z\d]?( \d)?$/.test(p)))
    return { error: "Postcode prefixes should look like PH7 or PH7 3 (comma separated)." };

  const res = await db
    .update(schema.deliveryZones)
    .set({ name, description: description || null, chargePence, postcodePrefixes: prefixes, enabled })
    .where(eq(schema.deliveryZones.id, id))
    .returning({ id: schema.deliveryZones.id });
  if (!res.length) return { error: "Zone not found." };
  refreshPublic();
  return { ok: true, message: `Saved ${name}.` };
}

/* ───────────── Settings ───────────── */

export async function updateSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const opt = (max: number) =>
    z
      .string()
      .trim()
      .max(max)
      .transform((v) => v || null);
  const parsed = z
    .object({
      phoneDisplay: z.string().trim().min(10).max(20),
      phoneE164: z
        .string()
        .trim()
        .regex(/^\+44\d{9,10}$/, "Phone (international) must look like +447535759768"),
      contactEmail: z.union([z.literal(""), z.email()]).transform((v) => v || null),
      addressLine: opt(160),
      openingHours: opt(400),
      standLocation: opt(200),
      collectionInstructions: opt(400),
      announcement: opt(160),
      payLaterEnabled: z.boolean(),
      collectionEnabled: z.boolean(),
    })
    .safeParse({
      phoneDisplay: form.get("phoneDisplay"),
      phoneE164: form.get("phoneE164"),
      contactEmail: String(form.get("contactEmail") ?? "").trim(),
      addressLine: form.get("addressLine") ?? "",
      openingHours: form.get("openingHours") ?? "",
      standLocation: form.get("standLocation") ?? "",
      collectionInstructions: form.get("collectionInstructions") ?? "",
      announcement: form.get("announcement") ?? "",
      payLaterEnabled: form.get("payLaterEnabled") === "on",
      collectionEnabled: form.get("collectionEnabled") === "on",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };

  await db.update(schema.siteSettings).set(parsed.data).where(eq(schema.siteSettings.id, 1));
  refreshPublic();
  return { ok: true, message: "Settings saved." };
}

/** Make public pages show the change immediately — no rebuild. */
function refreshPublic() {
  revalidatePath("/", "layout");
}
