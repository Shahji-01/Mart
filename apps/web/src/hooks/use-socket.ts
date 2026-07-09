import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthToken } from "@/lib/auth-store";
import { getGetOrdersQueryKey, getGetOrderQueryKey } from "@workspace/api-client";
import { useToast } from "./use-toast";
import { useQueryClient } from "@tanstack/react-query";

let socket: Socket | null = null;

function teardownSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Establish a connected socket for the given token, retrying via socket.io
 * reconnection until the `connect` event fires. Resolves once connected so
 * callers can gate "login complete" on a live connection (R13.2).
 */
export function connectSocket(token: string): Promise<Socket> {
  // Re-establish from scratch so a stale token never lingers (R13.1).
  teardownSocket();
  const s = io(import.meta.env.VITE_API_URL || "", {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
  });
  socket = s;
  return new Promise<Socket>((resolve) => {
    if (s.connected) { resolve(s); return; }
    s.once("connect", () => resolve(s));
  });
}

export function useSocket() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = useAuthToken();

  useEffect(() => {
    // On logout (token cleared) tear the socket down without a reload (R13.1).
    if (!token) {
      teardownSocket();
      return;
    }

    let cancelled = false;

    connectSocket(token).then((s) => {
      if (cancelled) return;

      s.on("order_status_update", (data: { orderId: number; status: string }) => {
        const readableStatus = data.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        toast({
          title: "Order Update",
          description: `Order #${data.orderId} is now ${readableStatus}`,
        });

        // Refresh order views using the generated query keys so invalidation
        // matches the live queries.
        void qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetOrderQueryKey(data.orderId) });
      });
    });

    // Re-run on token change (login/logout) so the socket reconnects with the
    // new identity without a page reload.
    return () => { cancelled = true; };
  }, [token, toast, qc]);
}
