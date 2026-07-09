import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertCircle, Plus } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { openRazorpayCheckout } from "@/lib/razorpay-client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useGetWallet, getGetWalletQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";

export default function WalletPage() {
  const [, setLocation] = useLocation();
  const token = authStore.getToken();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [topupAmount, setTopupAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const [payConfig, setPayConfig] = useState<{ provider: string; razorpayKeyId: string | null } | null>(null);

  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token, setLocation]);

  useEffect(() => {
    customFetch("/api/payments/config").then(r => r.ok ? r.json() : null).then(setPayConfig).catch(() => {});
  }, []);

  async function handleTopup() {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < 1) { toast({ title: "Enter an amount of at least ₹1", variant: "destructive" }); return; }
    if (payConfig?.provider !== "razorpay") { toast({ title: "Online top-up is not available right now", variant: "destructive" }); return; }
    setToppingUp(true);
    try {
      const orderRes = await customFetch("/api/wallet/topup/order", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }),
      });
      if (!orderRes.ok) { toast({ title: "Couldn't start top-up", variant: "destructive" }); setToppingUp(false); return; }
      const order = await orderRes.json();
      const opened = await openRazorpayCheckout({
        keyId: order.keyId ?? payConfig.razorpayKeyId ?? "",
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        description: "Wallet top-up",
        onSuccess: async (resp) => {
          const confirm = await customFetch("/api/wallet/topup/confirm", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }),
          });
          if (confirm.ok) {
            toast({ title: `₹${amount} added to your wallet` });
            setTopupAmount("");
            qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          } else {
            toast({ title: "Top-up verification failed", variant: "destructive" });
          }
          setToppingUp(false);
        },
        onDismiss: () => setToppingUp(false),
      });
      if (!opened) { toast({ title: "Failed to load payment gateway", variant: "destructive" }); setToppingUp(false); }
    } catch {
      toast({ title: "Top-up failed", variant: "destructive" });
      setToppingUp(false);
    }
  }

  const { data, isLoading, isError } = useGetWallet({ query: { enabled: !!token, queryKey: getGetWalletQueryKey() } });

  const typeIcons: Record<string, typeof Wallet> = { credit: ArrowUpCircle, debit: ArrowDownCircle, refund: RefreshCw };
  const typeColors: Record<string, string> = { credit: "text-green-600", debit: "text-red-600", refund: "text-blue-600" };

  const transactions = data?.transactions ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Wallet className="h-7 w-7" />
            <div>
              <p className="text-sm opacity-80">NTC Wallet Balance</p>
              <h1 className="text-3xl font-bold">₹{isLoading ? "..." : isError ? "—" : (data?.balance ?? 0).toFixed(2)}</h1>
            </div>
          </div>
          <p className="text-sm opacity-75">Use your wallet balance at checkout for instant discounts. Credits are added automatically on returns & refunds.</p>
        </div>

        {payConfig?.provider === "razorpay" && (
          <div className="bg-card border rounded-xl p-5 mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add Money</h2>
            <div className="flex gap-2">
              <Input
                type="number" min="1" inputMode="numeric" placeholder="Amount (₹)"
                value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="h-11"
              />
              <Button className="h-11 px-6" onClick={handleTopup} disabled={toppingUp}>
                {toppingUp ? "Processing…" : "Add"}
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              {[100, 250, 500, 1000].map(a => (
                <button key={a} onClick={() => setTopupAmount(String(a))} className="text-xs px-3 py-1 rounded-full border hover:border-primary hover:text-primary transition-colors">
                  ₹{a}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Transaction History</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : isError ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-40 text-red-500" />
              <p>We couldn't load your wallet right now. Please try again later.</p>
            </div>
          ) : !transactions.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No transactions yet. Wallet credits are added on refunds.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const Icon = typeIcons[tx.type] ?? Wallet;
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${typeColors[tx.type] ?? "text-gray-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <span className={`font-bold text-sm ${tx.type === "credit" || tx.type === "refund" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "debit" ? "-" : "+"}₹{Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
