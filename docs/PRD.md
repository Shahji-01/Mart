# Mart — Product Requirements Document (PRD)

**Product:** Mart (Shankeshwar Traders / "Shankeshwar Traders")
**Type:** Blinkit-style quick-commerce grocery platform
**Status:** Living document — reflects the current implemented system
**Audience:** Engineering, product, operations, QA, and onboarding

> **Security note:** This document describes configuration by **variable name and purpose only**.
> It contains **no secret values** (no API keys, passwords, JWT secrets, connection credentials, or
> tokens). All real secrets live in git-ignored `.env` files and must never be committed or pasted here.

---

## Table of Contents

1. Overview & Vision
2. Personas & Roles
3. System Architecture
4. Technology Stack
5. Repository & Workspace Layout
6. Customer Feature Specifications
7. Admin Feature Specifications
8. New Feature Waves (Maps, Push, Subscriptions, Buy-Again, Wallet Top-up, Demand, Chat)
9. Money Path & Correctness Properties
10. Data Model (every table)
11. Complete API Reference
12. Web Application (routes, pages, state)
13. Realtime & Background Processing
14. Security Model
15. Configuration & Environment Variables
16. Testing Strategy
17. Build, CI & Operations
18. Non-functional Requirements
19. Known Limitations & Roadmap
20. Glossary

---

## 1. Overview & Vision

Mart is a quick-commerce grocery storefront and operations platform modeled on Blinkit-style instant
delivery. Customers browse a catalog, add items to a cart, apply coupons, choose a delivery slot, pay
(cash on delivery, online via Razorpay, or stored-value wallet), and track delivery in real time on a
map. The platform layers loyalty points, a wallet, referrals, flash sales, auto-reorder subscriptions,
web push notifications, and per-order chat on top of a correctness-hardened money path.

Mart keeps the **green NTC brand** while adopting Blinkit-style UX patterns: a sticky search navbar with
rotating placeholders, fast category browsing, product-card hover/lazy-image behavior, a slide-in cart
drawer with honest bill details, quick reorder rails, and a comprehensive admin console.

### Product goals
- Minimize taps from open → checkout → live tracking.
- Guarantee money-path correctness: no double charges, no negative balances, never "paid" without funds.
- Drive repeat purchase via buy-again, subscriptions, wallet, loyalty, and referrals.
- Provide operators a real admin suite: catalog, coupons, flash sales, orders, returns, analytics.
- Stay reproducible and testable: versioned migrations, a typed API contract, a DB-free-collectable test suite.

### Non-goals (current release)
- A dedicated rider mobile app (rider location is posted via API/socket; no rider UI yet).
- Admin-side reply UI for order chat (data model + customer side exist; admin reply UI is future).
- Multi-warehouse / multi-tenant inventory.
- Native mobile apps (the web app is responsive/PWA-capable via a service worker).

---

## 2. Personas & Roles

**System roles** (DB enum `user_role`): `customer`, `admin`.

- **Shopper (customer):** Browses, searches, carts, checks out, tracks delivery, reorders. Expects
  accurate prices (including flash sales), reliable payment, and graceful error states.
- **Returning/loyal shopper:** Uses wallet, loyalty points, referrals, buy-again, subscriptions, and push.
- **Store operator (admin):** Manages catalog, categories, coupons, flash sales, banners, delivery
  slots/zones, orders and their lifecycle, returns/refunds, reviews, Q&A, newsletter, and reads analytics.
- **Developer/operator:** Needs reproducible migrations, a DB-free-collectable test suite, a typed API
  contract, enforced environment secrets, and structured logging.

---

## 3. System Architecture

### 3.1 High-level

```
            ┌──────────────┐        HTTPS / REST          ┌──────────────────┐
            │   Web (SPA)  │ ───────────────────────────▶ │   API (Express 5)│
            │ React + Vite │ ◀─────────────────────────── │  Drizzle ORM     │
            │ TanStack Qry │        Socket.io (WS)         │  Socket.io       │
            └──────┬───────┘ ◀───────────────────────────▶ └────────┬─────────┘
                   │                                                  │
          Leaflet/OSM, Web Push,                               Postgres (Docker)
          Razorpay Checkout                                  versioned migrations
                                                              Razorpay REST + HMAC
```

### 3.2 Contract-first flow

`packages/api-spec/openapi.yaml` is the source-of-truth contract. **orval** generates:
- `@workspace/validation` — zod schemas/types.
- `@workspace/api-client` — React-Query hooks + query-key helpers.

The web app consumes contract endpoints through the generated client; newer customer endpoints use a
thin `customFetch` wrapper by design where the OpenAPI spec has not yet been extended.

### 3.3 Request lifecycle (API)

1. `helmet`, CORS allowlist, rate limiting, body parsing (with raw-body capture for webhook HMAC).
2. `validateRequest(schema)` — zod-validates body/query/params and writes the result to `req.validated`
   (Express 5 safe; never mutates `req.query` in place). XSS sanitization persists downstream.
3. `requireAuth` / `requireAdmin` — JWT verification + token-version check + role gate.
4. Controller → Service → Drizzle/Postgres. Pure money/pricing logic is isolated in `lib/money.ts`.
5. Structured pino logging; errors surfaced (never silently swallowed).

### 3.4 Order-creation data flow

