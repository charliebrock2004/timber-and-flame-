# Timber & Flame Firewood — website & online shop

Online shop for Timber & Flame Firewood (Crieff, Perthshire): firewood, kindling and road salt with basket, checkout, delivery zones, order emails and an owner admin area. Orders are placed now and paid later — there is no online payment.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Postgres + Drizzle ORM · Gmail/SMTP email (nodemailer) · Playwright tests

---

## Quick start (local)

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL at minimum
npm run db:migrate            # create tables
npm run db:seed               # load products, prices, delivery zones, settings
npm run admin:hash -- "choose-a-long-password"   # paste results into .env
npm run dev                   # http://localhost:3000
```

## Deploying to Vercel

1. Import the GitHub repo into the Vercel project (Settings → Git → Connect).
2. **Storage → Create → Neon Postgres** (sets `DATABASE_URL`). Keep the unpooled URL for `DIRECT_URL`.
3. Add the environment variables below (Settings → Environment Variables, **Production** and **Preview**).
4. From your machine, with the production `DIRECT_URL` in `.env`: `npm run db:migrate && npm run db:seed`.
   Both are safe to re-run: migrations only apply once, and the seed never overwrites existing rows.
5. Deploy. The build reads the database, so `DATABASE_URL` must be set before the first build.
6. Visit `/admin/login`, place a test order, check both emails arrive, then mark the test order Cancelled.

### Environment variables (exactly what the code reads)

| Variable                                                                         | Needed             | What it's for                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                   | **Required**       | Postgres (pooled URL on Vercel). No fallback: without it nothing is shown or sold.                                                                                               |
| `ADMIN_EMAIL`                                                                    | **Required**       | Owner login email for `/admin`.                                                                                                                                                  |
| `ADMIN_PASSWORD_HASH`                                                            | **Required**       | From `npm run admin:hash -- "long password"`. Paste the **base64** value it prints — a raw `$2b$…` hash is mangled by Next.js's `$` expansion whenever a `.env` file is present. |
| `SESSION_SECRET`                                                                 | **Required**       | 32+ random characters (admin:hash prints one).                                                                                                                                   |
| `GMAIL_USER`                                                                     | Required for email | `timberflame84@gmail.com`                                                                                                                                                        |
| `GMAIL_APP_PASSWORD`                                                             | Required for email | Google App Password (16 characters).                                                                                                                                             |
| `NEXT_PUBLIC_SITE_URL`                                                           | Recommended        | e.g. `https://www.yourdomain.co.uk`. If unset on Vercel, the production `*.vercel.app` URL is used. Set it once you have a custom domain.                                        |
| `DIRECT_URL`                                                                     | Optional (local)   | Unpooled URL used by `db:migrate` / `db:seed` only.                                                                                                                              |
| `ORDER_NOTIFICATION_EMAIL`                                                       | Optional           | Send business emails somewhere other than the business email in `/admin/settings`.                                                                                               |
| `ORDER_EMAIL_FROM`                                                               | Optional           | "From" header. Default `"Timber & Flame Firewood" <GMAIL_USER>`.                                                                                                                 |
| `CHECKOUT_RATE_LIMIT`                                                            | Optional           | Checkout attempts per IP per 10 min (default 10).                                                                                                                                |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` / `RESEND_API_KEY` | Optional           | Alternative email transports instead of Gmail.                                                                                                                                   |
| `VERCEL_PROJECT_PRODUCTION_URL` `NODE_ENV`                                       | Set by Vercel      | Don't add these yourself.                                                                                                                                                        |
| `STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET`                                      | **Do not set**     | Would switch on the dormant card-payment code.                                                                                                                                   |

See `.env.example` for a copy-and-fill template.

### If the database is unavailable

There is **no fallback to the default prices in `config/`**. Basket and checkout read the database on every request; if it doesn't answer they show _"Online ordering is temporarily unavailable"_ with the phone number, and `/api/checkout` returns 503 without saving anything. The marketing pages (home, shop, delivery…) are rebuilt from the database hourly and immediately after any admin edit; if a rebuild fails, Next.js keeps serving the last version it built from the database. Change prices only in `/admin/products` so every page refreshes at once — editing the database directly takes up to an hour to show.

## Current products

| Product                | Price, delivered in Crieff | Size        |
| ---------------------- | -------------------------- | ----------- |
| Seasoned Firewood      | £10 per bag                | —           |
| Netted Bag of Kindling | £7 per bag                 | 75cm × 45cm |
| Road Salt              | £5 per bag                 | —           |
| Pickup Load            | £120 per load              | —           |

The **Pickup Load** is an L200 pickup bed full of part-seasoned logs (about 1½ bulk bags): a loose load, not bagged, stacked when delivered. It goes through exactly the same basket, checkout, delivery rules and emails as everything else, and is priced from the database like the other products.

Prices **include delivery within Crieff**. Outside Crieff a small delivery charge may apply — it's left blank ("to be confirmed") until the owner sets it in `/admin/delivery`. All delivery wording lives in `DELIVERY_COPY` in `config/business.ts`.

Defaults live in `config/catalog.ts`. Prices, descriptions, photos and availability are then edited in `/admin/products`. The admin edits existing products; **adding a brand-new product** is done in code: add it to `DEFAULT_PRODUCTS` (fresh databases) **and** write a migration that inserts it with `ON CONFLICT ("id") DO NOTHING` (existing databases) — see `db/migrations/0004_pickup_load_and_kindling_photo.sql`, which adds the Pickup Load and installs the kindling photo without touching any price or photo the owner has already changed. `npm run db:migrate` applies it once; it is safe to re-run.

**Photos** live in `public/images/` (e.g. `/images/kindling-bag.jpg`) and are referenced by path in `/admin/products`. Photos are always shown whole, never cropped, with a soft blurred backdrop filling any spare space, so portrait and landscape photos both work.

The stand photographs on the site have the stand's price board blurred; prices at the stand are separate from the online prices above.

## Where to change things

| What                                                                                            | Where                                     | Rebuild needed? |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------- |
| Prices, product names/descriptions, hide/show a product, product photos                         | `/admin/products`                         | No              |
| Delivery zones, charges, postcode prefixes                                                      | `/admin/delivery`                         | No              |
| Phone, email, address, availability text, stand location, banner, pay-later / collection on/off | `/admin/settings`                         | No              |
| Order status, mark pay-later orders paid, confirm a TBC delivery charge                         | `/admin/orders/…`                         | No              |
| Brand name, tagline, town                                                                       | `config/business.ts`                      | Yes             |
| First-run defaults (seed data)                                                                  | `config/catalog.ts`, `config/business.ts` | Re-seed         |

## How ordering works (no online payment yet)

1. **Shop** — customer picks items; each card shows e.g. `£10 per bag` (or `£120 per load`), `Delivery included in Crieff` and a live `3 × £10 = £30`.
2. **Basket** (`/basket`) — change quantities, remove items, and check a postcode: _"Crieff — delivery included"_ or _"Small delivery charge may apply — we'll confirm this with you."_
3. **Checkout** (`/checkout`) — three short steps: _Your details_ (name, phone, email) → _Delivery details_ (postcode first, then address) → _Review your order_ → **Place order**. Browser Back moves between steps; typed details are kept for the session.
4. **Server** (`/api/checkout`) validates everything, re-prices from the database, works out the delivery zone from the postcode, saves the order as **New / Awaiting payment**, generates an order number (`TF-XXXXXX`) and emails the business + customer.
5. **Confirmation** (`/order/<private-token>`) — "Order received", items, total, address, Call + Back to shop. Never says "paid".
6. **Admin** (`/admin`) — new orders appear at the top with delivery status, payment status and whether the email went out. Move them through New → Preparing → Out for delivery → Completed (or Cancelled); mark payment received manually; confirm an outside-Crieff delivery charge; resend the order email.

An email failure never loses an order: it's saved first, and admin shows **Email not sent** (for the business email, the customer email, or both) with a _Resend email_ button for each.

## Order emails

Set `GMAIL_USER` + `GMAIL_APP_PASSWORD` (see `.env.example` for the 3-step Google setup). Then:

- **To the business** (`ORDER_NOTIFICATION_EMAIL`, else the business email in `/admin/settings`): subject `New Timber & Flame Order #TF-XXXXXX` — customer, delivery address, products with quantity / unit price / line total, subtotal, delivery, total, delivery status, **Payment status: Awaiting payment**. Reply-to is the customer.
- **To the customer**: subject `Timber & Flame Order #TF-XXXXXX` — thank you, order number, items, total, address, "Your order has been received. Timber & Flame will contact you regarding delivery and payment."

