import { test, expect } from "@playwright/test";
import {
  addToBasket,
  checkoutToReview,
  CRIEFF_CUSTOMER,
  loginAsAdmin,
  mailsFor,
  orderByNumber,
  PERTH_CUSTOMER,
  placeOrder,
  setEmailOutage,
  sql,
  trackErrors,
  waitForMail,
} from "./helpers";
import { BASE, BUSINESS_EMAIL } from "./env";

test.beforeEach(async ({ page }) => {
  setEmailOutage(false);
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
test.afterAll(() => setEmailOutage(false));

test("validation: each step blocks until its fields are valid", async ({ page }) => {
  await page.goto("/shop");
  await addToBasket(page, "Road Salt", 1);
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByText("Please enter your full name")).toBeVisible();
  await expect(page.getByText("Please enter a phone number so we can arrange delivery")).toBeVisible();
  await expect(page.getByText("Please enter your email address")).toBeVisible();
  await page.getByLabel("Full name").fill("Jo Bloggs");
  await page.getByLabel("Phone number").fill("12345");
  await page.getByLabel("Email address").fill("a..b@example.com");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByText("Please enter a valid UK phone number, e.g. 07700 900123")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address, e.g. name@example.com")).toBeVisible();
  await page.getByLabel("Phone number").fill("07700 900123");
  await page.getByLabel("Email address").fill("jo@example.test");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByText("Please enter your postcode")).toBeVisible();
  await expect(page.getByText("Please enter your house number and street")).toBeVisible();
  await expect(page.getByText("Please enter your town or village")).toBeVisible();
  await page.getByLabel("Postcode").fill("PH7");
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByText("Please enter a valid UK postcode, e.g. PH7 3AA")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Delivery details" })).toBeVisible();
});

test("Crieff order: product → basket → details → delivery → review → order → database → emails → admin", async ({ page, context }) => {
  const noErrors = trackErrors(page);
  await page.goto("/shop");
  await addToBasket(page, "Seasoned Firewood", 3);
  await addToBasket(page, "Netted Bag of Kindling", 1);
  await page.goto("/basket");
  await page.getByLabel("Check delivery to your postcode").fill(CRIEFF_CUSTOMER.postcode);
  await expect(page.getByText("Crieff — delivery included")).toBeVisible();

  await checkoutToReview(page, CRIEFF_CUSTOMER);
  const review = page.locator("#h-review-order").locator("..").locator("..");
  await expect(review.getByText("3 × £10.00")).toBeVisible();
  await expect(review.getByText("£30.00")).toBeVisible();
  await expect(review.getByText("1 × £7.00")).toBeVisible();
  await expect(review.getByText("Included", { exact: true })).toBeVisible();
  await expect(review.locator("dd", { hasText: "£37.00" })).toHaveCount(2); // subtotal + total
  await expect(page.getByText("Crieff — delivery included")).toBeVisible();
  await expect(page.getByText("No payment is taken now.")).toBeVisible();

  const number = await placeOrder(page);
  await expect(page.getByText("Timber & Flame will contact you regarding delivery and payment.")).toBeVisible();
  await expect(page.getByText("Awaiting payment — Timber & Flame will arrange this with you.")).toBeVisible();
  await expect(page.getByText(/\bpaid\b/i)).toHaveCount(0);
  // Basket is cleared once the order is placed.
  expect(await page.evaluate(() => localStorage.getItem("tf-basket-v1"))).toBe("{}");

  // Database
  const o = await orderByNumber(number);
  expect(o).toMatchObject({
    customer_name: CRIEFF_CUSTOMER.name,
    phone: CRIEFF_CUSTOMER.phone,
    email: CRIEFF_CUSTOMER.email,
    address_line1: CRIEFF_CUSTOMER.address,
    town: CRIEFF_CUSTOMER.town,
    postcode: "PH7 3AA",
    fulfilment: "DELIVERY",
    delivery_zone_id: "crieff",
    delivery_charge_pence: 0,
    subtotal_pence: 3700,
    total_pence: 3700,
    payment_method: "PAY_LATER",
    payment_status: "AWAITING_PAYMENT",
    status: "PENDING",
  });
  expect(o.created_at).toBeInstanceOf(Date);
  const items = await sql(
    "select product_id, product_name, unit_price_pence, quantity, line_total_pence from order_items where order_id = $1 order by product_id",
    [o.id],
  );
  expect(items).toEqual([
    { product_id: "kindling", product_name: "Netted Bag of Kindling", unit_price_pence: 700, quantity: 1, line_total_pence: 700 },
    { product_id: "seasoned-firewood", product_name: "Seasoned Firewood", unit_price_pence: 1000, quantity: 3, line_total_pence: 3000 },
  ]);

  // Emails: one to the business, one to the customer
  const sent = await waitForMail(number, 2);
  const owner = sent.find((m) => m.to.includes(BUSINESS_EMAIL))!;
  const customer = sent.find((m) => m.to.includes(CRIEFF_CUSTOMER.email))!;
  expect(owner.subject).toBe(`New Timber & Flame Order #${number}`);
  expect(owner.replyTo).toContain(CRIEFF_CUSTOMER.email);
  for (const s of [
    `Name: ${CRIEFF_CUSTOMER.name}`,
    `Phone: ${CRIEFF_CUSTOMER.phone}`,
    `Email: ${CRIEFF_CUSTOMER.email}`,
    `Address: ${CRIEFF_CUSTOMER.address}`,
    "Town: Crieff",
    "Postcode: PH7 3AA",
    "Quantity: 3   Unit price: £10.00   Line total: £30.00",
    "Quantity: 1   Unit price: £7.00   Line total: £7.00",
    "SUBTOTAL: £37.00",
    "DELIVERY: Included",
    "TOTAL: £37.00",
    "Awaiting payment",
    "ORDER STATUS:\nNew",
  ])
    expect(owner.text).toContain(s);
  expect(customer.subject).toBe(`Timber & Flame Order #${number}`);
  expect(customer.text).toContain("Your order has been received.");
  expect(customer.text).toContain("Timber & Flame will contact you regarding delivery and payment.");
  expect(customer.text).not.toMatch(/\bpaid\b/i);
  await expect.poll(async () => (await orderByNumber(number)).customer_email_sent_at).not.toBeNull();

  // Admin sees it
  await loginAsAdmin(context);
  await page.goto("/admin");
  const row = page.getByRole("row").filter({ hasText: number });
  await expect(row).toContainText(CRIEFF_CUSTOMER.name);
  await expect(row).toContainText("Included in Crieff");
  await expect(row).toContainText("£37.00");
  await expect(row).toContainText("Awaiting payment");
  await expect(row).toContainText("New");
  await expect(row).not.toContainText("Email not sent");
  noErrors();
});

