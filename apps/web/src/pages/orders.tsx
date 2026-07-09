import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Package, ChevronRight, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetOrders, useAddToCart, getGetCartQueryKey, getGetOrdersQueryKey } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@/lib/custom-fetch";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const token = authStore.getToken();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const addToCart = useAddToCart();
  const [reordering, setReordering] = useState<number | null>(null);
  const { data: orders, isLoading } = useGetOrders(undefined, { query: { enabled: !!token, queryKey: getGetOrdersQueryKey() } });

  async function handleReorder(orderId: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { setLocation("/login"); return; }
    setReordering(orderId);
    try {
      const res = await customFetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const order = await res.json() as { items: Array<{ productId: number; variantId: number; quantity: number; productName: string }> };
      for (const item of order.items ?? []) {
        await addToCart.mutateAsync({ data: { productId: item.productId, variantId: item.variantId, quantity: item.quantity } });
      }
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Items added to cart!", description: "Tap Cart to review your order." });
      setLocation("/cart");
    } catch {
      toast({ title: "Reorder failed", description: "Some items may be out of stock", variant: "destructive" });
    } finally { setReordering(null); }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="text-center py-20">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold">Please login to view your orders</p>
          <Link href="/login"><Button className="mt-4 bg-primary">Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : !orders?.length ? (
          <div className="text-center py-20">
            <Package className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">No orders yet</h2>
            <p className="text-muted-foreground text-sm mt-1">Your orders will appear here</p>
            <Link href="/category/all"><Button className="mt-6 bg-primary">Start Shopping</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="bg-card rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer" data-testid={`order-card-${order.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Order #{order.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"} border-0 text-xs`} data-testid={`status-${order.id}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary" data-testid={`total-${order.id}`}>₹{order.total.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      disabled={reordering === order.id}
                      onClick={(e) => handleReorder(order.id, e)}
                      data-testid={`button-reorder-${order.id}`}
                    >
                      <RefreshCw className={`h-3 w-3 ${reordering === order.id ? "animate-spin" : ""}`} />
                      {reordering === order.id ? "Adding..." : "Reorder"}
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
