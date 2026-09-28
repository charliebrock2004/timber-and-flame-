import { test, expect } from "@playwright/test";
import { DOWN, sql } from "./helpers";
import { DOWN_PORT } from "./env";

/**
 * The server on DOWN_PORT runs the same build, but its database is
 * unreachable. Nothing may show a config-default price as if live, the
 * basket and checkout must refuse, and no order may be created.
 */
test.use({ baseURL: DOWN });

test.beforeEach(async ({ page }) => {
  await page.goto("/robots.txt");
  await page.evaluate(() => localStorage.setItem("tf-basket-v1", JSON.stringify({ "seasoned-firewood": 3 })));
});

for (const path of ["/basket", "/checkout"]) {
  test(`${path} shows a clear error and no prices`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res!.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Online ordering is temporarily unavailable" })).toBeVisible();
    await expect(page.getByText("Nothing has been ordered")).toBeVisible();
    await expect(page.getByRole("link", { name: /Call 07535 759768/ }).first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText("£");
    await expect(page.getByRole("button", { name: /Place order|Continue to delivery/ })).toHaveCount(0);
    // No price anywhere in the document — not the basket bar, not structured data.
    expect(await page.content()).not.toContain("£");
  });
}

test("placing an order fails safely: 503, clear message, nothing saved", async ({ request }) => {
  const before = (await sql<{ n: number }>("select count(*)::int n from orders"))[0].n;
  const res = await request.post("/api/checkout", {
    headers: { origin: `http://localhost:${DOWN_PORT}` },
    data: {
      items: [{ productId: "seasoned-firewood", quantity: 1 }],
      fulfilment: "DELIVERY",
      customerName: "Down Test",
      phone: "07700 900111",
      email: "down@example.test",
      addressLine1: "1 High Street",
      town: "Crieff",
      postcode: "PH7 3AA",
    },
  });
  expect(res.status()).toBe(503);
  const body = await res.json();
  expect(body.error).toContain("nothing has been ordered");
  expect(body.error).toContain("07535 759768");
  expect(body.redirectUrl).toBeUndefined();
  expect((await sql<{ n: number }>("select count(*)::int n from orders"))[0].n).toBe(before);
});

test("pages built from the database never fall back to config prices", async ({ page }) => {
  // Home and shop are pre-rendered from the database at build time. With the
  // database down they either show that last database render or the error
  // page — never the defaults in config/catalog.ts. Prove the difference: the
  // down server must match what the live database says.
  const [{ price_pence }] = await sql<{ price_pence: number }>("select price_pence from products where id = 'seasoned-firewood'");
  await page.goto("/shop");
  const unavailable = await page.getByRole("heading", { name: "Online ordering is temporarily unavailable" }).count();
  if (!unavailable)
    await expect(
      page
        .locator("article")
        .first()
        .getByText(`£${price_pence / 100}`, { exact: true })
        .first(),
    ).toBeVisible();
});

test("contact details still reachable during an outage", async ({ page }) => {
  await page.goto("/contact");
  expect(await page.locator('a[href="tel:+447535759768"]').count()).toBeGreaterThan(0);
});