```
createOrder
  └─ idempotencyKey present & seen? ── yes ─▶ return existing order (no debits)
                                   └─ no ─▶ BEGIN TX
                                             SELECT users row FOR UPDATE (row lock)
                                             resolveVariantPricing per line (flash sale aware)
                                             validate stock / wallet / loyalty
                                             debit wallet+loyalty, insert order+items @ charged price
                                             set paymentStatus from method + debit/authorization result
                                           COMMIT
```

---

## 4. Technology Stack

| Layer | Technology |
| --- | --- |
| Monorepo | pnpm workspaces + Turbo, TypeScript project references |
| API | Node + Express 5, Drizzle ORM, Postgres, JWT, Socket.io, pino, zod, helmet, express-rate-limit |
| Web | Vite + React, TypeScript, Tailwind CSS, shadcn/ui, wouter (routing), TanStack Query, Zustand-style stores |
| Maps | Leaflet + OpenStreetMap tiles, Nominatim reverse-geocoding (no API key) |
| Push | Web Push (VAPID), service worker |
| Payments | Razorpay (REST + HMAC), `PaymentProvider` seam with a simulated fallback |
| Contract | OpenAPI (`openapi.yaml`) + orval codegen (zod + React-Query client) |
| DB tooling | drizzle-kit (versioned `generate` + `migrate`), drizzle-zod |
| Testing | vitest + fast-check (property-based testing) |

---

## 5. Repository & Workspace Layout

```
Mart/
├─ apps/
│  ├─ api/        Express 5 API (controllers, services, schemas, routes, lib, middlewares, __tests__)
│  ├─ web/        Vite + React SPA (pages, components, hooks, lib)
│  └─ sandbox/    Vite component sandbox
├─ packages/
│  ├─ database/   Drizzle schema (24 modules) + versioned SQL migrations + seed
│  ├─ validation/ zod schemas (orval-generated)
│  ├─ api-spec/   openapi.yaml + orval config (the contract)
│  └─ api-client/ orval-generated React-Query hooks
├─ infrastructure/  docker, nginx, kubernetes, terraform, monitoring
├─ scripts/         workspace maintenance & seeding
└─ docs/            documentation (this PRD)
```

### API source structure
- `controllers/` — 26 thin HTTP handlers (one per domain).
- `services/` — 33 domain services (business logic + DB access).
- `schemas/` — 21 zod request schemas.
- `routes/` — 27 routers + `index.ts` aggregator.
- `lib/` — pure/shared helpers: `money.ts`, `order-status.ts`, `env.ts`, `auth-middleware.ts`,
  `token-version.ts`, `constant-time.ts`, `get-validated.ts`, `pagination.ts`, `logger.ts`.
- `middlewares/` — `validateRequest.ts`, `xss.ts`.
- `__tests__/` — 30 test files (unit + property-based).
- Entry points: `app.ts` (Express app), `index.ts` (server + schedulers + env load), `migrate.ts`,
  `seed.ts`, `seed-upgrade.ts`.

---

## 6. Customer Feature Specifications

### 6.1 Authentication & accounts
- **Register / login** with email + password; JWT issued on success.
- **Profile**: view/update name, phone; change password.
- **Token-version revocation**: every user row carries `tokenVersion`. Logout and credential changes
  advance the version; tokens carrying a stale version are rejected on both HTTP and socket auth.
- **Password policy**: minimum length ≥ 8 with complexity rules; bcrypt cost factor ≥ 12.
- **Password reset**: `forgot-password` issues a high-entropy (≥ 128-bit) token, stored with expiry;
  `reset-password` compares in constant time, is single-use, and invalidates on use/expiry with a brief
  completion grace period. Reset tokens are never logged outside development.
- **Rate limiting**: register, login, and forgot-password endpoints are individually rate-limited.
- Endpoints: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/profile`,
  `POST /auth/change-password`, `POST /auth/logout`, `POST /auth/forgot-password`,
  `POST /auth/reset-password`. (`GET /profile` also returns the profile.)

### 6.2 Catalog, categories & search
- **Categories** with slug, image, description.
- **Products** with multiple **variants** (unit/unitValue, price, MRP, SKU, stock), images, tags,
  `taxRate`, featured flag, related products.
- **Search**: full product search, search suggestions, featured products, buy-again rail.
- All list endpoints are **bounded/paginated** (default + clamped max page size).
- Endpoints: `GET /categories`, `GET /categories/:id`, `GET /products` (filterable/paginated),
  `GET /products/featured`, `GET /products/search-suggestions`, `GET /products/:id`,
  `GET /products/:id/related`, `GET /products/buy-again`.

### 6.3 Cart & coupons
- **Cart line items keyed by `variantId`** — increment/decrement/remove affect the correct line (a
  unique constraint enforces one line per `(user, variant)`).
- **Honest bill details**: item subtotal, actual delivery fee (shows FREE only when fee is 0), and
  to-pay total — computed by the shared `computeCartTotals` helper.
- **Delivery fee logic**: `subtotal ≥ FREE_DELIVERY_THRESHOLD (₹499)` → free, else
  `STANDARD_DELIVERY_FEE (₹40)`; zone-based fee/serviceability via selected pincode.
- **Coupons**: apply/remove; **coupon suggestions** always include a `description` and a canonical
  `minOrderValue` (suggestions that cannot supply both are omitted). Discount is computed and **capped**
  (percentage capped at `maxDiscount` or the subtotal, never `Infinity`; flat never exceeds subtotal).
- Endpoints: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:variantId`,
  `DELETE /cart/items/:variantId`, `DELETE /cart/clear`, `POST /cart/apply-coupon`,
  `POST /cart/remove-coupon`, `GET /cart/coupon-suggestions`, `POST /cart/pincode`.

