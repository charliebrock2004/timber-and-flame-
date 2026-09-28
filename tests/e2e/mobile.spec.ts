import { test, expect, type Page } from "@playwright/test";
import { addToBasket, checkoutToReview, CRIEFF_CUSTOMER, loginAsAdmin, placeOrder, trackErrors } from "./helpers";

async function assertNoHorizontalScroll(page: Page, label: string) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `${label}: page is ${sw}px wide on a ${iw}px screen`).toBeLessThanOrEqual(iw);
}

/** Every visible button/link-button in main must be at least 44px tall (WCAG target size). */
async function assertTapTargets(page: Page, label: string) {
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "main button, main .btn, main input:not([type=hidden]), main select, header button, header a",
      ),
    ]
      .filter((el) => el.offsetParent !== null && !el.closest("[aria-hidden=true]"))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 40)
      .map(
        ({ el, r }) =>
          `${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.height)}px`,
      ),
  );
  expect(small, `${label}: small tap targets`).toEqual([]);
}

test("mobile: full customer journey, no horizontal scroll, big tap targets", async ({ page }) => {
  const noErrors = trackErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  for (const p of ["/", "/shop", "/delivery", "/about", "/contact"]) {
    await page.goto(p);
    await assertNoHorizontalScroll(page, p);
    await assertTapTargets(page, p);
    await page.screenshot({ path: `test-results/mobile${p === "/" ? "-home" : p.replace("/", "-")}.png`, fullPage: true });
  }

  // Menu
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Shop" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Shop" }).click();
  await expect(page).toHaveURL(/\/shop$/);

  // Sticky bar: call + order
  const bar = page.locator("div.fixed.bottom-0");
  await expect(bar.getByRole("link", { name: /Call Timber & Flame/ })).toHaveAttribute("href", "tel:+447535759768");
  await addToBasket(page, "Seasoned Firewood", 3);
  await expect(bar.getByRole("link", { name: /Basket, 3 items, £30/ })).toBeVisible();
  await bar.getByRole("link", { name: /Basket/ }).click();

  await expect(page.getByText("3 × £10.00 = £30.00")).toBeVisible();
  await assertNoHorizontalScroll(page, "basket");
  await assertTapTargets(page, "basket");
  await page.screenshot({ path: "test-results/mobile-basket.png", fullPage: true });

  await checkoutToReview(page, CRIEFF_CUSTOMER);
  await assertNoHorizontalScroll(page, "review");
  await assertTapTargets(page, "review");
  await page.screenshot({ path: "test-results/mobile-review.png", fullPage: true });
  const place = page.getByRole("button", { name: "Place order" });
  const box = (await place.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(56);
  await placeOrder(page);
  await assertNoHorizontalScroll(page, "confirmation");
  await page.screenshot({ path: "test-results/mobile-confirmation.png", fullPage: true });
  noErrors();
});

test("mobile: checkout steps render cleanly", async ({ page }) => {
  await page.goto("/shop");
  await page.evaluate(() => localStorage.setItem("tf-basket-v1", JSON.stringify({ kindling: 2, "road-salt": 1 })));
  await page.goto("/checkout");
  await assertNoHorizontalScroll(page, "details");
  await page.screenshot({ path: "test-results/mobile-checkout-details.png", fullPage: true });
  await page.getByLabel("Full name").fill("Mobile Tester");
  await page.getByLabel("Phone number").fill("07700900123");
  await page.getByLabel("Email address").fill("mobile@example.test");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByLabel("Postcode").fill("PH7 3AA");
  await expect(page.getByText("Crieff — delivery included")).toBeVisible();
  await assertNoHorizontalScroll(page, "delivery");
  await assertTapTargets(page, "delivery");
  await page.screenshot({ path: "test-results/mobile-checkout-delivery.png", fullPage: true });
});

test("mobile: admin is usable on a phone", async ({ page, context }) => {
  await loginAsAdmin(context);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-admin.png", fullPage: true });
  const link = page.locator("table a").first();
  if (await link.count()) {
    await link.click();
    await assertNoHorizontalScroll(page, "admin order");
    await page.screenshot({ path: "test-results/mobile-admin-order.png", fullPage: true });
  }
});
