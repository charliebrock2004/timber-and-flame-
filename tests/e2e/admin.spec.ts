import { test, expect } from "@playwright/test";
import { addToBasket, checkoutToReview, CRIEFF_CUSTOMER, loginAsAdmin, orderByNumber, placeOrder, sql } from "./helpers";
import { ADMIN } from "./env";

test("admin pages require login", async ({ page, request }) => {
  for (const path of ["/admin", "/admin/products", "/admin/delivery", "/admin/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
  const res = await request.get("/admin", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
});

test("login rejects a wrong password and accepts the right one", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  const cookie = (await page.context().cookies()).find((c) => c.name === "tf_admin")!;
  expect(cookie.httpOnly).toBe(true);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("owner moves an order through its statuses and marks it paid manually", async ({ page, context }) => {
  await page.goto("/shop");
  await addToBasket(page, "Netted Bag of Kindling", 2);
  await checkoutToReview(page, { ...CRIEFF_CUSTOMER, name: "Status Flow" });
  const number = await placeOrder(page);
  expect((await orderByNumber(number)).payment_status).toBe("AWAITING_PAYMENT");

  await loginAsAdmin(context);
  await page.goto("/admin");
  await page.getByRole("link", { name: number }).click();
  await expect(page.getByText("Status Flow")).toBeVisible();
  await expect(page.getByText("2 × Netted Bag of Kindling")).toBeVisible();
  await expect(page.getByText("Included in Crieff")).toBeVisible();

  const options = await page.getByLabel("Order status").locator("option").allTextContents();
  expect(options).toEqual(["New", "Preparing", "Out for delivery", "Completed", "Cancelled"]);
  expect(await page.getByLabel("Payment received?").locator("option").allTextContents()).toEqual(["Awaiting payment", "Paid", "Refunded"]);

  for (const [label, value] of [
    ["Preparing", "PREPARING"],
    ["Out for delivery", "OUT_FOR_DELIVERY"],
    ["Completed", "COMPLETED"],
  ] as const) {
    await page.getByLabel("Order status").selectOption({ label });
    await page.getByRole("button", { name: "Update order" }).click();
    await expect(page.getByText("Order updated.")).toBeVisible();
    await expect.poll(async () => (await orderByNumber(number)).status).toBe(value);
    // Changing status never changes payment on its own.
    expect((await orderByNumber(number)).payment_status).toBe("AWAITING_PAYMENT");
    await page.reload();
  }
  await page.getByLabel("Payment received?").selectOption({ label: "Paid" });
  await page.getByRole("button", { name: "Update order" }).click();
  await expect.poll(async () => (await orderByNumber(number)).payment_status).toBe("PAID");
  await page.goto("/admin");
  await expect(page.getByRole("row").filter({ hasText: number })).toContainText("Paid");
  await expect(page.getByRole("row").filter({ hasText: number })).toContainText("Completed");
});

test("owner confirms an outside-Crieff delivery charge on the order", async ({ page, context }) => {
  await page.goto("/shop");
  await addToBasket(page, "Road Salt", 1);
  await checkoutToReview(page, { ...CRIEFF_CUSTOMER, name: "Charge Later", postcode: "PH1 5XY", town: "Perth" });
  const number = await placeOrder(page);
  await loginAsAdmin(context);
  await page.goto(`/admin/orders/${(await orderByNumber(number)).id}`);
  await expect(page.getByText("Outside Crieff — delivery charge to be confirmed")).toBeVisible();
  await page.getByLabel("Delivery charge (£)").fill("3.50");
  await page.getByRole("button", { name: "Update order" }).click();
  await expect.poll(async () => (await orderByNumber(number)).total_pence).toBe(850);
  expect((await orderByNumber(number)).delivery_charge_pence).toBe(350);
});

test("product edits in admin go live on the site and at checkout", async ({ page, context }) => {
  await loginAsAdmin(context);
  try {
    await page.goto("/admin/products");
    const form = page.locator("section").filter({ has: page.locator('input[value="kindling"]') });
    await form.getByLabel("Price delivered in Crieff (£)").fill("7.50");
    await form.getByLabel("Short description").fill("Dry kindling in a netted bag — test edit.");
    await form.getByLabel("Size (optional)").fill("75cm × 45cm");
    await form.getByRole("button", { name: /Save/ }).click();
    await expect(form.getByText("Saved Netted Bag of Kindling.")).toBeVisible();

    await page.goto("/shop");
    const card = page.locator("article").filter({ hasText: "Netted Bag of Kindling" });
    await expect(card.getByText("£7.50", { exact: true }).first()).toBeVisible();
    await expect(card.getByText("1 × £7.50 = £7.50")).toBeVisible();
    await expect(card.getByText("Dry kindling in a netted bag — test edit.")).toBeVisible();

    // Availability: switch off → gone from the shop.
    await page.goto("/admin/products");
    await form.getByLabel("Available to order online").uncheck();
    await form.getByRole("button", { name: /Save/ }).click();
    await expect(form.getByText("Saved Netted Bag of Kindling.")).toBeVisible();
    await page.goto("/shop");
    await expect(page.locator("article")).toHaveCount(2);
    await page.goto("/admin/products");
    await form.getByLabel("Available to order online").check();
    await form.getByRole("button", { name: /Save/ }).click();
    await expect(form.getByText("Saved Netted Bag of Kindling.")).toBeVisible();

    // Checkout charges the new database price.
    await page.goto("/shop");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await addToBasket(page, "Netted Bag of Kindling", 2);
    await checkoutToReview(page, { ...CRIEFF_CUSTOMER, name: "New Price" });
    const number = await placeOrder(page);
    expect((await orderByNumber(number)).total_pence).toBe(1500);
  } finally {
    await sql(
      "update products set price_pence = 700, active = true, short_description = 'Dry kindling supplied in a 75cm × 45cm netted bag.' where id = 'kindling'",
    );
    // Refresh cached public pages through the real admin path.
    await page.goto("/admin/products");
    const form = page.locator("section").filter({ has: page.locator('input[value="kindling"]') });
    await form.getByRole("button", { name: /Save/ }).click();
    await expect(form.getByText("Saved Netted Bag of Kindling.")).toBeVisible();
  }
  await page.goto("/shop");
  await expect(
    page.locator("article").filter({ hasText: "Netted Bag of Kindling" }).getByText("£7", { exact: true }).first(),
  ).toBeVisible();
});

test("delivery zones and settings pages load from the database", async ({ page, context }) => {
  await loginAsAdmin(context);
  await page.goto("/admin/delivery");
  await expect(page.getByLabel("Zone name").first()).toHaveValue("Crieff");
  await expect(page.getByLabel("Postcode prefixes (comma separated)").first()).toHaveValue("PH7");
  await expect(page.getByLabel("Charge (£)").nth(1)).toHaveValue("");
  await page.goto("/admin/settings");
  await expect(page.getByLabel("Business email")).toHaveValue("timberflame84@gmail.com");
  await expect(page.getByLabel("Phone (as shown)")).toHaveValue("07535 759768");
  await expect(page.getByText(/ON — new orders go to timberflame84@gmail.com/)).toBeVisible();
});
