import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", result.token, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
      const mockPayload = Buffer.from(JSON.stringify({ role: result.user.role })).toString("base64");
      const mockToken = `mock.${mockPayload}.mock`;
      res.status(201).json({ ...result, token: mockToken });
    } catch (err: any) {
      if (err.message === "Email already in use") {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", result.token, { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
      const mockPayload = Buffer.from(JSON.stringify({ role: result.user.role })).toString("base64");
      const mockToken = `mock.${mockPayload}.mock`;
      res.json({ ...result, token: mockToken });
    } catch (err: any) {
      if (err.message === "Invalid credentials") {
        res.status(401).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.getProfile(req.user.userId);
      res.json(result);
    } catch (err: any) {
      if (err.message === "User not found") {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.updateProfile(req.user.userId, req.validated.body);
      res.json(result);
    } catch (err: any) {
      if (err.message === "User not found") {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.deleteAccount(req.user.userId);
      res.clearCookie("token");
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.changePassword(req.user.userId, req.body);
      res.json(result);
    } catch (err: any) {
      if (err.message === "User not found") res.status(404).json({ error: err.message });
      else if (err.message === "Current password is incorrect") res.status(400).json({ error: err.message });
      else next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await authService.logout(req.user.userId);
      res.clearCookie("token");
      res.json(result);
    } catch (err: any) {
      if (err.message === "User not found") {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {    try {
      const { email } = req.body;
      const result = await authService.generatePasswordResetToken(email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resetPassword(req.body);
      res.json(result);
    } catch (err: any) {
      if (err.message.includes("reset token")) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  }
}

export const authController = new AuthController();
