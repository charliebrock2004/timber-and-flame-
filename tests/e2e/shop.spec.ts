import { test, expect } from "@playwright/test";
import { addToBasket, sql, trackErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("database holds exactly the four current products", async () => {
  const rows = await sql<{ id: string; name: string; price_pence: number; size_label: string | null; active: boolean }>(
    "select id, name, price_pence, size_label, active from products where active order by sort_order",
  );
  expect(rows).toEqual([
    { id: "seasoned-firewood", name: "Seasoned Firewood", price_pence: 1000, size_label: null, active: true },
    { id: "kindling", name: "Netted Bag of Kindling", price_pence: 700, size_label: "75cm × 45cm", active: true },
    { id: "road-salt", name: "Road Salt", price_pence: 500, size_label: null, active: true },
    { id: "pickup-load", name: "Pickup Load", price_pence: 12000, size_label: null, active: true },
  ]);
});

test("homepage shows the business, products and delivery promise", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Shop now/ })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(4);
  await expect(page.getByText("Free / included delivery in Crieff").first()).toBeVisible();
  await expect(page.getByText("Small delivery charge may apply outside Crieff.").first()).toBeVisible();
  noErrors();
});

test("shop cards: name, size, price per unit, delivery wording", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  const cards = page.locator("article");
  await expect(cards).toHaveCount(4);
  const expectations = [
    ["Seasoned Firewood", null, "£10", "per bag"],
    ["Netted Bag of Kindling", "75cm × 45cm", "£7", "per bag"],
    ["Road Salt", null, "£5", "per bag"],
    ["Pickup Load", null, "£120", "per load"],
  ] as const;
  for (const [i, [name, size, price, unit]] of expectations.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole("heading", { name })).toBeVisible();
    if (size) await expect(card.getByText(`Size: ${size}`)).toBeVisible();
    await expect(card.getByText(price, { exact: true }).first()).toBeVisible();
    await expect(card.getByText(unit, { exact: true })).toBeVisible();
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
  await expect(page.getByText("Subtotal (6 items)")).toBeVisible();
  const summary = page.getByRole("complementary");
  await expect(summary.getByText("£49.00")).toBeVisible();

  await page.getByRole("button", { name: "Increase Road Salt quantity" }).click();
  await expect(page.getByText("2 × £5.00 = £10.00")).toBeVisible();
  await page.getByRole("button", { name: "Decrease Seasoned Firewood quantity" }).click();
  await expect(page.getByText("2 × £10.00 = £20.00")).toBeVisible();
  await page.getByRole("button", { name: "Remove Netted Bag of Kindling from basket" }).click();
  await expect(page.getByText("Netted Bag of Kindling")).toHaveCount(0);
  await expect(page.getByText("Subtotal (4 items)")).toBeVisible();
  await expect(summary.getByText("£30.00")).toBeVisible();

  const postcode = page.getByLabel("Check delivery to your postcode");
  await postcode.fill("ph7 3aa");
  await expect(page.getByText("Crieff — delivery included")).toBeVisible();
  await postcode.fill("PH1 5XY");
  await expect(page.getByText("Small delivery charge may apply — we'll confirm this with you.")).toBeVisible();
  await expect(summary.getByText("To be confirmed")).toBeVisible();

  // Basket survives a reload (localStorage holds only ids + quantities).
  await page.reload();
  await expect(page.getByText("Subtotal (4 items)")).toBeVisible();
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

const LOAD_DESCRIPTION = [
  "L200 pickup bed full of logs.",
  "Part seasoned.",
  "Equivalent to approximately 1½ bulk bags.",
  "This is a loose load, not bagged.",
  "The load is stacked when delivered.",
];

test("Pickup Load card: £120 per load, supplied description, delivery wording", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "Pickup Load", exact: true }) });
  await expect(card.getByText("£120", { exact: true }).first()).toBeVisible();
  await expect(card.getByText("per load", { exact: true })).toBeVisible();
  await expect(card.getByText("Delivery included in Crieff")).toBeVisible();
  await expect(card.getByText("Small delivery charge may apply outside Crieff.")).toBeVisible();
  const text = (await card.locator("p.flex-1").textContent())!;
  for (const line of LOAD_DESCRIPTION) expect(text).toContain(line);
  await expect(card.getByText("1 × £120 = £120")).toBeVisible();
  await card.getByRole("button", { name: /Increase/ }).click();
  await expect(card.getByText("2 × £120 = £240")).toBeVisible();
  noErrors();
});