Without email settings, orders still work and appear in `/admin`; admin shows a banner saying emails are off.

## Delivery rules

- Customer's postcode is matched to a zone on the **server**. Default: `PH7` (Crieff district) → **included in the price**; everything else → **Outside Crieff**, charge **not set**.
- Charge blank = "to be confirmed": customers can still order ("order now, pay later"), the owner confirms the charge by phone and can enter it on the order. Card payment is disabled for that zone until a price is set, so nobody is ever charged a made-up amount.
- To add a zone later (e.g. Comrie `PH6`, Auchterarder `PH3`): add it to `DEFAULT_DELIVERY_ZONES` in `config/catalog.ts` with a `sortOrder` below 99 and run `npm run db:seed` (existing zones and prices are left alone). It then appears in `/admin/delivery`.

## Payments (not live — Stripe code kept dormant; Revolut to be added)

- **Without Stripe keys:** checkout offers "Order now, pay later" only. The site never says card payment is available.
- **With Stripe:** set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, and create a webhook in Stripe → Developers → Webhooks:
  - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
  - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
- An order is marked **Paid only by the signed webhook**, never by the browser returning from Stripe, and only if the amount Stripe collected equals the server-calculated total.

## Security notes

- The browser sends only product IDs + quantities. Every price, delivery charge and total is computed server-side from the database (`lib/orders.ts`).
- Checkout input validated with Zod; honeypot field; same-origin check; per-IP rate limit.
- No card data touches this site (Stripe hosted checkout).
- Admin: no default password. bcrypt hash in env, signed httpOnly session cookie (12h), login rate limit, and every admin page/action re-checks the session.
- Customer order pages use an unguessable token URL, not the order number.
- Security headers + CSP in `next.config.ts`.
- The in-memory rate limiter is per server instance; for stronger protection swap `lib/rate-limit.ts` for Upstash Redis.

