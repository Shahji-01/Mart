import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { getGetCartQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";

interface FlashSaleVariant { id: number; unit: string; unitValue: string; price: number; salePrice: number; mrp: number; stock: number; }
interface FlashSale { id: number; label: string; productId: number; productName: string; productImage: string; discountType: string; discountValue: number; startsAt: string; endsAt: string; isLive: boolean; variants: FlashSaleVariant[]; }

function Countdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  return <span className="font-mono font-bold text-red-600">{timeLeft}</span>;
}

export default function FlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    fetch("/api/flash-sales?active=true")
      .then(r => r.ok ? r.json() : [])
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  async function addToCart(productId: number, variantId: number) {
    const token = authStore.getToken();
    if (!token) { setLocation("/login"); return; }
    setAddingId(variantId);
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, variantId, quantity: 1 }),
    });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Added to cart!" });
    } else {
      toast({ title: "Please login to add items to cart", variant: "destructive" });
    }
    setAddingId(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Flash Sales</h1>
            <p className="text-sm text-muted-foreground">Limited time deals — grab them before they're gone!</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-24">
            <Zap className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Active Flash Sales</h2>
            <p className="text-muted-foreground mb-6">Check back soon for amazing limited-time deals!</p>
            <Link href="/"><Button>Browse Products</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sales.map(sale => {
              const v = sale.variants[0];
              const savedAmount = v ? v.price - v.salePrice : 0;
              const discPct = v && v.price > 0 ? Math.round((savedAmount / v.price) * 100) : 0;
              return (
                <div key={sale.id} className="bg-card border-2 border-red-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-red-500 text-white border-0 text-xs font-bold px-2 py-0.5">
                        <Zap className="h-3 w-3 mr-1 inline" />{discPct}% OFF
                      </Badge>
                    </div>
                    <Link href={`/product/${sale.productId}`}>
                      <img
                        src={sale.productImage}
                        alt={sale.productName}
                        className="w-full h-52 object-cover hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Sale"; }}
                      />
                    </Link>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-red-600 mb-1">{sale.label}</p>
                    <Link href={`/product/${sale.productId}`}>
                      <h3 className="font-bold text-base mb-1 hover:text-primary line-clamp-1">{sale.productName}</h3>
                    </Link>
                    {v && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">{v.unitValue} {v.unit}</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-2xl font-bold text-red-600">₹{v.salePrice}</span>
                          <span className="text-sm line-through text-muted-foreground">₹{v.price}</span>
                          {savedAmount > 0 && <span className="text-xs text-green-700 font-medium">Save ₹{savedAmount}</span>}
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-1.5 mb-3 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-red-500" />
                      <span>Ends in: </span><Countdown endsAt={sale.endsAt} />
                    </div>
                    {v && (
                      <Button
                        className="w-full bg-red-500 hover:bg-red-600"
                        onClick={() => addToCart(sale.productId, v.id)}
                        disabled={v.stock === 0 || addingId === v.id}
                      >
                        {v.stock === 0 ? "Out of Stock" : addingId === v.id ? "Adding…" : "Add to Cart — Flash Price"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
