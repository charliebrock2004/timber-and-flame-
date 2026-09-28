import { test, expect } from "@playwright/test";
import { addToBasket, sql, trackErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("database holds exactly the three current products", async () => {
  const rows = await sql<{ id: string; name: string; price_pence: number; size_label: string | null; active: boolean }>(
    "select id, name, price_pence, size_label, active from products where active order by sort_order",
  );
  expect(rows).toEqual([
    { id: "seasoned-firewood", name: "Seasoned Firewood", price_pence: 1000, size_label: null, active: true },
    { id: "kindling", name: "Netted Bag of Kindling", price_pence: 700, size_label: "75cm × 45cm", active: true },
    { id: "road-salt", name: "Road Salt", price_pence: 500, size_label: null, active: true },
  ]);
});

test("homepage shows the business, products and delivery promise", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Shop now/ })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
  await expect(page.getByText("Free / included delivery in Crieff").first()).toBeVisible();
  await expect(page.getByText("Small delivery charge may apply outside Crieff.").first()).toBeVisible();
  noErrors();
});

test("shop cards: name, size, per-bag price, delivery wording", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  const cards = page.locator("article");
  await expect(cards).toHaveCount(3);
  const expectations = [
    ["Seasoned Firewood", null, "£10"],
    ["Netted Bag of Kindling", "75cm × 45cm", "£7"],
    ["Road Salt", null, "£5"],
  ] as const;
  for (const [i, [name, size, price]] of expectations.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole("heading", { name })).toBeVisible();
    if (size) await expect(card.getByText(`Bag size: ${size}`)).toBeVisible();
    await expect(card.getByText(price, { exact: true }).first()).toBeVisible();
    await expect(card.getByText("per bag", { exact: true })).toBeVisible();
    await expect(card.getByText("Delivery included in Crieff")).toBeVisible();
    await expect(card.getByText(`1 × ${price} = ${price}`)).toBeVisible();
  }
  noErrors();
});

test("quantity shows the multiplication, not a misleading single price", async ({ page }) => {
  await page.goto("/shop");
  const card = page.locator("article").first();
  await card.getByRole("button", { name: /Increase/ }).click();
  await card.getByRole("button", { name: /Increase/ }).click();
  await expect(card.getByText("3 × £10 = £30")).toBeVisible();
  await card.getByRole("button", { name: /Decrease/ }).click();
  await expect(card.getByText("2 × £10 = £20")).toBeVisible();
  await expect(card.getByRole("button", { name: /Decrease/ })).toBeEnabled();
  await card.getByRole("button", { name: /Decrease/ }).click();
  await expect(card.getByRole("button", { name: /Decrease/ })).toBeDisabled();
});

test("basket: mixed items, increase, decrease, remove, totals, postcode check", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  await addToBasket(page, "Seasoned Firewood", 3);
  await addToBasket(page, "Netted Bag of Kindling", 2);
  await addToBasket(page, "Road Salt", 1);
  await page.goto("/basket");

  await expect(page.getByText("3 × £10.00 = £30.00")).toBeVisible();
  await expect(page.getByText("2 × £7.00 = £14.00")).toBeVisible();
  await expect(page.getByText("1 × £5.00 = £5.00")).toBeVisible();
  await expect(page.getByText("Subtotal (6 bags)")).toBeVisible();
  const summary = page.getByRole("complementary");
  await expect(summary.getByText("£49.00")).toBeVisible();

  await page.getByRole("button", { name: "Increase Road Salt quantity" }).click();
  await expect(page.getByText("2 × £5.00 = £10.00")).toBeVisible();
  await page.getByRole("button", { name: "Decrease Seasoned Firewood quantity" }).click();
  await expect(page.getByText("2 × £10.00 = £20.00")).toBeVisible();
  await page.getByRole("button", { name: "Remove Netted Bag of Kindling from basket" }).click();
  await expect(page.getByText("Netted Bag of Kindling")).toHaveCount(0);
  await expect(page.getByText("Subtotal (4 bags)")).toBeVisible();
  await expect(summary.getByText("£30.00")).toBeVisible();

  const postcode = page.getByLabel("Check delivery to your postcode");
  await postcode.fill("ph7 3aa");
  await expect(page.getByText("Crieff — delivery included")).toBeVisible();
  await postcode.fill("PH1 5XY");
  await expect(page.getByText("Small delivery charge may apply — we'll confirm this with you.")).toBeVisible();
  await expect(summary.getByText("To be confirmed")).toBeVisible();

  // Basket survives a reload (localStorage holds only ids + quantities).
  await page.reload();
  await expect(page.getByText("Subtotal (4 bags)")).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("tf-basket-v1"));
  expect(JSON.parse(stored!)).toEqual({ "seasoned-firewood": 2, "road-salt": 2 });
  noErrors();
});

test("empty basket and checkout say so", async ({ page }) => {
  await page.goto("/basket");
  await expect(page.getByRole("heading", { name: "Your basket is empty" })).toBeVisible();
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Your basket is empty" })).toBeVisible();
});