### 6.4 Flash sales
- Time-bound, per-product sale pricing (`percentage` or `fixed`). The pure `resolveVariantPricing`
  helper is the **single source of price**, consumed by both cart and order creation so the **displayed
  price equals the charged price**, evaluated at order-creation time. Percentage:
  `round(price × (1 − value/100))`; fixed: `max(0, price − value)`.
- Endpoints: `GET /flash-sales`, `GET /flash-sales/:id`.

### 6.5 Orders & lifecycle
- **Idempotent creation**: optional `idempotencyKey` (UUID) enforces at-most-once creation per user via
  a partial unique index `(user_id, idempotency_key)`; the web checkout generates one per attempt and
  resends on retry. A repeated key returns the original order with no extra debits.
- **State machine** (`lib/order-status.ts`):
  `pending → confirmed|cancelled`, `confirmed → processing|cancelled`,
  `processing → out_for_delivery|cancelled`, `out_for_delivery → delivered`,
  `delivered` and `cancelled` are terminal. Invalid transitions are rejected; a same-status save is an
  idempotent no-op (never re-awards loyalty).
- **Transactional side effects**: status change + loyalty award + stock restore + COD→paid run in one
  transaction.
- **Loyalty award exactly once** on first `delivered` (guarded by prior-status check + no prior `earn`
  transaction). Cancelled/returned never award.
- **Order notes** persisted and returned; **delivery slot** stored; **reorder** support.
- Endpoints: `GET /orders`, `POST /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`,
  `POST /orders/:id/reorder`, `GET /orders/:id/invoice`.

### 6.6 Payments (Razorpay + wallet + COD)
- **Honest payment status**:
  - **wallet** → `paid` only after the debit commits inside the transaction; else `pending`/`failed`,
    balance untouched.
  - **online** → `paid` only after a verified Razorpay authorization (signature + amount); else `pending`.
  - **cod** → `pending` at creation.
- **Razorpay**: REST order creation, HMAC signature verification for both checkout and webhook (verified
  against the raw request body), amount verification, webhook reconciliation by `razorpayOrderId`.
  When keys are absent, a **simulated provider** is used so local flows work.
- Endpoints: `GET /payments/config`, `POST /payments/razorpay/order`, `POST /payments/razorpay/webhook`.

### 6.7 Wallet (stored value)
- Balance + `credit|debit|refund` transaction ledger.
- **Atomic, non-negative debits** under a row-level lock (`SELECT … FOR UPDATE`); concurrent/duplicate
  checkouts can never overspend or drive the balance negative; DB CHECK `wallet_balance >= 0` backstops.
- **Top-up via Razorpay**: `POST /wallet/topup/order` + `POST /wallet/topup/confirm` (verified credit),
  with an "Add Money" flow in the web wallet page.
- Endpoints: `GET /wallet`, `GET /wallet/balance`, `POST /wallet/topup/order`, `POST /wallet/topup/confirm`.

### 6.8 Loyalty
- Earn `POINTS_PER_RUPEE_SPENT = 0.1` (1 point per ₹10); redeem `RUPEES_PER_POINT = 0.25` (4 points = ₹1).
  Loyalty transaction types: `earn|spend|expire|bonus`.
- Atomic, non-negative point debits at checkout (same locking guarantees as wallet); consistent earn-rate
  copy on the loyalty page.
- Endpoints: `GET /loyalty`, `GET /loyalty/balance`.

### 6.9 Referrals
- Each user has a unique `referralCode`. Referral records are created `pending` at registration linkage
  (default `rewardPoints = 100`).
- On a referred user's **first delivered order**, the referral advances `pending → rewarded` and credits
  the referrer **exactly once** (conditional update `WHERE status='pending'`, terminal `rewarded`, inside
  the delivery transaction).
- Endpoints: `GET /referrals/my`, `POST /referrals/validate`.

### 6.10 Returns & refunds
- Customers create return requests (reason); admins approve/reject with an optional note and refund amount.
- **Atomic, validated refunds**: wallet credit + `wallet_transactions` insert (type `refund`) + status
  update commit or roll back together; refund amount validated `0 ≤ refund ≤ amount paid`
  (`validateRefundAmount`).
- Endpoints (customer): `GET /returns`, `POST /returns`. (admin): `PATCH /returns/:id`.

### 6.11 Reviews & product Q&A
- **Reviews**: one review per `(user, product)` (unique), rating `1–5` (CHECK), optional images,
  admin approval/moderation.
- **Q&A**: customers ask questions on a product; admins answer/moderate.
- Endpoints: `GET /products/:id/reviews`, `POST /products/:id/reviews`,
  `GET /products/:productId/qa`, `POST /products/:productId/qa`.

### 6.12 Notifications, newsletter & back-in-stock
- **In-app notifications** with full columns (title, message, type, is_read).
- **Back-in-stock ("notify me")**: persists a subscription per `(user, variant)`, de-duplicated by a
  unique index; triggers a push when stock returns.
- **Newsletter**: subscribe/unsubscribe.
- Endpoints: `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`,
  `DELETE /notifications/:id`, `POST /products/variants/:variantId/notify-me`,
  `POST /newsletter/subscribe`, `POST /newsletter/unsubscribe`.

### 6.13 Addresses & delivery
- Multiple saved addresses with default flag, label, recipient, pincode (defaults: city Jaipur, state
  Rajasthan). **Map picker** for pin-drop + reverse-geocode.
