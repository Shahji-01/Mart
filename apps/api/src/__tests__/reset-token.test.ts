import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { constantTimeEqual } from "../lib/constant-time";

const hasDb = !!process.env.DATABASE_URL;

// ── DB-free: constant-time comparison wrapper (R24.2) ────────────────────────
describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("ABCDEF0123", "ABCDEF0123")).toBe(true);
  });

  it("returns false for same-length but different strings", () => {
    expect(constantTimeEqual("ABCDEF0123", "ABCDEF0124")).toBe(false);
  });

  it("returns false on length mismatch instead of throwing", () => {
    expect(constantTimeEqual("ABC", "ABCDEF")).toBe(false);
    expect(constantTimeEqual("", "A")).toBe(false);
  });

  it("treats empty strings as equal", () => {
    expect(constantTimeEqual("", "")).toBe(true);
  });
});

// ── DB-gated: token lifecycle behaviors (R24.1, R24.3, R24.4) ────────────────
describe.skipIf(!hasDb)("password reset token lifecycle", () => {
  let authService: typeof import("../services/auth.service").authService;
  let db: typeof import("@workspace/database").db;
  let usersTable: typeof import("@workspace/database").usersTable;
  let eq: typeof import("drizzle-orm").eq;
  let bcrypt: typeof import("bcryptjs").default;

  const email = `reset_${Date.now()}@test.in`;
  let userId = 0;

  beforeAll(async () => {
    ({ authService } = await import("../services/auth.service"));
    ({ db, usersTable } = await import("@workspace/database"));
    ({ eq } = await import("drizzle-orm"));
    bcrypt = (await import("bcryptjs")).default;

    const passwordHash = await bcrypt.hash("Password1!", 12);
    const [user] = await db
      .insert(usersTable)
      .values({ name: "Reset User", email, phone: "1234567890", passwordHash })
      .returning();
    userId = user.id;
  });

  afterAll(async () => {
    if (!hasDb) return;
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  });

  it("generates a high-entropy token (32 hex chars = 128 bits) and does not log in test env", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await authService.generatePasswordResetToken(email);
    // Log is gated behind NODE_ENV === "development"; in test it must not fire.
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    expect(user.resetToken).toMatch(/^[0-9A-F]{32}$/);
  });

  it("invalidates the token after a single successful use (R24.4)", async () => {
    await authService.generatePasswordResetToken(email);
    const [withToken] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const token = withToken.resetToken!;

    const res = await authService.resetPassword({ email, token, newPassword: "NewPass1!" });
    expect(res.message).toContain("successfully");

    // Token cleared; reuse must fail.
    const [afterUse] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    expect(afterUse.resetToken).toBeNull();
    await expect(
      authService.resetPassword({ email, token, newPassword: "Another1!" }),
    ).rejects.toThrow();
  });

  it("rejects a wrong token via constant-time comparison (R24.2)", async () => {
    await authService.generatePasswordResetToken(email);
    await expect(
      authService.resetPassword({ email, token: "0".repeat(32), newPassword: "NewPass2!" }),
    ).rejects.toThrow("Invalid reset token");
  });

  it("supports administrative pre-invalidation (R24.5)", async () => {
    await authService.generatePasswordResetToken(email);
    const [withToken] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const token = withToken.resetToken!;

    await authService.invalidatePasswordResetToken(userId);

    await expect(
      authService.resetPassword({ email, token, newPassword: "NewPass3!" }),
    ).rejects.toThrow();
  });
});