test("outside Crieff: charge to be confirmed, never invented", async ({ page }) => {
  await page.goto("/shop");
  await addToBasket(page, "Road Salt", 2);
  await checkoutToReview(page, PERTH_CUSTOMER);
  await expect(page.getByText("Small delivery charge may apply — we'll confirm this with you.").first()).toBeVisible();
  await expect(page.getByText("+ delivery, to be confirmed").first()).toBeVisible();
  const number = await placeOrder(page);
  await expect(page.getByRole("cell", { name: "To be confirmed", exact: true })).toBeVisible();
  const o = await orderByNumber(number);
  expect(o).toMatchObject({ delivery_zone_id: "outside-crieff", delivery_charge_pence: null, subtotal_pence: 1000, total_pence: 1000 });
  const sent = await waitForMail(number, 2);
  expect(sent.find((m) => m.to.includes(BUSINESS_EMAIL))!.text).toContain("DELIVERY: To be confirmed");
  expect(sent.find((m) => m.to.includes(PERTH_CUSTOMER.email))!.text).toContain(
    "Small delivery charge may apply — we'll confirm this with you",
  );
});

const apiBody = (over: Record<string, unknown> = {}) => ({
  items: [{ productId: "seasoned-firewood", quantity: 2 }],
  fulfilment: "DELIVERY",
  customerName: "Tamper Test",
  phone: "07700 900999",
  email: "tamper@example.test",
  addressLine1: "9 Hill Road",
  addressLine2: "",
  town: "Crieff",
  postcode: "PH7 4BB",
  notes: "",
  website: "",
  ...over,
});

