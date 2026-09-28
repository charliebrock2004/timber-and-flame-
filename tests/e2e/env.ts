/**
 * Settings shared by the e2e prepare step, the Playwright config and the tests.
 * The suite resets the database it points at, so it refuses to run against
 * anything but a local database.
 */
import os from "node:os";
import path from "node:path";

export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgres://tf:tf@127.0.0.1:5432/tf_e2e";
const host = new URL(E2E_DB).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  throw new Error(`E2E_DATABASE_URL must point at a local database (got host "${host}") — the e2e suite wipes it.`);
}

export const PORT = 3100;
export const DOWN_PORT = 3101; // same build, database unreachable
export const SMTP_PORT = 2526;
export const MAIL_DIR = path.join(os.tmpdir(), "tf-e2e-mail");
export const BASE = `http://localhost:${PORT}`;
export const BUSINESS_EMAIL = "timberflame84@gmail.com";

export const ADMIN = { email: "owner@example.test", password: "e2e-owner-password-123" };
// Test-only values, never used outside this suite.
export const SESSION_SECRET = "e2e-session-secret-e2e-session-secret-0123";
// base64 of a bcrypt hash of ADMIN.password — the format `npm run admin:hash` prints.
// (A raw "$2b$…" hash gets mangled by Next.js env expansion whenever a .env file exists.)
export const ADMIN_PASSWORD_HASH = "JDJiJDEwJGhHd29UbU5ROXRBeEVhckpnT3IvZ2Vvc1hrMUl0WDVkV3ptWUxEUVlEMGpibzdCYllmbkhx";

export function serverEnv(databaseUrl: string): Record<string, string> {
  return {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: BASE,
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD_HASH,
    SESSION_SECRET,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(SMTP_PORT),
    SMTP_SECURE: "false",
    SMTP_USER: "orders@example.test",
    SMTP_PASS: "x",
    ORDER_EMAIL_FROM: '"Timber & Flame Firewood" <orders@example.test>',
    // Clear anything a developer's own .env might set.
    GMAIL_USER: "",
    GMAIL_APP_PASSWORD: "",
    RESEND_API_KEY: "",
    ORDER_NOTIFICATION_EMAIL: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    CHECKOUT_RATE_LIMIT: "1000",
  };
}
