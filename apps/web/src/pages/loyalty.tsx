import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, Gift, ArrowUpCircle, ArrowDownCircle, AlertCircle } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useLocation } from "wouter";
import { useGetLoyalty, getGetLoyaltyQueryKey } from "@workspace/api-client";

const RUPEES_PER_POINT = 0.25;

export default function LoyaltyPage() {
  const [, setLocation] = useLocation();
  const token = authStore.getToken();

  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token, setLocation]);

  const { data, isLoading, isError } = useGetLoyalty({ query: { enabled: !!token, queryKey: getGetLoyaltyQueryKey() } });

  const typeColors: Record<string, string> = {
    earn: "text-green-600", spend: "text-red-600", expire: "text-gray-500", bonus: "text-purple-600"
  };
  const typeIcons: Record<string, typeof Star> = {
    earn: ArrowUpCircle, spend: ArrowDownCircle, expire: ArrowDownCircle, bonus: Gift
  };

  const transactions = data?.transactions ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-7 w-7" fill="white" />
            <div>
              <p className="text-sm opacity-80">NTC Loyalty Points</p>
              <h1 className="text-3xl font-bold">{isLoading ? "..." : isError ? "—" : (data?.balance ?? 0).toLocaleString()}</h1>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-sm">
            <p>≈ <strong>₹{isLoading ? "..." : isError ? "—" : ((data?.balance ?? 0) * RUPEES_PER_POINT).toFixed(2)}</strong> redeemable value</p>
            <p className="opacity-75 mt-0.5">Earn 1 point per ₹10 spent · Redeem 4 points = ₹1 off</p>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: TrendingUp, title: "Shop", desc: "Earn 1 point per ₹10 spent" },
            { icon: Star, title: "Accumulate", desc: "Points valid for 1 year" },
            { icon: Gift, title: "Redeem", desc: "Use points at checkout" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card border rounded-xl p-3 text-center">
              <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Transaction History</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : isError ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-40 text-red-500" />
              <p>We couldn't load your loyalty points right now. Please try again later.</p>
            </div>
          ) : !transactions.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No transactions yet. Start shopping to earn points!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const Icon = typeIcons[tx.type] ?? Star;
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${typeColors[tx.type] ?? "text-gray-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <span className={`font-bold text-sm ${tx.type === "earn" || tx.type === "bonus" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "earn" || tx.type === "bonus" ? "+" : "-"}{Math.abs(tx.points)} pts
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
