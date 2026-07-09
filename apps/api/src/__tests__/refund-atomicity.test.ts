import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  usersTable,
  ordersTable,
  returnRequestsTable,
  walletTransactionsTable,
} from "@workspace/database";
import { eq, and } from "drizzle-orm";

// These example tests exercise the transactional, bounds-checked refund flow
// (R5.1, R5.2, R5.4) against a real database. They are skipped locally (no
// DATABASE_URL) and run in CI where Postgres exists.
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Return refund atomicity and bounds (R5)", () => {
  let updateReturn: typeof import("../services/returns.service").returnsService.updateReturn;
  let RefundValidationError: typeof import("../services/returns.service").RefundValidationError;
  let userId = 0;
  let orderId = 0;
  const ORDER_TOTAL = 250.0;
  const userEmail = `refund_user_${Date.now()}@test.in`;

  beforeAll(async () => {
    const svc = await import("../services/returns.service");
    updateReturn = svc.returnsService.updateReturn.bind(svc.returnsService);
    RefundValidationError = svc.RefundValidationError;

    const [user] = await db.insert(usersTable).values({
      name: "Refund User",
      email: userEmail,
      phone: "1234567890",
      passwordHash: "x",
      walletBalance: "0",
    }).returning();
    userId = user.id;

    const [order] = await db.insert(ordersTable).values({
      userId,
      status: "delivered",
      paymentMethod: "cod",
      subtotal: ORDER_TOTAL.toString(),
      total: ORDER_TOTAL.toString(),
      address: "1 Test St, City 123456",
    }).returning();
    orderId = order.id;
  });

  async function freshReturn() {
    const [r] = await db.insert(returnRequestsTable).values({
      orderId,
      userId,
      reason: "Damaged",
    }).returning();
    return r;
  }

  async function walletBalance() {
    const [u] = await db.select({ b: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.id, userId));
    return parseFloat(u.b ?? "0");
  }

  it("credits the wallet and records a 'refund' transaction on approval (R5.1, R5.4)", async () => {
    const r = await freshReturn();
    const before = await walletBalance();

    const result = await updateReturn(r.id, { status: "approved", refundAmount: 100 });
    expect(result?.status).toBe("approved");
    expect(result?.refundCredited).toBe(true);

    const after = await walletBalance();
    expect(after - before).toBeCloseTo(100, 2);

    const txns = await db.select().from(walletTransactionsTable)
      .where(and(eq(walletTransactionsTable.userId, userId), eq(walletTransactionsTable.orderId, orderId)));
    const refundTxns = txns.filter((t) => t.type === "refund");
    expect(refundTxns.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(refundTxns[refundTxns.length - 1].amount)).toBeCloseTo(100, 2);
  });

  it("defaults the refund to the order total when not supplied, never exceeding it (R5.3)", async () => {
    const r = await freshReturn();
    const before = await walletBalance();

    const result = await updateReturn(r.id, { status: "approved" });
    expect(result?.refundAmount).toBeCloseTo(ORDER_TOTAL, 2);

    const after = await walletBalance();
    expect(after - before).toBeCloseTo(ORDER_TOTAL, 2);
  });

  it("rejects an over-limit refund and leaves neither credit nor status change (R5.2, R5.3)", async () => {
    const r = await freshReturn();
    const before = await walletBalance();

    await expect(updateReturn(r.id, { status: "approved", refundAmount: ORDER_TOTAL + 1000 }))
      .rejects.toBeInstanceOf(RefundValidationError);

    // No wallet credit applied.
    const after = await walletBalance();
    expect(after).toBeCloseTo(before, 2);

    // Return left unchanged (still pending, not credited).
    const [unchanged] = await db.select().from(returnRequestsTable).where(eq(returnRequestsTable.id, r.id));
    expect(unchanged.status).toBe("pending");
    expect(unchanged.refundCredited).toBe(false);
  });

  it("rejects a negative refund amount (R5.3)", async () => {
    const r = await freshReturn();
    await expect(updateReturn(r.id, { status: "approved", refundAmount: -5 }))
      .rejects.toBeInstanceOf(RefundValidationError);
  });

  afterAll(async () => {
    if (!hasDb) return;
    await db.delete(walletTransactionsTable).where(eq(walletTransactionsTable.userId, userId));
    await db.delete(returnRequestsTable).where(eq(returnRequestsTable.userId, userId));
    await db.delete(ordersTable).where(eq(ordersTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  });
});
