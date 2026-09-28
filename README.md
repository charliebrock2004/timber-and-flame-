# Timber & Flame Firewood — website & online shop

Online shop for Timber & Flame Firewood (Crieff, Perthshire): firewood, kindling and road salt with basket, checkout, delivery zones, Stripe-ready card payments, order emails and an owner admin area.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Postgres + Drizzle ORM · Stripe Checkout · Resend (email)

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

1. Push this folder to a GitHub repo and import it in Vercel.
2. **Storage → Create → Neon Postgres** (sets `DATABASE_URL`). Set `DIRECT_URL` to the unpooled URL.
3. Add the other variables from `.env.example` (at least `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`).
4. From your machine, with the production `DIRECT_URL` in `.env`: `npm run db:migrate && npm run db:seed`.
5. Deploy. Visit `/admin/login`.

## Current products

| Product | Price (per bag, delivered in Crieff) | Size |
|---|---|---|
| Seasoned Firewood | £10 | — |
| Netted Bag of Kindling | £7 | 75cm × 45cm |
| Road Salt | £5 | — |

Prices **include delivery within Crieff**. Outside Crieff a small delivery charge may apply — it's left blank ("to be confirmed") until the owner sets it in `/admin/delivery`. All delivery wording lives in `DELIVERY_COPY` in `config/business.ts`.

Defaults live in `config/catalog.ts`. Migration `0002_current_products_and_email.sql` applies these prices and the contact email to an existing database once; after that, edit prices in `/admin/products`.

## Where to change things

| What | Where | Rebuild needed? |
|---|---|---|
| Prices, product names/descriptions, hide/show a product, product photos | `/admin/products` | No |
| Delivery zones, charges, postcode prefixes | `/admin/delivery` | No |
| Phone, email, address, availability text, stand location, banner, pay-later / collection on/off | `/admin/settings` | No |
| Order status, mark pay-later orders paid, confirm a TBC delivery charge | `/admin/orders/…` | No |
| Brand name, tagline, town | `config/business.ts` | Yes |
| First-run defaults (seed data) | `config/catalog.ts`, `config/business.ts` | Re-seed |

## How ordering works (no online payment yet)

1. **Shop** — customer picks bags; each card shows `£10 per bag`, `Delivery included in Crieff` and a live `3 × £10 = £30`.
2. **Basket** (`/basket`) — change quantities, remove items, and check a postcode: *"Crieff — delivery included"* or *"Small delivery charge may apply — we'll confirm this with you."*
3. **Checkout** (`/checkout`) — three short steps: *Your details* (name, phone, email) → *Delivery details* (postcode first, then address) → *Review your order* → **Place order**. Browser Back moves between steps; typed details are kept for the session.
4. **Server** (`/api/checkout`) validates everything, re-prices from the database, works out the delivery zone from the postcode, saves the order as **New / Awaiting payment**, generates an order number (`TF-XXXXXX`) and emails the business + customer.
5. **Confirmation** (`/order/<private-token>`) — "Order received", items, total, address, Call + Back to shop. Never says "paid".
6. **Admin** (`/admin`) — new orders appear at the top with delivery status, payment status and whether the email went out. Move them through New → Preparing → Out for delivery → Completed (or Cancelled); mark payment received manually; confirm an outside-Crieff delivery charge; resend the order email.

An email failure never loses an order: it's saved first, and admin shows **Email not sent** with a *Resend* button.

## Order emails

Set `GMAIL_USER` + `GMAIL_APP_PASSWORD` (see `.env.example` for the 3-step Google setup). Then:

- **To the business** (`ORDER_NOTIFICATION_EMAIL`, else the business email in `/admin/settings`): subject `New Timber & Flame Order #TF-XXXXXX` — customer, delivery address, products with quantity / unit price / line total, subtotal, delivery, total, delivery status, **Payment status: Awaiting payment**. Reply-to is the customer.
- **To the customer**: subject `Timber & Flame Order #TF-XXXXXX` — thank you, order number, items, total, address, "Your order has been received. Timber & Flame will contact you regarding delivery and payment arrangements."

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

`dev` · `build` · `start` · `lint` · `typecheck` · `db:generate` (after schema change) · `db:migrate` · `db:seed` (`-- --reset` to restore defaults) · `db:studio` · `admin:hash`

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
