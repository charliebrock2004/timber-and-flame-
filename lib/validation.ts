import { z } from "zod";
import { ORDER_LIMITS } from "@/config/catalog";
import { rules } from "./checkout-rules";

/** Wrap a shared rule so zod reports the same message the browser shows. */
const ruled = (rule: (v: string) => string | null, max: number) =>
  z
    .string()
    .max(max * 2)
    .superRefine((v, ctx) => {
      const msg = rule(v);
      if (msg) ctx.addIssue({ code: "custom", message: msg });
    })
    .transform((v) => v.trim());

export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(64),
          quantity: z.number().int().min(1).max(ORDER_LIMITS.maxQuantityPerLine),
        }),
      )
      .min(1, "Your basket is empty")
      .max(ORDER_LIMITS.maxLines),
    fulfilment: z.enum(["DELIVERY", "COLLECTION"]),
    /** Online payment isn't live yet — orders are placed and paid for later. */
    paymentMethod: z.enum(["CARD", "PAY_LATER"]).default("PAY_LATER"),
    customerName: ruled(rules.customerName, 80),
    phone: ruled(rules.phone, 20),
    email: z
      .string()
      .max(240)
      .superRefine((v, ctx) => {
        const msg =
          rules.email(v) ?? (z.email().safeParse(v.trim()).success ? null : "Please enter a valid email address, e.g. name@example.com");
        if (msg) ctx.addIssue({ code: "custom", message: msg });
      })
      .transform((v) => v.trim().toLowerCase()),
    addressLine1: z.string().max(240).optional().default(""),
    addressLine2: z.string().trim().max(120).optional().default(""),
    town: z.string().max(120).optional().default(""),
    postcode: z.string().max(20).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
    /** Honeypot — real people never fill this in. */
    website: z.string().max(0).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment === "DELIVERY") {
      for (const f of ["addressLine1", "town", "postcode"] as const) {
        const msg = rules[f](v[f]);
        if (msg) ctx.addIssue({ code: "custom", path: [f], message: msg });
      }
    }
    const ids = v.items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["items"], message: "Duplicate items" });
  })
  .transform((v) => ({
    ...v,
    addressLine1: v.addressLine1.trim(),
    town: v.town.trim(),
    postcode: v.postcode.trim(),
  }));

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Flatten zod issues into { field: message } for the form. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
