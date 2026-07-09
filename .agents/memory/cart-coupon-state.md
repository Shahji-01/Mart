---
name: Cart coupon in-memory state
description: How coupon codes are stored per user session in cart.ts
---
- Coupon codes stored in `userCoupons = new Map<number, string>()` in cart.ts
- Cleared on server restart — acceptable for phase 1 single-instance setup
- Expiry check: `isCouponExpired(coupon.expiresAt)` — compares against `new Date()`
- Remove coupon: `POST /api/cart/remove-coupon` calls `userCoupons.delete(userId)`

**Why:** In-memory is fine for single-server local operation. If horizontal scaling needed later, move to Redis or DB-backed session.
