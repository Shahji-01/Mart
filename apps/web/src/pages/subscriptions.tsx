import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Trash2, Repeat } from "lucide-react";
import { customFetch } from "@/lib/custom-fetch";
import { useToast } from "@/hooks/use-toast";

interface Sub {
  id: number;
  productName: string;
  imageUrl: string;
  unit: string;
  unitValue: string;
  price: number;
  quantity: number;
  frequency: string;
  nextRunAt: string;
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    customFetch("/api/subscriptions")
      .then(r => r.ok ? r.json() : [])
      .then(d => setSubs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    await customFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    toast({ title: "Subscription cancelled" });
    setSubs(s => s.filter(x => x.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Repeat className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">My Subscriptions</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Auto-refills are added to your cart on schedule — checkout when ready.</p>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : subs.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-card">
            <RefreshCw className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1">No subscriptions yet</h2>
            <p className="text-muted-foreground text-sm mb-4">Subscribe to your essentials from any product page.</p>
            <Link href="/"><Button>Browse products</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map(s => (
              <div key={s.id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {s.imageUrl && <img src={s.imageUrl} alt={s.productName} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-1">{s.productName}</p>
                  <p className="text-xs text-muted-foreground">{s.unitValue} {s.unit} · Qty {s.quantity} · <span className="capitalize">{s.frequency}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Next: {new Date(s.nextRunAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">₹{s.price}</p>
                  <button onClick={() => cancel(s.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1 mt-1">
                    <Trash2 className="h-3 w-3" /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
