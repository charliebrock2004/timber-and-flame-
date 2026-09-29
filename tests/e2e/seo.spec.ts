import { test, expect } from "@playwright/test";
import { BASE } from "./env";
import { trackErrors } from "./helpers";

const PAGES = ["/", "/shop", "/delivery", "/about", "/contact"];

for (const path of PAGES) {
  test(`SEO tags on ${path}`, async ({ page }) => {
    const noErrors = trackErrors(page);
    const res = await page.goto(path);
    expect(res!.status()).toBe(200);
    const title = await page.title();
    expect(title).toMatch(/Timber & Flame/);
    expect(title).toMatch(/Crieff/);
    const meta = (sel: string) => page.locator(sel).first().getAttribute("content");
    expect((await meta('meta[name="description"]'))!.length).toBeGreaterThan(60);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(`${BASE}${path === "/" ? "" : path}`);
    expect(await meta('meta[property="og:title"]')).toBeTruthy();
    expect(await meta('meta[property="og:description"]')).toBeTruthy();
    expect(await meta('meta[property="og:image"]')).toBe(`${BASE}/og.jpg`);
    expect(await page.locator("h1").count()).toBe(1);
    noErrors();
  });
}

test("LocalBusiness structured data uses only real business facts", async ({ page }) => {
  await page.goto("/");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@type"]).toBe("LocalBusiness");
  expect(ld.name).toBe("Timber & Flame Firewood");
  expect(ld.telephone).toBe("+447535759768");
  expect(ld.email).toBe("timberflame84@gmail.com");
  expect(ld.address).toEqual({ "@type": "PostalAddress", addressLocality: "Crieff", addressRegion: "Perthshire", addressCountry: "GB" });
  expect(ld.hasOfferCatalog.itemListElement.map((o: { price: string }) => o.price)).toEqual(["10.00", "7.00", "5.00", "120.00"]);
  for (const k of ["aggregateRating", "review", "openingHours", "openingHoursSpecification"]) expect(ld[k]).toBeUndefined();
});

test("sitemap and robots", async ({ request }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  for (const p of PAGES) expect(sm).toContain(`<loc>${BASE}${p === "/" ? "" : p}</loc>`);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Disallow: /checkout");
  expect(robots).toContain(`Sitemap: ${BASE}/sitemap.xml`);
});

test("private pages are noindex", async ({ page }) => {
  for (const p of ["/basket", "/checkout", "/admin/login"]) {
    await page.goto(p);
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toMatch(/noindex/);
  }
});

test("contact details and tap-to-call / email links everywhere", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p);
    expect(await page.locator('a[href="tel:+447535759768"]').count(), p).toBeGreaterThan(0);
    expect(await page.locator('a[href="mailto:timberflame84@gmail.com"]').count(), p).toBeGreaterThan(0);
    await expect(page.locator("footer")).toContainText("Timber & Flame Firewood");
    await expect(page.locator("footer")).toContainText("Crieff, Perthshire");
    await expect(page.locator("footer")).toContainText("07535 759768");
  }
});

test("every internal link and image resolves", async ({ page, request }) => {
  const seen = new Set<string>();
  const assets = new Set<string>();
  for (const p of [...PAGES, "/basket", "/checkout", "/admin/login"]) {
    await page.goto(p);
    for (const href of await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
      const u = new URL(href);
      if (u.origin === BASE) seen.add(u.pathname);
    }
    for (const src of await page
      .locator("img")
      .evaluateAll((is) => is.map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src)))
      if (src.startsWith(BASE)) assets.add(src);
  }
  expect(seen.size).toBeGreaterThan(6);
  for (const path of seen) expect((await request.get(path)).status(), path).toBe(200);
  for (const src of assets) expect((await request.get(src)).status(), src).toBe(200);
  for (const f of ["/og.jpg", "/icon.png", "/apple-icon.png", "/images/logo.png"]) expect((await request.get(f)).status(), f).toBe(200);
});

test("unknown pages return 404", async ({ request }) => {
  expect((await request.get("/no-such-page")).status()).toBe(404);
  expect((await request.get("/order/not-a-real-token-aaaaaaaaaaaa")).status()).toBe(404);
});