- **Delivery slots** (label, time range, sort order) and **delivery zones** (pincodes, fee,
  free-delivery threshold).
- Endpoints: `GET/POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`,
  `GET /delivery-slots`, `GET /delivery/check`, `GET /delivery-zones`.

---

## 7. Admin Feature Specifications

Admin endpoints require `requireAdmin`. Admin web pages live under `/admin/*`.

- **Dashboard & analytics**: `GET /analytics/summary`, `/recent-orders`, `/top-products`,
  `/revenue-chart`, `/category-revenue`, `/low-stock`, `/customer-retention`, `/demand-by-pincode`.
- **Catalog**: products CRUD + duplicate, variant stock update, bulk variant price update; categories CRUD.
- **Coupons**: CRUD with `maxUsagePerUser`, percentage cap, reject percentage > 100.
- **Flash sales**: CRUD.
- **Banners**: CRUD (active window).
- **Orders**: list, status transition (`PATCH /orders/:id/status`), rider location
  (`POST /orders/:id/location`).
- **Returns**: approve/reject + refund (`PATCH /returns/:id`).
- **Reviews & Q&A moderation**: `GET /admin/reviews`, `PATCH/DELETE /admin/reviews/:id`,
  `GET /products/qa/all`, `PATCH /products/qa/:id/answer`, `DELETE /products/qa/:id`.
- **Delivery**: slots & zones CRUD.
- **Customers**: list/detail; admin wallet/loyalty credit (`POST /users/:id/wallet-credit`,
  `/loyalty-credit`).
- **Newsletter**: subscribers list; admin broadcast (`POST /admin/notifications/send`).
- **Settings**: `GET/PATCH /admin/settings` (jsonb store settings).
- **Export/import**: `GET /admin/export/orders|products|customers`, `POST /admin/import/products`.
- **Web admin pages**: dashboard, products, categories, orders, coupons, banners, customers (+detail),
  inventory, returns, flash-sales, reports, bulk-import, delivery, settings, newsletter, reviews, qa.

---

## 8. New Feature Waves

All implemented and verified (typecheck + web build green; endpoints exercised). Newer customer endpoints
use `customFetch` by design.

### Wave 1 — Maps: address picker + live tracking (Leaflet/OSM, no API key)
- `map-picker.tsx`: GPS locate + Nominatim reverse-geocode; used in checkout add-address and addresses page.
- `live-order-map.tsx`: rider position on order-detail.
- `POST /orders/:id/location` updates `rider_lat`/`rider_lng`; broadcast via socket `order_location`.

### Wave 2 — Web Push (VAPID, self-generated keys)
- `web-push` + VAPID, `push_subscriptions` table (unique per endpoint), `push.service.ts`.
- Service worker (`apps/web/public/sw.js`) push + notificationclick handlers; `lib/push.ts`;
  "Enable push" entry in the navbar bell.
- Endpoints: `GET /push/key`, `POST /push/subscribe`, `POST /push/unsubscribe`. Triggers on order status
  changes and back-in-stock.

### Wave 3 — Subscriptions / auto-reorder
- `subscriptions` table (frequency `daily|weekly|monthly`, `nextRunAt`, quantity, variant).
- In-process runner (`setInterval`, ~15 min) adds due refills to the cart and notifies the user.
- Endpoints: `GET/POST /subscriptions`, `DELETE /subscriptions/:id`; web `subscriptions` page;
  "Subscribe weekly" on the product page.

### Wave 4 — Buy Again
- `GET /products/buy-again`; `BuyAgainRail` on the home page.

### Wave 5 — Wallet top-up (Razorpay)
- `/wallet/topup/order` + `/wallet/topup/confirm` (verified credit); "Add Money" UI; `lib/razorpay-client.ts`.

### Wave 6 — Admin demand analytics
- `GET /analytics/demand-by-pincode` (pincode parsed from address); bar widget in admin reports
  (alongside low-stock).

### Wave 7 — Order chat
- `order_messages` table (sender `customer|admin`), `order-messages.service.ts`.
- Endpoints: `GET/POST /orders/:id/messages`; socket `order_message`; `OrderChat` component on
  order-detail. (Admin reply UI is future.)

---

## 9. Money Path & Correctness Properties

Pure money/pricing logic lives in `apps/api/src/lib/money.ts` (no DB imports → property-testable). Key
functions: `resolveVariantPricing`, `computeDebits`, `computeCartTotals`, `computeCouponDiscount`,
`buildCouponSuggestion`, `validateRefundAmount`; state machine in `lib/order-status.ts`.

**Invariants (covered by fast-check property tests):**
- Wallet and loyalty balances are always `≥ 0` after any debit, including under concurrency.
- The sum of successful concurrent debits never exceeds the balance available before either started.
- A retried/duplicated checkout with the same idempotency key produces at most one order and one set of debits.
- `order.total = sum(charged line prices) − discount + deliveryFee` (and `≥ 0`).
- Coupon discount is always within `[0, subtotal]`, capped (never `Infinity`).
- Payment status is `paid` only when funds were actually captured (wallet debit committed or Razorpay
  authorization verified).
- Loyalty points are awarded exactly once per order, only on first `delivered`.
- Refunds are atomic and bounded (`0 ≤ refund ≤ amount paid`).
- Validated/sanitized request data persists downstream under Express 5 (`req.validated`).
- Page sizes are clamped to a defined maximum; a default applies when omitted.

---

## 10. Data Model

