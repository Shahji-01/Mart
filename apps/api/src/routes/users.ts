import { Router } from "express";
import { requireAdmin, requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { usersController } from "../controllers/users.controller";
import {
  getUsersQuerySchema,
  userIdParamSchema,
  walletCreditSchema,
  loyaltyCreditSchema
} from "../schemas/users.schema";

const router = Router();

router.get("/users", requireAdmin, validateRequest(getUsersQuerySchema), usersController.getUsers);
router.get("/users/:id", requireAdmin, validateRequest(userIdParamSchema), usersController.getUserById);
router.post("/users/:id/wallet-credit", requireAdmin, validateRequest(walletCreditSchema), usersController.creditWallet);
router.post("/users/:id/loyalty-credit", requireAdmin, validateRequest(loyaltyCreditSchema), usersController.creditLoyalty);
router.get("/profile", requireAuth, usersController.getProfile);

export default router;
