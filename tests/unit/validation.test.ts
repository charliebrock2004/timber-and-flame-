import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema } from "@/lib/validation";
import { rules } from "@/lib/checkout-rules";

const valid = {
  items: [{ productId: "seasoned-firewood", quantity: 3 }],
  fulfilment: "DELIVERY",
  customerName: "Jamie Test",
  phone: "07700 900123",
  email: "Jamie@Example.com",
  addressLine1: "1 High Street",
  addressLine2: "",
  town: "Crieff",
  postcode: "ph7 3aa",
  notes: "",
  website: "",
};

test("a normal order validates and is tidied", () => {
  const r = checkoutSchema.safeParse(valid);
  assert.ok(r.success, JSON.stringify(!r.success && r.error.issues));
  assert.equal(r.data.email, "jamie@example.com");
  assert.equal(r.data.paymentMethod, "PAY_LATER");
});

test("prices, totals and statuses sent by the browser are discarded", () => {
  const r = checkoutSchema.safeParse({
    ...valid,
    items: [{ productId: "seasoned-firewood", quantity: 3, unitPricePence: 1, lineTotalPence: 3 }],
    subtotalPence: 3,
    totalPence: 3,
    deliveryChargePence: -500,
    paymentStatus: "PAID",
    status: "COMPLETED",
  });
  assert.ok(r.success);
  assert.deepEqual(r.data.items, [{ productId: "seasoned-firewood", quantity: 3 }]);
  for (const k of ["subtotalPence", "totalPence", "deliveryChargePence", "paymentStatus", "status"]) assert.equal(k in r.data, false, k);
});

test("rejects bad baskets", () => {
  const bad = (items: unknown) => checkoutSchema.safeParse({ ...valid, items }).success;
  assert.equal(bad([]), false);
  assert.equal(bad([{ productId: "kindling", quantity: 0 }]), false);
  assert.equal(bad([{ productId: "kindling", quantity: 51 }]), false);
  assert.equal(bad([{ productId: "kindling", quantity: 1.5 }]), false);
  assert.equal(
    bad([
      { productId: "kindling", quantity: 1 },
      { productId: "kindling", quantity: 2 },
    ]),
    false,
  );
});

test("honeypot filled → rejected", () => {
  assert.equal(checkoutSchema.safeParse({ ...valid, website: "http://spam" }).success, false);
});

test("delivery needs address, town and postcode", () => {
  for (const f of ["addressLine1", "town", "postcode"]) {
    const r = checkoutSchema.safeParse({ ...valid, [f]: "" });
    assert.equal(r.success, false, f);
    assert.equal(r.error!.issues[0].path[0], f);
  }
});

/**
 * The browser runs `rules.*`; the server runs `checkoutSchema`. For every
 * sample value they must reach the same verdict.
 */
const SAMPLES: Record<"customerName" | "phone" | "email" | "addressLine1" | "town" | "postcode", string[]> = {
  customerName: ["Jo", "J", " ", "Mary-Jane O'Neill", "x".repeat(80), "x".repeat(81)],
  phone: ["07535 759768", "+44 7535 759768", "0044 7535759768", "(01764) 123456", "01764 12345", "12345", "0753575976", "", "abc"],
  email: [
    "a@b.co",
    "name@example.com",
    "Name.Surname+tag@sub.example.co.uk",
    "a..b@example.com",
    ".a@example.com",
    "a@-example.com",
    "a@example",
    "a@example.c",
    "no-at-sign",
    "a b@example.com",
    "",
  ],
  addressLine1: ["1 High St", "12", "  ", "x".repeat(120), "x".repeat(121)],
  town: ["Crieff", "C", "x".repeat(60), "x".repeat(61)],
  postcode: ["PH7 3AA", "ph73aa", "PH1 5XY", "PH7", "12345", ""],
};

for (const [field, values] of Object.entries(SAMPLES)) {
  test(`browser and server agree on ${field}`, () => {
    for (const v of values) {
      const client = rules[field as keyof typeof SAMPLES](v) === null;
      const r = checkoutSchema.safeParse({ ...valid, [field]: v });
      const server = r.success || !r.error.issues.some((i) => i.path[0] === field);
      assert.equal(server, client, `${field}=${JSON.stringify(v)} client=${client} server=${server}`);
    }
  });
}