Schema modules live in `packages/database/src/schema/` (24 modules). Versioned SQL migrations are the
single source of truth (applied to an empty DB they reproduce the Drizzle definitions). Columns below
use the logical names; monetary fields are Postgres `numeric(10,2)` unless noted.

### users
`id, name, email (unique), phone, passwordHash, role (customer|admin), walletBalance, loyaltyPoints,
referralCode (unique), resetToken, resetTokenExpiry, tokenVersion (default 1), createdAt`.
CHECK: `walletBalance >= 0`, `loyaltyPoints >= 0`.

### categories
`id, name, slug (unique), imageUrl, description, createdAt`.

### products
`id, name, slug (unique), description, imageUrl, images, categoryId→categories, isFeatured, tags,
taxRate numeric(5,2), createdAt`.

### product_variants
`id, productId→products (cascade), unit, unitValue, price, mrp, sku, stock (default 0)`.
Index: `productId`. CHECK: `price >= 0`, `stock >= 0`.

### cart_items
`id, userId→users (cascade), productId→products, variantId→variants, quantity (default 1), createdAt`.
Indexes: `userId`, `variantId`. Unique: `(userId, variantId)`. CHECK: `quantity > 0`.

### cart_sessions
`userId (PK)→users (cascade), couponCode, pincode` — selected coupon + delivery pincode per user.

### orders
`id, userId→users, status (order_status), paymentMethod (cod|online|wallet), paymentStatus
(pending|paid|failed|refunded), subtotal, discount, deliveryFee, gstAmount, walletAmountUsed,
loyaltyPointsUsed (int), total, address, couponCode, deliverySlot, referralCode, notes, idempotencyKey,
razorpayOrderId, razorpayPaymentId, riderLat numeric(10,7), riderLng numeric(10,7), createdAt`.
Indexes: `userId`, `status`. Partial unique: `(userId, idempotencyKey)` where key not null.
`order_status` enum: `pending, confirmed, processing, out_for_delivery, delivered, cancelled`.

### order_items
`id, orderId→orders (cascade), productId→products, variantId→variants, quantity, price, subtotal`.
CHECK: `quantity > 0`. `price` stores the **charged** (flash-sale-resolved) price.

### coupons
`id, code (unique), discountType (percentage|flat), discountValue, minOrderValue, maxDiscount,
description, isActive, expiresAt, usageCount, maxUsagePerUser, createdAt`.

### wishlist_items
`id, userId→users (cascade), productId→products (cascade), createdAt`. Unique: `(userId, productId)`.

### reviews
`id, userId→users (cascade), productId→products (cascade), rating, comment, images, isApproved, createdAt`.
Index: `productId`. Unique: `(userId, productId)`. CHECK: `rating BETWEEN 1 AND 5`.

### addresses
`id, userId→users (cascade), label, recipientName, phone, street, landmark, city (Jaipur),
state (Rajasthan), pincode, isDefault, createdAt`.

### notifications
`id, userId→users (cascade), title, message, type (default info), isRead, createdAt`.

### return_requests
`id, orderId→orders (cascade), userId→users (cascade), reason, status (pending|approved|rejected),
adminNote, refundAmount, refundCredited, createdAt`.

### flash_sales
`id, label, productId→products (cascade), discountType (percentage|fixed), discountValue, startsAt,
endsAt, isActive, createdAt`.

### loyalty_transactions
`id, userId→users (cascade), orderId→orders (set null), type (earn|spend|expire|bonus), points,
description, createdAt`.

### wallet_transactions
`id, userId→users (cascade), orderId→orders (set null), type (credit|debit|refund), amount,
description, createdAt`.

### product_qa
`id, productId→products (cascade), userId→users (cascade), question, answer, answeredBy→users,
isApproved, createdAt, answeredAt`.

### delivery_slots
`id, label, timeRange, isActive, sortOrder`.

### delivery_zones
`id, name, pincodes, deliveryFee (default 40), minOrderForFree (default 499), isActive, createdAt`.

### newsletter_subscribers
`id, email (unique), name, isActive, createdAt`.

### referrals
`id, referrerId→users, referredUserId→users, orderId→orders, status (pending|completed|rewarded),
rewardPoints (default 100), createdAt`.

### store_settings
`id, settings (jsonb)`.

### stock_notifications
`id, userId→users (cascade), variantId→variants (cascade), createdAt, notifiedAt`.
Unique: `(userId, variantId)`.

### push_subscriptions
`id, userId→users (cascade), endpoint, p256dh, auth, createdAt`. Unique: `endpoint`. Index: `userId`.

### subscriptions
`id, userId→users (cascade), productId→products (cascade), variantId→variants (cascade), quantity
(default 1), frequency (daily|weekly|monthly), nextRunAt, lastRunAt, isActive, createdAt`.
Indexes: `userId`, `nextRunAt`.

### order_messages
`id, orderId→orders (cascade), userId→users (cascade), sender (customer|admin), message, createdAt`.
Index: `orderId`.

---

## 11. Complete API Reference

All routes are mounted under the API base. Auth column: 🔓 public · 🔑 requireAuth · 🛡️ requireAdmin.

### Health
- 🔓 `GET /healthz` — DB connectivity check.

### Auth
- 🔓 `POST /auth/register` · 🔓 `POST /auth/login` · 🔑 `GET /auth/me` · 🔑 `PATCH /auth/profile`
- 🔑 `POST /auth/change-password` · 🔑 `POST /auth/logout`
- 🔓 `POST /auth/forgot-password` · 🔓 `POST /auth/reset-password`

