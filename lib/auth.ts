import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

/**
 * Admin login is configured entirely through environment variables:
 *   ADMIN_EMAIL          the owner's login email
 *   ADMIN_PASSWORD_HASH  bcrypt hash (generate with `npm run admin:hash`)
 *   SESSION_SECRET       32+ random characters
 * There is no default password. If any are missing, login is disabled.
 */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && passwordHash() && (process.env.SESSION_SECRET?.length ?? 0) >= 32);
}

/** Accept the raw bcrypt hash, or base64 of it (avoids `$` escaping in .env files). */
function passwordHash(): string | null {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!raw) return null;
  if (raw.startsWith("$2")) return raw;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return decoded.startsWith("$2") ? decoded : null;
  } catch {
    return null;
  }
}

// A real bcrypt hash of random bytes, so failed-email logins cost the same time.
const DUMMY_HASH = "$2b$12$hR1u69QTU4BQK0qqmEaiF.LJHvVipdkXW6AICQPIOMb6IStTVl4n2";

export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = passwordHash();
  if (!expectedEmail || !hash) return false;
  const a = Buffer.from(email.trim().toLowerCase());
  const b = Buffer.from(expectedEmail);
  const emailOk = a.length === b.length && timingSafeEqual(a, b);
  const passOk = await bcrypt.compare(password, emailOk ? hash : DUMMY_HASH);
  return emailOk && passOk;
}

export async function startSession(email: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Call at the top of EVERY admin page and server action. */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  return session;
}
