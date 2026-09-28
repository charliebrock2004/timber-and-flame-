import fs from "node:fs";
import path from "node:path";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { Pool } from "pg";
import { E2E_DB, MAIL_DIR, SESSION_SECRET, ADMIN, PORT } from "./env";

export const pool = new Pool({ connectionString: E2E_DB, max: 2 });
export const sql = async <T = Record<string, unknown>>(q: string, params: unknown[] = []) => (await pool.query(q, params)).rows as T[];

/* ── email sink ── */
export type Mail = { to: string; replyTo?: string; subject: string; text: string; html: string };
export function mails(): Mail[] {
  return fs
    .readdirSync(MAIL_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(MAIL_DIR, f), "utf8")));
}
export const mailsFor = (orderNumber: string) => mails().filter((m) => m.subject.includes(orderNumber));
export function setEmailOutage(on: boolean) {
  const f = path.join(MAIL_DIR, "FAIL");
  if (on) fs.writeFileSync(f, "");
  else fs.rmSync(f, { force: true });
}

/* ── admin session (the UI login itself is tested separately) ── */
export async function loginAsAdmin(context: BrowserContext) {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(ADMIN.email)
    .setIssuedAt()
    .setExpirationTime("1h")
    .setAudience("timber-flame-admin")
    .sign(new TextEncoder().encode(SESSION_SECRET));
  await context.addCookies([
    { name: "tf_admin", value: token, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
  ]);
}

/* ── shopping ── */
export async function addToBasket(page: Page, productName: string, qty: number) {
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: productName, exact: true }) });
  const input = card.getByRole("spinbutton");
  for (let i = 1; i < qty; i++) await card.getByRole("button", { name: /Increase/ }).click();
  await expect(input).toHaveValue(String(qty));
  await card.getByRole("button", { name: /Add to basket/ }).click();
  await expect(card.getByText(/in your basket/)).toBeVisible();
}

export type Customer = { name: string; phone: string; email: string; address: string; town: string; postcode: string };
export const CRIEFF_CUSTOMER: Customer = {
  name: "Jamie Crieff",
  phone: "07700 900123",
  email: "jamie.crieff@example.test",
  address: "1 High Street",
  town: "Crieff",
  postcode: "PH7 3AA",
};
export const PERTH_CUSTOMER: Customer = {
  name: "Alex Perth",
  phone: "07700 900456",
  email: "alex.perth@example.test",
  address: "22 South Street",
  town: "Perth",
  postcode: "PH1 5XY",
};

/** Basket → details → delivery → review. Leaves the page on the review step. */
export async function checkoutToReview(page: Page, c: Customer) {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();
  await page.getByLabel("Full name").fill(c.name);
  await page.getByLabel("Phone number").fill(c.phone);
  await page.getByLabel("Email address").fill(c.email);
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Delivery details" })).toBeVisible();
  await page.getByLabel("Postcode").fill(c.postcode);
  await page.getByLabel("House number and street").fill(c.address);
  await page.getByLabel("Town or village").fill(c.town);
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Review your order" })).toBeVisible();
}

/** Places the order and returns its number from the confirmation page. */
export async function placeOrder(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByRole("heading", { name: "Order received" })).toBeVisible();
  const number = (await page.locator("#h-order + p").textContent())!.trim();
  expect(number).toMatch(/^TF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  return number;
}

export const orderByNumber = async (n: string) =>
  (await sql<Record<string, unknown>>("select * from orders where order_number = $1", [n]))[0];

export async function waitForMail(orderNumber: string, count: number) {
  await expect.poll(() => mailsFor(orderNumber).length, { timeout: 15_000 }).toBe(count);
  return mailsFor(orderNumber);
}

export const DOWN = `http://localhost:${PORT + 1}`;

/** Collects browser JS errors for a page; call the returned fn to assert none happened. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return () => expect(errors, errors.join("\n")).toEqual([]);
}