## Scripts

`dev` · `build` · `start` · `lint` · `typecheck` · `test` · `test:unit` · `test:e2e` · `db:generate` (after schema change) · `db:migrate` · `db:seed` (`-- --reset` to restore defaults) · `db:studio` · `admin:hash`

## Tests

- `npm run test:unit` — pricing, delivery zones, validation (browser and server rules must agree), email content. No database needed.
- `npm run test:e2e` — the whole journey in a real browser against a production build: shop → basket → postcode → checkout → order in the database → business + customer emails → admin (login, statuses, manual payment, resend), plus price tampering, email outage, **database outage**, SEO, links and mobile layout. It **wipes and re-creates a local test database** (`E2E_DATABASE_URL`, default `postgres://tf:tf@127.0.0.1:5432/tf_e2e`) and refuses to run against a non-local host. Emails go to a local test mail server, never to Gmail. If your Chromium doesn't match Playwright's, set `PLAYWRIGHT_CHROMIUM_PATH`.
- `npm test` — both.

## Project structure

```
app/(site)/        public pages: home, shop, delivery, about, contact, basket, order/[token]
app/admin/         owner area (orders, products, delivery, settings, login)
app/api/           checkout + Stripe webhook
components/        UI (header, product cards, basket/checkout, sections)
config/            business defaults + seed catalogue
db/                Drizzle schema, migrations, seed
lib/               pricing/delivery logic, orders, auth, email, stripe, SEO
public/images/     brand assets cut from the supplied photos
```
