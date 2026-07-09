import { useParams, Link } from "wouter";
import { ArrowLeft, Package, MapPin, CreditCard, CheckCircle2, Clock, Truck, Home, XCircle, RotateCcw, FileText, RefreshCw, MessageCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client";
import { Navbar } from "@/components/layout/navbar";
import { LiveOrderMap } from "@/components/live-order-map";
import { useState, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { customFetch } from "@/lib/custom-fetch";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { status: "pending", label: "Order Placed", icon: Package },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { status: "processing", label: "Processing", icon: Clock },
  { status: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { status: "delivered", label: "Delivered", icon: Home },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

interface ReturnRequest { id: number; orderId: number; reason: string; status: string; adminNote?: string; createdAt: string; }

function ReorderButton({ orderId }: { orderId: number }) {
  const { toast } = useToast();
  const token = authStore.getToken();
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  async function reorder() {
    setLoading(true);
    const res = await customFetch(`/api/orders/${orderId}/reorder`, { method: "POST" });
    if (res.ok) { const data = await res.json(); toast({ title: `${data.count} items added to cart` }); qc.invalidateQueries(); }
    else { toast({ title: "Failed to reorder", variant: "destructive" }); }
    setLoading(false);
  }
  return (
    <Button variant="outline" className="gap-2" onClick={reorder} disabled={loading}>
      <RefreshCw className="h-4 w-4" />{loading ? "Adding..." : "Reorder"}
    </Button>
  );
}

const SOCKET_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

interface ChatMsg { id: number; orderId: number; sender: string; message: string; createdAt: string; }

function OrderChat({ orderId }: { orderId: number }) {
  const token = authStore.getToken();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    customFetch(`/api/orders/${orderId}/messages`).then(r => r.ok ? r.json() : []).then(d => setMsgs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [orderId]);

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("order_message", (m: ChatMsg) => {
      if (m.orderId === orderId) setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    });
    return () => { socket.disconnect(); };
  }, [orderId, token]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send() {
    const message = text.trim();
    if (!message) return;
    setText("");
    const res = await customFetch(`/api/orders/${orderId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
    });
    if (res.ok) {
      const m = await res.json();
      setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    }
  }

  return (
    <div className="bg-card rounded-xl border p-5">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Need help with this order?</h2>
        <span className="text-xs text-primary font-medium">{open ? "Hide" : "Chat with us"}</span>
      </button>
      {open && (
        <div className="mt-4">
          <div className="max-h-64 overflow-y-auto space-y-2 mb-3 pr-1">
            {msgs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Send us a message about this order — we usually reply fast.</p>
            ) : msgs.map(m => (
              <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender === "customer" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-0.5 ${m.sender === "customer" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {m.sender === "admin" ? "NTC Mart" : "You"} · {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2">
            <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Type a message…" className="h-10" />
            <Button onClick={send} className="h-10 px-4" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id);
  const token = authStore.getToken();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) },
  });

  const { data: returns = [] } = useQuery<ReturnRequest[]>({
    queryKey: ["returns"],
    queryFn: async () => {
      const res = await customFetch("/api/returns", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const existingReturn = returns.find(r => r.orderId === orderId);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await customFetch(`/api/orders/${orderId}/cancel`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      toast({ title: "Order cancelled successfully" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const res = await customFetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, reason: returnReason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["returns"] });
      toast({ title: "Return request submitted successfully" });
      setShowReturn(false);
      setReturnReason("");
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="text-center py-20">
          <p>Order not found</p>
          <Link href="/orders"><Button className="mt-4">My Orders</Button></Link>
        </div>
      </div>
    );
  }

  const currentStepIdx = STEPS.findIndex(s => s.status === order.status);
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const canCancel = !isCancelled && !isDelivered && order.status !== "out_for_delivery";

  const returnStatusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/orders"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id}</h1>
            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <Badge className={`ml-auto ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"} border-0`} data-testid="status-badge">
            {order.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </Badge>
        </div>

        <div className="space-y-4">
          {!isCancelled && (
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-semibold mb-5">Order Tracking</h2>
              <div className="flex items-center justify-between">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const done = i <= currentStepIdx;
                  const active = i === currentStepIdx;
                  return (
                    <div key={step.status} className="flex flex-col items-center flex-1 relative">
                      {i < STEPS.length - 1 && (
                        <div className={`absolute top-5 left-1/2 w-full h-0.5 ${i < currentStepIdx ? "bg-primary" : "bg-border"}`} />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"} ${active ? "ring-4 ring-primary/20" : ""}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] mt-2 text-center font-medium text-muted-foreground leading-tight max-w-12">{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <p className="text-red-700 font-medium">This order was cancelled</p>
            </div>
          )}

          {(order.status === "out_for_delivery" || order.status === "processing") && (
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Live Tracking</h2>
              <LiveOrderMap
                orderId={order.id}
                address={order.address}
                initialRider={
                  order.riderLat != null && order.riderLng != null
                    ? { lat: order.riderLat, lng: order.riderLng }
                    : null
                }
              />
            </div>
          )}

          {existingReturn && (
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${returnStatusColors[existingReturn.status] ? `border-current/20 ${returnStatusColors[existingReturn.status]}` : "bg-muted"}`}>
              <RotateCcw className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Return Request — {existingReturn.status.charAt(0).toUpperCase() + existingReturn.status.slice(1)}</p>
                <p className="text-xs mt-0.5 opacity-80">{existingReturn.reason}</p>
                {existingReturn.adminNote && <p className="text-xs mt-1 font-medium">Note: {existingReturn.adminNote}</p>}
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border p-5">
            <h2 className="font-semibold mb-4">Items Ordered</h2>
            <div className="space-y-3">
              {order.items.map((item: { id: number; productName: string; imageUrl?: string; unitValue: string; unit: string; quantity: number; price: number; subtotal: number }) => (
                <div key={item.id} className="flex items-center gap-3" data-testid={`order-item-${item.id}`}>
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.unitValue} {item.unit} x{item.quantity} @ ₹{item.price}</p>
                  </div>
                  <span className="font-semibold text-sm">₹{item.subtotal.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{order.subtotal.toFixed(0)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount.toFixed(0)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{order.deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${order.deliveryFee}`}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span data-testid="text-total">₹{order.total.toFixed(0)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4 text-primary" /><h3 className="font-medium text-sm">Delivery To</h3></div>
              <p className="text-xs text-muted-foreground leading-relaxed">{order.address}</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2"><CreditCard className="h-4 w-4 text-primary" /><h3 className="font-medium text-sm">Payment</h3></div>
              <p className="text-xs font-medium capitalize">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{order.paymentStatus}</p>
            </div>
          </div>

          {/* Q&A / Support chat */}
          <OrderChat orderId={order.id} />

          <div className="flex flex-wrap gap-3">
            <Link href={`/orders/${orderId}/invoice`}>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Invoice
              </Button>
            </Link>
            <ReorderButton orderId={orderId} />
            {canCancel && (
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel Order"}
              </Button>
            )}
            {isDelivered && !existingReturn && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setShowReturn(true)}
              >
                <RotateCcw className="h-4 w-4" /> Request Return
              </Button>
            )}
          </div>
        </div>
      </main>

      <Dialog open={showReturn} onOpenChange={setShowReturn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Return for Order #{orderId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Reason for Return *</Label>
              <Textarea
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="Please describe why you want to return this order..."
                className="mt-1 h-28"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowReturn(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-primary"
                onClick={() => returnMutation.mutate()}
                disabled={!returnReason.trim() || returnMutation.isPending}
              >
                {returnMutation.isPending ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
