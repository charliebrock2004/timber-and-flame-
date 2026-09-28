/**
 * Field rules shared by the browser (instant feedback) and the server
 * (authoritative check). Pure functions, no dependencies — safe to bundle.
 * Each returns an error message, or null when the value is fine.
 */
import { normalisePostcode } from "./delivery";

/** "07700 900 123", "+44 7700 900123", "(01764) 123456" → "07700900123" */
export function normaliseUkPhone(raw: string): string {
  let v = raw.replace(/[\s().-]/g, "");
  if (v.startsWith("+44")) v = "0" + v.slice(3).replace(/^0/, "");
  else if (v.startsWith("0044")) v = "0" + v.slice(4).replace(/^0/, "");
  return v;
}

/**
 * Email pattern (the same one zod uses for z.email()). This single rule is the
 * only email check on both the browser and the server, so they always agree.
 */
const EMAIL = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export const rules = {
  customerName(v: string): string | null {
    const t = v.trim();
    if (t.length < 2) return "Please enter your full name";
    if (t.length > 80) return "That name is too long";
    return null;
  },
  phone(v: string): string | null {
    if (!v.trim()) return "Please enter a phone number so we can arrange delivery";
    const n = normaliseUkPhone(v);
    // UK: mobiles 07 + 9 digits; landlines / 03 / 08 are 10–11 digits in total.
    if (!/^0(7\d{9}|[1238]\d{8,9})$/.test(n)) return "Please enter a valid UK phone number, e.g. 07700 900123";
    return null;
  },
  email(v: string): string | null {
    const t = v.trim();
    if (!t) return "Please enter your email address";
    if (t.length > 120 || !EMAIL.test(t)) return "Please enter a valid email address, e.g. name@example.com";
    return null;
  },
  addressLine1(v: string): string | null {
    const t = v.trim();
    if (t.length < 3) return "Please enter your house number and street";
    if (t.length > 120) return "That address line is too long";
    return null;
  },
  town(v: string): string | null {
    const t = v.trim();
    if (t.length < 2) return "Please enter your town or village";
    if (t.length > 60) return "That town name is too long";
    return null;
  },
  postcode(v: string): string | null {
    if (!v.trim()) return "Please enter your postcode";
    return normalisePostcode(v) ? null : "Please enter a valid UK postcode, e.g. PH7 3AA";
  },
};

export type RuleField = keyof typeof rules;