test("price tampering: the server re-prices everything from the database", async ({ request }) => {
  const res = await request.post("/api/checkout", {
    headers: { origin: BASE },
    data: apiBody({
      items: [{ productId: "seasoned-firewood", quantity: 2, unitPricePence: 1, pricePence: 1, lineTotalPence: 2 }],
      subtotalPence: 2,
      totalPence: 2,
      deliveryChargePence: -9999,
      paymentStatus: "PAID",
      status: "COMPLETED",
    }),
  });
  expect(res.status()).toBe(200);
  const token = (await res.json()).redirectUrl.split("/order/")[1];
  const [o] = await sql("select * from orders where access_token = $1", [token]);
  expect(o).toMatchObject({
    subtotal_pence: 2000,
    total_pence: 2000,
    delivery_charge_pence: 0,
    payment_status: "AWAITING_PAYMENT",
    status: "PENDING",
  });
  const [item] = await sql("select unit_price_pence, line_total_pence from order_items where order_id = $1", [o.id]);
  expect(item).toEqual({ unit_price_pence: 1000, line_total_pence: 2000 });
});

test("server rejects unknown / hidden products, bad input and cross-site posts — and saves nothing", async ({ request }) => {
  const before = (await sql<{ n: number }>("select count(*)::int n from orders"))[0].n;
  const post = (data: object, headers: Record<string, string> = { origin: BASE }) => request.post("/api/checkout", { headers, data });

  let r = await post(apiBody({ items: [{ productId: "gold-bars", quantity: 1 }] }));
  expect(r.status()).toBe(422);
  expect((await r.json()).error).toContain("no longer available");

  await sql("update products set active = false where id = 'road-salt'");
  try {
    r = await post(apiBody({ items: [{ productId: "road-salt", quantity: 1 }] }));
    expect(r.status()).toBe(422);
  } finally {
    await sql("update products set active = true where id = 'road-salt'");
  }

  r = await post(apiBody({ phone: "123", email: "nope", postcode: "XYZ" }));
  expect(r.status()).toBe(422);
  expect(Object.keys((await r.json()).fields).sort()).toEqual(["email", "phone", "postcode"]);

  r = await post(apiBody({ website: "spam" }));
  expect(r.status()).toBe(422);

  r = await post(apiBody(), { origin: "https://evil.example" });
  expect(r.status()).toBe(403);

  expect((await sql<{ n: number }>("select count(*)::int n from orders"))[0].n).toBe(before);
});

test("order numbers are unique", async () => {
  const [{ n, d }] = await sql<{ n: number; d: number }>("select count(*)::int n, count(distinct order_number)::int d from orders");
  expect(n).toBeGreaterThan(0);
  expect(d).toBe(n);
});

test("email outage: order is still saved, admin shows 'Email not sent', resend works", async ({ page, context }) => {
  await page.goto("/shop");
  await addToBasket(page, "Seasoned Firewood", 1);
  await checkoutToReview(page, { ...CRIEFF_CUSTOMER, name: "Email Outage", email: "outage@example.test" });
  setEmailOutage(true);
  const number = await placeOrder(page); // customer still sees "Order received"
  const o = await orderByNumber(number);
  expect(o).toMatchObject({
    status: "PENDING",
    payment_status: "AWAITING_PAYMENT",
    owner_email_sent_at: null,
    customer_email_sent_at: null,
  });
  expect(o.owner_notified_at).not.toBeNull();
  expect(mailsFor(number)).toHaveLength(0);

  await loginAsAdmin(context);
  await page.goto("/admin");
  await expect(page.getByRole("row").filter({ hasText: number })).toContainText("Email not sent");
  await page.getByRole("link", { name: number }).click();
  await expect(page.getByText("Email not sent")).toHaveCount(2);

  // Still down: resend fails visibly, nothing changes.
  await page.getByRole("button", { name: "Resend email" }).first().click();
  await expect(page.getByText("Couldn't send the email")).toBeVisible();

  setEmailOutage(false);
  await page.reload();
  await page.getByRole("button", { name: "Resend email" }).first().click();
  await expect(page.getByText("Order email to you sent.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByText("Confirmation to the customer sent.")).toBeVisible();
  const sent = await waitForMail(number, 2);
  expect(sent.map((m) => m.to).sort()).toEqual(["outage@example.test", BUSINESS_EMAIL].sort());
  await page.reload();
  await expect(page.getByText("Email not sent")).toHaveCount(0);
  const after = await orderByNumber(number);
  expect(after.owner_email_sent_at).not.toBeNull();
  expect(after.customer_email_sent_at).not.toBeNull();
  expect(after.payment_status).toBe("AWAITING_PAYMENT");
});
