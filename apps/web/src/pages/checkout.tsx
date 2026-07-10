import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MapPin, CreditCard, Banknote, Clock, Wallet, Star, ChevronDown, ChevronUp, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useGetCart, usePlaceOrder, getGetCartQueryKey } from "@workspace/api-client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { Navbar } from "@/components/layout/navbar";
import { AddressFormDialog, formatAddress, type Address } from "@/components/address-form-dialog";
import { useState } from "react";

const schema = z.object({
  address: z.string().min(10, "Please enter a complete delivery address"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface DeliverySlot {
  id: number;
  label: string;
  timeRange: string;
  isActive: boolean;
  sortOrder: number;
}

interface WalletInfo {
  balance: number;
}

interface LoyaltyInfo {
  points: number;
  equivalentRupees: number;
}

interface SavedAddress {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  
  // Payment Simulation State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<FormData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { data: cart } = useGetCart({ query: { enabled: !!token, queryKey: getGetCartQueryKey() } });
  const placeOrder = usePlaceOrder();

  const { data: slots = [] } = useQuery<DeliverySlot[]>({
    queryKey: ["delivery-slots"],
    queryFn: async () => {
      const res = await customFetch("/api/delivery-slots");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: wallet } = useQuery<WalletInfo>({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const res = await customFetch("/api/wallet/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: !!token,
  });

  const { data: loyalty } = useQuery<LoyaltyInfo>({
    queryKey: ["loyalty-balance"],
    queryFn: async () => {
      const res = await customFetch("/api/loyalty/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { points: 0, equivalentRupees: 0 };
      return res.json();
    },
    enabled: !!token,
  });

  const { data: savedAddresses = [] } = useQuery<SavedAddress[]>({
    queryKey: ["saved-addresses"],
    queryFn: async () => {
      const res = await customFetch("/api/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const { data: payConfig } = useQuery<{ provider: string; razorpayKeyId: string | null }>({
    queryKey: ["payment-config"],
    queryFn: async () => {
      const res = await customFetch("/api/payments/config");
      if (!res.ok) return { provider: "simulated", razorpayKeyId: null };
      return res.json();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { address: "", notes: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="text-center py-20">
          <p>Please login to checkout</p>
          <Link href="/login"><Button className="mt-4">Login</Button></Link>
        </div>
      </div>
    );
  }

  const walletDiscount = useWallet ? Math.min(wallet?.balance ?? 0, cart?.total ?? 0) : 0;
  const loyaltyDiscount = useLoyalty ? Math.min(loyalty?.equivalentRupees ?? 0, (cart?.total ?? 0) - walletDiscount) : 0;
  const finalTotal = Math.max(0, (cart?.total ?? 0) - walletDiscount - loyaltyDiscount);

  function processOrder(data: FormData, razorpay?: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    placeOrder.mutate({
      data: {
        address: data.address,
        paymentMethod,
        couponCode: cart?.couponCode ?? undefined,
        deliverySlot: selectedSlot ?? undefined,
        notes: data.notes || undefined,
        useWallet,
        useLoyaltyPoints: useLoyalty,
        ...(razorpay ?? {}),
      }
    }, {
      onSuccess: (order) => {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Order placed successfully!", description: `Order #${order.id} confirmed` });
        setLocation(`/orders/${order.id}`);
      },
      onError: () => toast({ title: "Failed to place order", variant: "destructive" }),
    });
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function startRazorpayPayment(data: FormData) {
    try {
      const orderRes = await customFetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useWallet, useLoyaltyPoints: useLoyalty }),
      });
      if (!orderRes.ok) { toast({ title: "Couldn't start payment", variant: "destructive" }); return; }
      const rzpOrder = await orderRes.json();
      const ok = await loadRazorpayScript();
      if (!ok) { toast({ title: "Failed to load payment gateway", variant: "destructive" }); return; }

      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;
      const rzp = new RazorpayCtor({
        key: rzpOrder.keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "Shankeshwar Traders",
        description: "Order payment",
        order_id: rzpOrder.orderId,
        handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          processOrder(data, {
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
        },
        modal: { ondismiss: () => toast({ title: "Payment cancelled" }) },
        theme: { color: "#1f8f4e" },
      });
      rzp.open();
    } catch {
      toast({ title: "Payment failed to start", variant: "destructive" });
    }
  }

  function onSubmit(data: FormData) {
    if (paymentMethod === "online" && finalTotal > 0) {
      if (payConfig?.provider === "razorpay") {
        void startRazorpayPayment(data);
      } else {
        setPaymentData(data);
        setShowPaymentModal(true);
      }
    } else {
      processOrder(data);
    }
  }

  async function handleSimulatedPayment() {
    setIsProcessingPayment(true);
    // Simulate network delay for payment gateway
    await new Promise(r => setTimeout(r, 2000));
    setIsProcessingPayment(false);
    setShowPaymentModal(false);
    if (paymentData) {
      processOrder(paymentData);
    }
  }

  const items = cart?.items ?? [];
  const activeSlots = slots.filter(s => s.isActive);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/cart"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left — Form */}
          <div className="space-y-4">
            {/* Delivery Address */}
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-4"><MapPin className="h-4 w-4 text-primary" /> Delivery Address</h2>

              {/* Saved addresses accordion */}
              {savedAddresses.length > 0 && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowSavedAddresses(v => !v)}
                    className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                  >
                    {showSavedAddresses ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showSavedAddresses ? "Hide" : "Use"} saved address
                  </button>
                  {showSavedAddresses && (
                    <div className="mt-2 space-y-2">
                      {savedAddresses.map(addr => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            form.setValue("address", formatAddress(addr), { shouldValidate: true });
                            setShowSavedAddresses(false);
                          }}
                          className="w-full text-left p-3 border rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-colors text-sm"
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium">{addr.label}</span>
                            {addr.isDefault && <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Default</Badge>}
                          </div>
                          <p className="text-muted-foreground text-xs line-clamp-2">{addr.recipientName} · {addr.phone} — {formatAddress(addr)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Form {...form}>
                <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <textarea
                          data-testid="input-address"
                          placeholder="House no., Street, Colony, Banswara, Rajasthan - 327001"
                          className="w-full min-h-[100px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </form>
              </Form>

              {savedAddresses.length === 0 && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary text-xs gap-1 p-0 h-auto"
                    onClick={() => setShowAddAddress(true)}
                  >
                    + Add a delivery address
                  </Button>
                </div>
              )}
              {savedAddresses.length > 0 && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary text-xs gap-1 p-0 h-auto"
                    onClick={() => setShowAddAddress(true)}
                  >
                    + Add new address
                  </Button>
                </div>
              )}
            </div>

            {/* Order Notes */}
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <NotebookPen className="h-4 w-4 text-primary" /> Order Notes
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </h2>
              <Form {...form}>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        placeholder="e.g. Leave at door, call before delivery, specific instructions..."
                        className="w-full min-h-[70px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        form="checkout-form"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </Form>
            </div>

            {/* Delivery Slot */}
            {activeSlots.length > 0 && (
              <div className="bg-card rounded-xl border p-5">
                <h2 className="font-semibold flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-primary" /> Delivery Time Slot</h2>
                <div className="grid grid-cols-2 gap-2">
                  {activeSlots.map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(selectedSlot === slot.label ? null : slot.label)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${selectedSlot === slot.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    >
                      <p className="font-medium text-sm">{slot.label}</p>
                      <p className="text-xs text-muted-foreground">{slot.timeRange}</p>
                    </button>
                  ))}
                </div>
                {!selectedSlot && (
                  <p className="text-xs text-muted-foreground mt-2">No slot selected — we'll deliver at the earliest convenience</p>
                )}
              </div>
            )}

            {/* Wallet & Loyalty */}
            {((wallet?.balance ?? 0) > 0 || (loyalty?.points ?? 0) > 0) && (
              <div className="bg-card rounded-xl border p-5 space-y-3">
                <h2 className="font-semibold mb-1">Savings & Rewards</h2>

                {(wallet?.balance ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseWallet(v => !v)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${useWallet ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">ST Wallet</p>
                        <p className="text-xs text-muted-foreground">Balance: ₹{Number(wallet?.balance ?? 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {useWallet && <Badge className="bg-green-100 text-green-700 border-0 text-xs">-₹{walletDiscount.toFixed(0)}</Badge>}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useWallet ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {useWallet && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                )}

                {(loyalty?.points ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseLoyalty(v => !v)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${useLoyalty ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                        <Star className="h-4 w-4 text-accent" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Loyalty Points</p>
                        <p className="text-xs text-muted-foreground">{loyalty?.points ?? 0} pts = ₹{(loyalty?.equivalentRupees ?? 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {useLoyalty && <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">-₹{loyaltyDiscount.toFixed(0)}</Badge>}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useLoyalty ? "border-accent bg-accent" : "border-muted-foreground"}`}>
                        {useLoyalty && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-4"><CreditCard className="h-4 w-4 text-primary" /> Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "cod" as const, label: "Cash on Delivery", icon: Banknote, sub: "Pay when delivered" },
                  { id: "online" as const, label: "Online Payment", icon: CreditCard, sub: "UPI / Card / Net banking" },
                ].map(({ id, label, icon: Icon, sub }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    data-testid={`button-payment-${id}`}
                  >
                    <Icon className={`h-5 w-5 mb-2 ${paymentMethod === id ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Summary */}
          <div>
            <div className="bg-card rounded-xl border p-5 sticky top-20">
              <h2 className="font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.unitValue} {item.unit} x{item.quantity}</p>
                    </div>
                    <span className="font-medium flex-shrink-0">₹{item.subtotal.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{cart?.subtotal.toFixed(0)}</span></div>
                {(cart?.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon discount</span><span>-₹{cart?.discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{cart?.deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${cart?.deliveryFee}`}</span>
                </div>
                {selectedSlot && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Delivery slot</span><span className="font-medium text-foreground">{selectedSlot}</span>
                  </div>
                )}
                {walletDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Wallet applied</span><span>-₹{walletDiscount.toFixed(0)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>Loyalty points applied</span><span>-₹{loyaltyDiscount.toFixed(0)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span data-testid="text-total">₹{finalTotal.toFixed(0)}</span>
                </div>
              </div>

              {(cart?.subtotal ?? 0) < 499 && (cart?.subtotal ?? 0) > 0 && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  Add ₹{(499 - (cart?.subtotal ?? 0)).toFixed(0)} more for <strong>FREE delivery</strong>
                </div>
              )}

              <Button
                form="checkout-form"
                type="submit"
                className="w-full mt-4 bg-primary h-11 font-semibold"
                disabled={placeOrder.isPending || items.length === 0}
                data-testid="button-place-order"
              >
                {placeOrder.isPending ? "Placing Order..." : `Place Order — ₹${finalTotal.toFixed(0)}`}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-2">By placing order you agree to our terms</p>

              {(walletDiscount > 0 || loyaltyDiscount > 0) && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg text-xs text-green-700 text-center">
                  You're saving ₹{(walletDiscount + loyaltyDiscount).toFixed(0)} on this order!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Simulated Payment Gateway Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Secure Payment
            </DialogTitle>
            <DialogDescription>
              Complete your purchase securely. This is a simulated environment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center font-bold">
              <span>Amount to Pay</span>
              <span className="text-xl text-primary">₹{finalTotal.toFixed(2)}</span>
            </div>
            
            <div className="space-y-3 pt-3 border-t">
              <div>
                <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Card Number</label>
                <Input defaultValue="4242 4242 4242 4242" className="mt-1 font-mono" readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Expiry</label>
                  <Input defaultValue="12/28" className="mt-1 font-mono" readOnly />
                </div>
                <div>
                  <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">CVV</label>
                  <Input defaultValue="123" type="password" className="mt-1 font-mono" readOnly />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name on Card</label>
                <Input defaultValue="John Doe" className="mt-1" readOnly />
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between mt-2">
            <Button variant="ghost" onClick={() => setShowPaymentModal(false)} disabled={isProcessingPayment}>
              Cancel
            </Button>
            <Button onClick={handleSimulatedPayment} disabled={isProcessingPayment} className="w-full sm:w-auto">
              {isProcessingPayment ? "Processing..." : `Pay ₹${finalTotal.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddressFormDialog
        open={showAddAddress}
        onOpenChange={setShowAddAddress}
        onSaved={(addr: Address) => {
          qc.invalidateQueries({ queryKey: ["saved-addresses"] });
          form.setValue("address", formatAddress(addr), { shouldValidate: true });
        }}
      />
    </div>
  );
}