### Users
- 🛡️ `GET /users` · 🛡️ `GET /users/:id` · 🛡️ `POST /users/:id/wallet-credit`
- 🛡️ `POST /users/:id/loyalty-credit` · 🔑 `GET /profile`

### Categories
- 🔓 `GET /categories` · 🔓 `GET /categories/:id` · 🛡️ `POST /categories` · 🛡️ `PATCH /categories/:id`
- 🛡️ `DELETE /categories/:id`

### Products & Q&A
- 🔓 `GET /products` · 🔑 `GET /products/buy-again` · 🔓 `GET /products/featured`
- 🔓 `GET /products/search-suggestions` · 🔓 `GET /products/:id/related` · 🔓 `GET /products/:id`
- 🛡️ `POST /products` · 🛡️ `POST /products/:id/duplicate` · 🛡️ `PATCH /products/:id` · 🛡️ `DELETE /products/:id`
- 🛡️ `PATCH /products/variants/:variantId/stock` · 🛡️ `PATCH /products/:id/variants/bulk-price`
- 🔑 `POST /products/variants/:variantId/notify-me`
- 🛡️ `GET /products/qa/all` · 🔓 `GET /products/:productId/qa` · 🔑 `POST /products/:productId/qa`
- 🛡️ `PATCH /products/qa/:id/answer` · 🛡️ `DELETE /products/qa/:id`

### Cart
- 🔑 `GET /cart` · 🔑 `GET /cart/coupon-suggestions` · 🔑 `POST /cart/items`
- 🔑 `PATCH /cart/items/:variantId` · 🔑 `DELETE /cart/items/:variantId` · 🔑 `DELETE /cart/clear`
- 🔑 `POST /cart/apply-coupon` · 🔑 `POST /cart/remove-coupon` · 🔑 `POST /cart/pincode`

### Orders
- 🔑 `GET /orders` · 🔑 `POST /orders` · 🔑 `GET /orders/:id` · 🛡️ `PATCH /orders/:id/status`
- 🛡️ `POST /orders/:id/location` · 🔑 `POST /orders/:id/cancel` · 🔑 `POST /orders/:id/reorder`
- 🔑 `GET /orders/:id/invoice` · 🔑 `GET /orders/:id/messages` · 🔑 `POST /orders/:id/messages`

### Payments
- 🔓 `GET /payments/config` · 🔑 `POST /payments/razorpay/order` · 🔓 `POST /payments/razorpay/webhook`

### Wallet & Loyalty
- 🔑 `GET /wallet` · 🔑 `GET /wallet/balance` · 🔑 `POST /wallet/topup/order` · 🔑 `POST /wallet/topup/confirm`
- 🔑 `GET /loyalty` · 🔑 `GET /loyalty/balance`

### Coupons (admin)
- 🛡️ `GET /coupons` · 🛡️ `POST /coupons` · 🛡️ `PATCH /coupons/:id` · 🛡️ `DELETE /coupons/:id`

### Flash sales
- 🔓 `GET /flash-sales` · 🔓 `GET /flash-sales/:id` · 🛡️ `POST /flash-sales` · 🛡️ `PATCH /flash-sales/:id`
- 🛡️ `DELETE /flash-sales/:id`

### Banners
- 🔓 `GET /banners` · 🛡️ `GET /banners/all` · 🛡️ `POST /banners` · 🛡️ `PATCH /banners/:id`
- 🛡️ `DELETE /banners/:id`

### Wishlist
- 🔑 `GET /wishlist` · 🔑 `POST /wishlist/items` · 🔑 `DELETE /wishlist/items/:productId`

### Reviews
- 🔓 `GET /products/:id/reviews` · 🔑 `POST /products/:id/reviews`
- 🛡️ `GET /admin/reviews` · 🛡️ `PATCH /admin/reviews/:id` · 🛡️ `DELETE /admin/reviews/:id`

### Addresses
- 🔑 `GET /addresses` · 🔑 `POST /addresses` · 🔑 `PATCH /addresses/:id` · 🔑 `DELETE /addresses/:id`

### Returns
- 🔑 `GET /returns` · 🔑 `POST /returns` · 🛡️ `PATCH /returns/:id`

### Referrals
- 🔑 `GET /referrals/my` · 🔓 `POST /referrals/validate`

### Notifications
- 🔑 `GET /notifications` · 🔑 `PATCH /notifications/read-all` · 🔑 `PATCH /notifications/:id/read`
- 🔑 `DELETE /notifications/:id` · 🛡️ `POST /admin/notifications/send`
- 🔑 `POST /products/variants/:id/notify-me`

### Newsletter
- 🔓 `POST /newsletter/subscribe` · 🔓 `POST /newsletter/unsubscribe` · 🛡️ `GET /newsletter/subscribers`

### Delivery
- 🔓 `GET /delivery-slots` · 🔓 `GET /delivery/check` · 🛡️ `GET /admin/delivery-slots`
- 🛡️ `POST /delivery-slots` · 🛡️ `PATCH /delivery-slots/:id` · 🛡️ `DELETE /delivery-slots/:id`
- 🔓 `GET /delivery-zones` · 🛡️ `POST /delivery-zones` · 🛡️ `PATCH /delivery-zones/:id`
- 🛡️ `DELETE /delivery-zones/:id`

### Push
- 🔓 `GET /push/key` · 🔑 `POST /push/subscribe` · 🔑 `POST /push/unsubscribe`

