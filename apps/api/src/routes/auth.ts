import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { authController } from "../controllers/auth.controller";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "../schemas/auth.schema";

const router = Router();

const loginLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, message: { error: "Too many login attempts. Try again in a minute." } });
const registerLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, message: { error: "Too many requests. Try again later." } });
const forgotLimiter = rateLimit({ windowMs: 5 * 60 * 1000, limit: 5, message: { error: "Too many requests. Try again later." } });

router.post("/auth/register", registerLimiter, validateRequest(registerSchema), authController.register);
router.post("/auth/login", loginLimiter, validateRequest(loginSchema), authController.login);
router.get("/auth/me", requireAuth, authController.getProfile);
router.patch("/auth/profile", requireAuth, validateRequest(updateProfileSchema), authController.updateProfile);
router.post("/auth/change-password", requireAuth, validateRequest(changePasswordSchema), authController.changePassword);
router.post("/auth/logout", requireAuth, authController.logout);
router.post("/auth/forgot-password", forgotLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post("/auth/reset-password", validateRequest(resetPasswordSchema), authController.resetPassword);

export default router;