test("Pickup Load in the basket: quantity maths and wording (a load, not a bag)", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  await addToBasket(page, "Pickup Load", 1);
  await page.goto("/basket");
  const line = page.getByRole("listitem").filter({ hasText: "Pickup Load" });
  await expect(line.getByText("£120.00 per load · delivery included in Crieff")).toBeVisible();
  await expect(line).not.toContainText(/per bag/i);
  await expect(page.getByText("1 × £120.00 = £120.00")).toBeVisible();
  await expect(page.getByText("Subtotal (1 item)")).toBeVisible();
  await expect(page.getByRole("complementary").getByText("£120.00")).toBeVisible();
  await page.getByRole("button", { name: "Increase Pickup Load quantity" }).click();
  await expect(page.getByText("2 × £120.00 = £240.00")).toBeVisible();
  await expect(page.getByRole("complementary").getByText("£240.00")).toBeVisible();

  // Combinations from the brief.
  await page.evaluate(() => localStorage.setItem("tf-basket-v1", JSON.stringify({ "pickup-load": 1, kindling: 1 })));
  await page.reload();
  await expect(page.getByRole("complementary").getByText("£127.00")).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("tf-basket-v1", JSON.stringify({ "pickup-load": 1, "seasoned-firewood": 1, "road-salt": 1 })),
  );
  await page.reload();
  await expect(page.getByRole("complementary").getByText("£135.00")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("tf-basket-v1", JSON.stringify({ "pickup-load": 1, kindling: 2 })));
  await page.reload();
  await expect(page.getByRole("complementary").getByText("£134.00")).toBeVisible();
  noErrors();
});

test("kindling shows the supplied photo of the green netted bag, uncropped", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "Netted Bag of Kindling", exact: true }) });
  const img = card.getByRole("img", { name: "Netted Bag of Kindling from Timber & Flame, Crieff" });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(decodeURIComponent(await img.evaluate((i: HTMLImageElement) => i.currentSrc))).toContain("/images/kindling-bag.jpg");
  // The whole photo is shown (contain), not a cropped slice.
  expect(await img.evaluate((i) => getComputedStyle(i).objectFit)).toBe("contain");
  // No illustration for this product.
  await expect(card.getByRole("img", { name: /illustration/ })).toHaveCount(0);
  // The image file served is the uploaded 816×1262 photo.
  const res = await page.request.get("/images/kindling-bag.jpg");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/jpeg");
  const dims = await page.evaluate(async () => {
    const b = await createImageBitmap(await (await fetch("/images/kindling-bag.jpg")).blob());
    return [b.width, b.height];
  });
  expect(dims).toEqual([816, 1262]);
  noErrors();
});

test("kindling photo also shows in the basket thumbnail", async ({ page }) => {
  await page.goto("/shop");
  await addToBasket(page, "Netted Bag of Kindling", 1);
  await page.goto("/basket");
  const img = page.getByRole("img", { name: "Netted Bag of Kindling from Timber & Flame, Crieff" });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
});

test("no stale prices on any public page: no £3 kindling or £4 road salt, only the current four prices", async ({ page }) => {
  const stale = /£\s?[34](?![\d.,])/;
  for (const path of ["/", "/shop", "/delivery", "/about", "/contact", "/basket", "/checkout"]) {
    await page.goto(path);
    const html = await page.content();
    expect(html.match(stale), `${path} contains an old £3/£4 price`).toBeNull();
    expect(html).not.toMatch(/"price(Pence)?":\s*(300|400)\b/);
  }
  await page.goto("/shop");
  const prices = await page.locator("article").evaluateAll((els) => els.map((e) => e.querySelector("p.flex .label")!.textContent));
  expect(prices).toEqual(["£10", "£7", "£5", "£120"]);
});