### Subscriptions
- 🔑 `GET /subscriptions` · 🔑 `POST /subscriptions` · 🔑 `DELETE /subscriptions/:id`

### Analytics (admin)
- 🛡️ `/analytics/summary` · `/recent-orders` · `/top-products` · `/revenue-chart` · `/category-revenue`
- 🛡️ `/low-stock` · `/customer-retention` · `/demand-by-pincode`

### Settings & Export (admin)
- 🛡️ `GET /admin/settings` · 🛡️ `PATCH /admin/settings`
- 🛡️ `GET /admin/export/orders|products|customers` · 🛡️ `POST /admin/import/products`

---

## 12. Web Application

### 12.1 Routing (wouter)
Routes are lazy-loaded behind a `Suspense` fallback. Guards: `protectedPage` (auth required),
`adminPage` (admin role; the role is computed once per render via `useMemo`).

**Public:** `/`, `/category/:slug`, `/product/:id`, `/cart`, `/login`, `/register`, `/search`,
`/flash-sales`, `/forgot-password`.

**Protected (customer):** `/checkout`, `/orders`, `/orders/:id`, `/orders/:id/invoice`, `/wishlist`,
`/profile`, `/loyalty`, `/wallet`, `/referral`, `/addresses`, `/subscriptions`.

**Admin (`/admin/*`):** dashboard, products, categories, orders, coupons, banners, customers,
customers/:id, inventory, returns, flash-sales, reports, bulk-import, delivery, settings, newsletter,
reviews, qa.

### 12.2 Key pages & components
- **Pages:** home (buy-again rail, banners, featured), category, product (variants, reviews, Q&A,
  notify-me, subscribe), cart, checkout (address + map picker + slot + payment), orders, order-detail
  (live map + chat), wallet (add money), loyalty, referral, addresses, subscriptions, search, profile,
  flash-sales, invoice, forgot-password, not-found.
- **Components:** `map-picker`, `live-order-map`, `address-form-dialog`, `error-boundary`, `seo`,
  layout (navbar with rotating search + cart total + notification bell), cart drawer, shadcn/ui kit.
- **Hooks:** `use-socket` (reactive token, reconnects on login/logout), `use-mobile`, `use-toast`.
- **Lib/stores:** `auth-store` (token + reactive subscription), `location-store` (selected pincode),
  `ui-store`, `custom-fetch`, `push`, `razorpay-client`, `utils`.

### 12.3 Data fetching
- TanStack Query via the orval-generated client for contract endpoints; consistent generated query-key
  helpers ensure lists/reviews refetch after mutations.
- Wallet/loyalty/referral pages check `res.ok` before reading the body, handle rejections, and render
  explicit loading + error states.

### 12.4 Brand & UX
- Keep the **green NTC primary brand**; layer Blinkit-style UX on top. A `--brand-yellow` accent token
  exists for highlights.
- Utilities defined in `apps/web/src/index.css`: `.scrollbar-hide`, `.pb-safe`, `.card-lift`.
- Sticky search navbar with rotating placeholder + live cart total; product-card hover lift + lazy
  images; slide-in cart drawer with honest bill details.

---

## 13. Realtime & Background Processing

### 13.1 Sockets (Socket.io)
- Authenticated connections: token-version validated; **admin privileges derived only from valid token
  claims** (never trusted from client input).
- The web client re-establishes the socket on login/logout **without a page reload** and gates login on
  a successful connection.
- Events: order status updates, `order_location` (live rider position), `order_message` (per-order chat).

### 13.2 Schedulers (in-process)
- **Subscription runner** (`setInterval`, ~15 min) in `index.ts`: finds due subscriptions, adds refills
  to the cart, and notifies the user. Runs inside the API process (see Limitations for scaling).

### 13.3 Webhooks
- Razorpay webhook verifies the HMAC signature against the **raw request body** (captured via the JSON
  body parser `verify` hook) and reconciles payment status by `razorpayOrderId`.

---

## 14. Security Model

- **Authentication:** JWT with `tokenVersion` revocation; logout and credential changes invalidate prior tokens.
- **Authorization:** `requireAuth` / `requireAdmin`; role from verified token claims only.
- **Passwords:** min length ≥ 8 + complexity; bcrypt cost ≥ 12.
- **Password reset:** ≥ 128-bit entropy, constant-time comparison (`lib/constant-time.ts`), single-use,
  expiry + grace; never logged outside development.
- **Secrets enforcement:** `SESSION_SECRET` strength enforced in **all** environments; the server refuses
  to start with a weak/placeholder value (`lib/env.ts`).
- **Transport/headers:** helmet, CORS allowlist (`ALLOWED_ORIGIN`), `TRUST_PROXY` controls trust of
  `X-Forwarded-*` to prevent rate-limit IP spoofing.
- **Rate limiting:** per-endpoint on register/login/forgot-password.
- **Input handling:** zod validation + XSS sanitization persisted on `req.validated` (Express 5 safe).
- **DB-level backstops:** CHECK constraints (non-negative balances/price/stock, rating range, positive
  quantities), uniqueness constraints, partial unique idempotency index.
- **Payments:** HMAC signature + amount verification on Razorpay order and webhook; orders never marked
  `paid` without verified funds.

> No secret values appear in this document or should appear in any committed file. Secrets are provided
> at runtime via git-ignored `.env` files; `.env.example` documents the variable names only.

---

## 15. Configuration & Environment Variables

