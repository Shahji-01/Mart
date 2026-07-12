import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/database";
import { usersTable, referralsTable, addressesTable, cartTable, wishlistTable, pushSubscriptionsTable } from "@workspace/database";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { constantTimeEqual } from "../lib/constant-time";
import { emailService } from "./email.service";

// Brief grace window (ms) applied when checking reset-token expiry so a token
// expiring mid-request can still complete. Kept small to limit exposure.
const RESET_TOKEN_EXPIRY_GRACE_MS = 5000;

// bcrypt cost factor used everywhere passwords are hashed (R25.3).
const BCRYPT_COST = 12;

// Re-exported for callers/tests that already import from the service; the pure
// implementation lives in lib/constant-time so it can be tested DB-free.
export { constantTimeEqual };

export class AuthService {
  private getJwtSecret() {
    return env.SESSION_SECRET;
  }

  async register(data: any) {
    const { name, email, password, phone, referralCode } = data;
    
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      throw new Error("Email already in use");
    }
    
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const [user] = await db.insert(usersTable).values({ name, email, phone, passwordHash }).returning();
    
    if (referralCode) {
      try {
        const [referrer] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, referralCode.toUpperCase())).limit(1);
        if (referrer && referrer.id !== user.id) {
          await db.insert(referralsTable).values({ referrerId: referrer.id, referredUserId: user.id });
        }
      } catch (err) {
        // Referral linkage is best-effort; log so failures are observable
        // instead of being silently swallowed (R27.1).
        logger.error({ err, referralCode, userId: user.id }, "Failed to link referral on registration");
      }
    }
    
    // Send welcome email asynchronously
    emailService
      .sendWelcomeEmail(user.email, user.name)
      .catch((err) => logger.error({ err, userId: user.id }, "Failed to send welcome email"));
    
    const token = jwt.sign({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 1 }, this.getJwtSecret(), { expiresIn: "7d" });
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() }
    };
  }

  async login(data: any) {
    const { email, password } = data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    
    if (!user) throw new Error("Invalid credentials");
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error("Invalid credentials");
    
    const token = jwt.sign({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 1 }, this.getJwtSecret(), { expiresIn: "7d" });
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() }
    };
  }

  async getProfile(userId: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) throw new Error("User not found");
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() };
  }

  async updateProfile(userId: number, data: any) {
    const { name, phone } = data;
    const [user] = await db.update(usersTable).set({ name, phone }).where(eq(usersTable.id, userId)).returning();
    if (!user) throw new Error("User not found");
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt.toISOString() };
  }

  async logout(userId: number) {
    const [user] = await db.select({ tokenVersion: usersTable.tokenVersion }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) throw new Error("User not found");
    // Bumping tokenVersion invalidates every currently-issued token for this
    // user, since requireAuth compares the token's tokenVersion to the stored value.
    await db.update(usersTable).set({ tokenVersion: (user.tokenVersion ?? 1) + 1 }).where(eq(usersTable.id, userId));
    return { message: "Logged out successfully" };
  }

  async changePassword(userId: number, data: any) {
    const { currentPassword, newPassword } = data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) throw new Error("User not found");
    
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");
    
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await db.update(usersTable).set({ passwordHash, tokenVersion: (user.tokenVersion ?? 1) + 1 }).where(eq(usersTable.id, userId));
    return { message: "Password changed successfully" };
  }

  async generatePasswordResetToken(email: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      return { message: "If this email exists, a reset code has been sent." };
    }
    
    const resetToken = crypto.randomBytes(16).toString("hex").toUpperCase();
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await db.update(usersTable).set({ resetToken, resetTokenExpiry }).where(eq(usersTable.id, user.id));
    if (env.NODE_ENV === "development") {
      logger.debug(`[DEV ONLY] Password reset token generated: ${resetToken}`);
    }

    return {
      message: "If this email exists, a reset code has been sent.",
    };
  }

  /**
   * Administrative pre-invalidation: clears any outstanding reset token for the
   * user so it can no longer be used (R24.5).
   */
  async invalidatePasswordResetToken(userId: number) {
    await db.update(usersTable).set({ resetToken: null, resetTokenExpiry: null }).where(eq(usersTable.id, userId));
    return { message: "Reset token invalidated." };
  }

  async deleteAccount(userId: number) {
    await db.transaction(async (tx) => {
      // 1. Delete associated non-essential data
      await tx.delete(addressesTable).where(eq(addressesTable.userId, userId));
      await tx.delete(cartTable).where(eq(cartTable.userId, userId));
      await tx.delete(wishlistTable).where(eq(wishlistTable.userId, userId));
      await tx.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));

      // 2. Anonymize user data to prevent FK constraint failures on orders
      await tx.update(usersTable).set({
        name: "Deleted User",
        email: `deleted_${userId}@shankeshwartraders.in`,
        phone: "0000000000",
        passwordHash: "deleted",
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
        resetToken: null,
        resetTokenExpiry: null,
      }).where(eq(usersTable.id, userId));
    });

    return { message: "Account deleted successfully" };
  }

  async resetPassword(data: any) {
    const { email, token, newPassword } = data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user || !user.resetToken || !user.resetTokenExpiry) throw new Error("Invalid or expired reset token");

    // Expiry check with a brief grace window (R24.6). On expiry, invalidate the
    // stored token so it cannot be reused (R24.4).
    if (Date.now() > user.resetTokenExpiry.getTime() + RESET_TOKEN_EXPIRY_GRACE_MS) {
      await db.update(usersTable).set({ resetToken: null, resetTokenExpiry: null }).where(eq(usersTable.id, user.id));
      throw new Error("Reset token has expired");
    }

    // Constant-time comparison over equal-length buffers (R24.2).
    if (!constantTimeEqual(user.resetToken, token.toUpperCase())) throw new Error("Invalid reset token");

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    // Single-use: clear the token on successful reset (R24.4) and bump tokenVersion.
    await db.update(usersTable).set({ passwordHash, resetToken: null, resetTokenExpiry: null, tokenVersion: (user.tokenVersion ?? 1) + 1 }).where(eq(usersTable.id, user.id));

    return { message: "Password reset successfully. You can now login." };
  }
}

export const authService = new AuthService();
