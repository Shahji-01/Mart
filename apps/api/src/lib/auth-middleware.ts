import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env";
import { db, usersTable } from "@workspace/database";
import { eq } from "drizzle-orm";
import { tokenVersionMatches } from "./token-version";

const JWT_SECRET = env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is missing. Refusing to start.");
}

export interface AuthPayload { userId: number; role: string; tokenVersion?: number; }

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as AuthPayload;
    
    const [user] = await db.select({ tokenVersion: usersTable.tokenVersion }).from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user || !tokenVersionMatches(payload.tokenVersion, user.tokenVersion)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET as string) as AuthPayload;
      const [user] = await db.select({ tokenVersion: usersTable.tokenVersion }).from(usersTable).where(eq(usersTable.id, payload.userId));
      if (user && tokenVersionMatches(payload.tokenVersion, user.tokenVersion)) {
        req.user = payload;
      }
    } catch {
      // ignore
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}
