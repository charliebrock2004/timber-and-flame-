import { test } from "node:test";
import assert from "node:assert/strict";
import { customerEmail, ownerEmail } from "@/lib/email";
import type { OrderWithItems } from "@/db/schema";

const base: OrderWithItems = {
  id: "7b0c0f4e-1111-4222-8333-944445555666",
  orderNumber: "TF-ABC234",
  accessToken: "tok_abcdefghijklmnopqrstuvwxyz",
  customerName: "Jamie Test",
  phone: "07700 900123",
  email: "jamie@example.com",
  addressLine1: "1 High Street",
  addressLine2: null,
  town: "Crieff",
  postcode: "PH7 3AA",
  notes: null,
  fulfilment: "DELIVERY",
  deliveryZoneId: "crieff",
  deliveryZoneName: "Crieff",
  deliveryChargePence: 0,
  subtotalPence: 3700,
  totalPence: 3700,
  paymentMethod: "PAY_LATER",
  paymentStatus: "AWAITING_PAYMENT",
  status: "PENDING",
  stripeSessionId: null,
  stripePaymentIntentId: null,
  ownerNotifiedAt: null,
  ownerEmailSentAt: null,
  customerEmailSentAt: null,
  createdAt: new Date("2026-10-01T10:00:00Z"),
  updatedAt: new Date("2026-10-01T10:00:00Z"),
  items: [
    {
      id: "i1",
      orderId: "o",
      productId: "seasoned-firewood",
      productName: "Seasoned Firewood",
      unitPricePence: 1000,
      quantity: 3,
      lineTotalPence: 3000,
    },
    {
      id: "i2",
      orderId: "o",
      productId: "kindling",
      productName: "Netted Bag of Kindling",
      unitPricePence: 700,
      quantity: 1,
      lineTotalPence: 700,
    },
  ],
};

test("business email has everything needed to deliver and get paid", () => {
  const m = ownerEmail(base, "timberflame84@gmail.com");
  assert.equal(m.to, "timberflame84@gmail.com");
  assert.equal(m.subject, "New Timber & Flame Order #TF-ABC234");
  assert.equal(m.replyTo, "jamie@example.com");
  for (const s of [
    "Name: Jamie Test",
    "Phone: 07700 900123",
    "Email: jamie@example.com",
    "Address: 1 High Street",
    "Town: Crieff",
    "Postcode: PH7 3AA",
    "Seasoned Firewood",
    "Quantity: 3",
    "Unit price: £10.00",
    "Line total: £30.00",
    "SUBTOTAL: £37.00",
    "DELIVERY: Included",
    "TOTAL: £37.00",
    "PAYMENT STATUS:\nAwaiting payment",
    "ORDER STATUS:\nNew",
  ])
    assert.ok(m.text.includes(s), `missing: ${s}`);
  assert.ok(m.html.includes("Awaiting payment") && m.html.includes(">New<"));
});

test("business email for outside Crieff says the charge is to be confirmed", () => {
  const m = ownerEmail(
    { ...base, postcode: "PH1 5XY", deliveryZoneId: "outside-crieff", deliveryZoneName: "Outside Crieff", deliveryChargePence: null },
    "x@y.z",
  );
  assert.ok(m.text.includes("DELIVERY: To be confirmed"));
  assert.ok(m.text.includes("TOTAL: £37.00 + delivery (to be confirmed)"));
});

test("customer email confirms receipt and never says paid", () => {
  const m = customerEmail(base, "07535 759768", "timberflame84@gmail.com");
  assert.equal(m.to, "jamie@example.com");
  assert.equal(m.subject, "Timber & Flame Order #TF-ABC234");
  assert.ok(m.text.includes("Your order has been received."));
  assert.ok(m.text.includes("Timber & Flame will contact you regarding delivery and payment."));
  assert.ok(m.text.includes("3 × Seasoned Firewood @ £10.00 = £30.00"));
  assert.doesNotMatch(m.text, /\bpaid\b/i);
  assert.doesNotMatch(m.html, /\bpaid\b/i);
});

test("customer-supplied text is HTML-escaped", () => {
  const m = ownerEmail({ ...base, customerName: "<script>x</script>", notes: "<img src=x>" }, "x@y.z");
  assert.ok(!m.html.includes("<script>x"));
  assert.ok(!m.html.includes("<img src=x>"));
});
