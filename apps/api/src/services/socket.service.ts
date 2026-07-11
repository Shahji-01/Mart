import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/database";
import { eq } from "drizzle-orm";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { tokenVersionMatches } from "../lib/token-version";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

let io: SocketIOServer | null = null;

// Token claims signed by AuthService: { userId, role, tokenVersion }.
interface SocketTokenClaims {
  userId: number;
  role?: string;
  tokenVersion?: number;
}

export const socketService = {
  init(server: HttpServer) {
    const allowedOrigins = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
    
    let adapter;
    if (env.REDIS_URL) {
      try {
        const pubClient = new Redis(env.REDIS_URL);
        const subClient = pubClient.duplicate();
        
        pubClient.on("error", (err) => logger.error({ err: err.message }, "Redis pubClient Error"));
        subClient.on("error", (err) => logger.error({ err: err.message }, "Redis subClient Error"));

        adapter = createAdapter(pubClient, subClient);
        logger.info("Socket.io using Redis adapter");
      } catch (err) {
        logger.error({ err }, "Failed to initialize Redis adapter for Socket.io");
      }
    }

    io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      adapter,
    });

    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }
      try {
        const decoded = jwt.verify(token, env.SESSION_SECRET) as SocketTokenClaims;

        // Validate the token's version against the stored user version so
        // logged-out / credential-changed tokens are rejected, mirroring
        // requireAuth (R13.4, R23.2).
        const [user] = await db
          .select({ tokenVersion: usersTable.tokenVersion })
          .from(usersTable)
          .where(eq(usersTable.id, decoded.userId));
        if (!user || !tokenVersionMatches(decoded.tokenVersion, user.tokenVersion)) {
          return next(new Error("Authentication error"));
        }

        socket.data.userId = decoded.userId;
        // Derive admin privileges from the role claim actually present in the
        // verified token (not a non-existent `isAdmin` field) (R13.3).
        socket.data.isAdmin = decoded.role === "admin";
        next();
      } catch (err) {
        next(new Error("Authentication error"));
      }
    });

    io.on("connection", (socket) => {
      logger.info({ userId: socket.data.userId, socketId: socket.id }, "User connected to socket");
      // Join a room named after their user ID to receive direct messages
      socket.join(`user_${socket.data.userId}`);

      socket.on("disconnect", () => {
        logger.info({ userId: socket.data.userId, socketId: socket.id }, "User disconnected from socket");
      });
    });

    logger.info("Socket.io initialized");
  },

  notifyOrderStatus(userId: number, orderId: number, status: string) {
    if (io) {
      io.to(`user_${userId}`).emit("order_status_update", { orderId, status });
    }
  },

  /** Push a live rider location for an in-transit order to the customer. */
  notifyOrderLocation(userId: number, orderId: number, lat: number, lng: number) {
    if (io) {
      io.to(`user_${userId}`).emit("order_location", { orderId, lat, lng });
    }
  },

  /** Push a new order-support chat message to the order's customer. */
  notifyOrderMessage(userId: number, message: { id: number; orderId: number; sender: string; message: string; createdAt: string }) {
    if (io) {
      io.to(`user_${userId}`).emit("order_message", message);
    }
  },
};
