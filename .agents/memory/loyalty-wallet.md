---
name: Loyalty & Wallet system
description: Earning rates, redemption, API routes required by checkout
---
- Earning: `POINTS_PER_RUPEE_SPENT = 0.1` (1 point per ₹10 spent), awarded on "delivered" status
- Redeeming: `RUPEES_PER_POINT = 0.25` (4 points = ₹1)
- Constants live in `artifacts/api-server/src/routes/loyalty.ts` and imported by `orders.ts`
- Checkout calls `/api/wallet/balance` → `{balance}` and `/api/loyalty/balance` → `{points, equivalentRupees}`
- These sub-routes MUST exist or checkout silently shows ₹0 for both

**Why:** Checkout fetches these at load time to decide whether to show the wallet/loyalty section at all. Without them the 404 causes the section to never render even when the user has balance.

**How to apply:** Any time wallet or loyalty routes are modified, ensure `/wallet/balance` and `/loyalty/balance` remain registered.