Documented by **name and purpose only** — never commit real values.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Postgres connection string. |
| `SESSION_SECRET` | yes | — | JWT signing secret. Strength enforced in all environments (≥ 32 random chars in production); weak/placeholder values rejected at startup. |
| `PORT` | no | `5000` | API listen port. |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test`. |
| `ALLOWED_ORIGIN` | no | `http://localhost:3000` | Comma-separated CORS allowlist. |
| `TRUST_PROXY` | no | unset | Number of reverse proxies; unset means `X-Forwarded-*` not trusted. |
| `LOG_LEVEL` | no | `info` | pino log level. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | no | — | Razorpay credentials; absent → simulated payment provider. |
| `RAZORPAY_WEBHOOK_SECRET` | no | — | Verifies webhook signatures against the raw request body. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | no | — | Web Push keys (self-generated). |
| `VITE_API_URL` | no | `http://localhost:5000` | Web → API base URL (web build/runtime). |

Secrets live in `apps/api/.env` (git-ignored). The root `dev` scripts inject **local-only development**
values for `DATABASE_URL`/`SESSION_SECRET`/`PORT` purely for local convenience; production deployments
must supply their own strong secrets via the environment.

---

## 16. Testing Strategy

- **Runner:** vitest. **Property-based:** fast-check.
- **DB-free collection:** the database package uses a lazy pool (Proxy/getter) so importing it never
  throws when `DATABASE_URL` is unset — tests collect without a live DB; the error is deferred to first query.
- **Isolation:** tests scope cleanup to their own `userId` (no unscoped table deletes), so parallel files
  don't clobber each other.
- **Property tests** (`apps/api/src/__tests__/*.property.test.ts`) cover: pricing, debits, order totals,
  order status transitions, idempotency, coupon discount/validation/suggestion, numeric bounds, page-size
  clamp, password policy, refund bounds, stock notifications, token version, sanitized-downstream,
  cart-line isolation, order notes.
- **Integration/unit tests**: auth, logout, cart, categories, products, orders (+ regression), payment
  status, referral reward, refund atomicity, reset token, collection smoke.

---

## 17. Build, CI & Operations

### Commands
- `pnpm run dev` — runs API (port 5000) + web (port 3000) concurrently.
- `pnpm run typecheck` — typecheck all workspaces (`typecheck:libs` builds project references first).
- `pnpm run build` — typecheck then build all packages/apps.
- `pnpm --filter @workspace/web run build` — web production build.
- DB schema change flow: `pnpm run typecheck:libs` → `pnpm --filter @workspace/database run generate`
  (drizzle-kit) → `pnpm --filter @workspace/database run migrate` (with `DATABASE_URL` set).

### CI (`.github/workflows/ci.yml`)
- Typecheck + build job.
- Test job: starts a Postgres service, applies the schema, runs the migration, executes the API test suite.

### Local infrastructure
- Postgres in Docker (container `mart_postgres`, database `mart`).
- `infrastructure/` holds docker, nginx, kubernetes, terraform, and monitoring config for deployment.

---

## 18. Non-functional Requirements

- **Reproducibility:** versioned SQL migrations are the single source of truth; applying to an empty DB
  yields a schema equivalent to the Drizzle definitions, including all indexes/constraints.
- **Performance:** bounded/paginated queries (clamped page size + default); indexes on hot/FK columns;
  lazy DB pool; bounded joins instead of full-table scans.
- **Reliability:** transactional money paths; idempotent order creation; atomic refunds.
- **Security:** see §14.
- **Observability:** pino structured logging; errors logged rather than swallowed.
- **Testability:** DB-free test collection; property-based coverage of the money path.
- **Accessibility:** shadcn/ui primitives provide accessible defaults; continue to validate with assistive
  tech for full WCAG conformance.

---

## 19. Known Limitations & Roadmap

**Current limitations**
- **In-process scheduler & sockets:** the subscription runner and Socket.io run inside the API process.
  Horizontal scaling needs a durable job runner and a shared socket adapter (e.g., Redis).
- **Payments:** real Razorpay is wired; absent keys fall back to a simulated provider, so online orders
  won't auto-mark paid without a real verified authorization.
- **Order chat:** customer side + data model exist; **admin reply UI is not built yet**.
- **Rider tracking:** location is posted via API/socket; there is **no dedicated rider app/UI**.
- **Contract coverage:** newer customer endpoints use `customFetch`; extending `openapi.yaml` to cover
  them (and regenerating the typed client) is future cleanup.

**Roadmap candidates**
- Admin order-chat reply console; rider PWA/app for live location + status updates.
- Durable scheduler (BullMQ/cron worker) and Redis socket adapter for multi-instance scale.
- Full OpenAPI coverage of all customer endpoints + fully generated client (drop `customFetch`).
- Loyalty point expiry job; coupon per-user usage enforcement surfaced in UI.
- Multi-warehouse inventory and serviceability by geofence.

---

## 20. Glossary

- **Variant:** A purchasable SKU of a product (unit/size/price/stock); the canonical key for cart lines.
- **Idempotency key:** Client-supplied UUID guaranteeing at-most-once order creation per user.
- **Effective price:** The price actually charged for a variant after flash-sale resolution.
- **Token version:** Per-user counter enabling JWT revocation (logout / credential change).
- **Free-delivery threshold:** Subtotal at/above which delivery is free (₹499 default).
- **PBT:** Property-based testing (fast-check) — asserts invariants over generated inputs.
- **Contract-first:** OpenAPI spec drives generated zod schemas and the React-Query client.
