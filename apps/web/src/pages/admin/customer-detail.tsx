import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, User, Mail, Phone, Wallet, Star, ShoppingBag, Calendar, Package, Plus } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

interface UserDetail { id: number; name: string; email: string; phone: string; role: string; walletBalance: string; loyaltyPoints: number; referralCode: string | null; createdAt: string; }
interface Order { id: number; status: string; total: number; createdAt: string; items: { productName: string }[]; }

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700", out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletOpen, setWalletOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditPoints, setCreditPoints] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const token = authStore.getToken()!;
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  function reload() {
    Promise.all([
      fetch(`/api/users/${id}`, { headers: h }).then(r => r.json()),
      fetch(`/api/orders?userId=${id}`, { headers: h }).then(r => r.json()),
    ]).then(([u, o]) => { setUser(u); setOrders(Array.isArray(o) ? o : []); });
  }

  useEffect(() => {
    reload();
    setLoading(false);
  }, [id]);

  async function creditWallet() {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}/wallet-credit`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ amount, description: creditNote || `Admin credit for ${user?.name}` }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `₹${amount.toFixed(2)} credited to wallet` });
      setWalletOpen(false);
      setCreditAmount("");
      setCreditNote("");
      reload();
    } catch {
      toast({ title: "Failed to credit wallet", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function creditLoyalty() {
    const points = parseInt(creditPoints);
    if (!points || points <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}/loyalty-credit`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ points, description: creditNote || `Admin bonus for ${user?.name}` }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `${points} loyalty points added` });
      setLoyaltyOpen(false);
      setCreditPoints("");
      setCreditNote("");
      reload();
    } catch {
      toast({ title: "Failed to add points", variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading || !user) return <div className="min-h-screen bg-background"><Navbar /><div className="max-w-4xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6"><AdminSidebar /><div className="flex-1"><Skeleton className="h-64" /></div></div></div>;
  if (user.id === undefined) return <div className="text-center py-20">Customer not found</div>;

  const totalSpent = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const completedOrders = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/admin/customers"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Customers</Button></Link>
            <h1 className="text-xl font-bold">{user.name}</h1>
            {user.role === "admin" && <Badge className="bg-purple-100 text-purple-700 border-0">Admin</Badge>}
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            {/* Profile Card */}
            <div className="lg:col-span-2 bg-card border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">{user.name[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold">{user.name}</h2>
                  <div className="space-y-1.5 mt-2">
                    <p className="text-sm flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{user.email}</p>
                    <p className="text-sm flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{user.phone}</p>
                    <p className="text-sm flex items-center gap-2 text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Joined {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    {user.referralCode && <p className="text-sm flex items-center gap-2 text-muted-foreground"><User className="h-3.5 w-3.5" />Referral: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.referralCode}</code></p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-600" /><p className="text-sm text-muted-foreground">Wallet</p></div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Credit wallet" onClick={() => { setCreditNote(""); setWalletOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-2xl font-bold">₹{parseFloat(user.walletBalance).toFixed(2)}</p>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /><p className="text-sm text-muted-foreground">Loyalty Points</p></div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Add points" onClick={() => { setCreditNote(""); setLoyaltyOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-2xl font-bold">{user.loyaltyPoints.toLocaleString()} pts</p>
              </div>
            </div>
          </div>

          {/* Order stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total Orders", value: orders.length, icon: Package },
              { label: "Delivered", value: completedOrders, icon: ShoppingBag },
              { label: "Total Spent", value: `₹${totalSpent.toFixed(0)}`, icon: Wallet },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card border rounded-xl p-4">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Order History */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Order History ({orders.length})</h2>
            {orders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 20).map(o => (
                  <Link key={o.id} href={`/admin/orders`}>
                    <div className="flex items-center gap-3 py-2.5 border-b last:border-0 hover:bg-muted/30 rounded px-2 cursor-pointer">
                      <span className="text-sm font-medium text-muted-foreground w-16">#{o.id}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{o.items?.[0]?.productName ?? "Order"}{o.items?.length > 1 ? ` +${o.items.length - 1} more` : ""}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <Badge className={`${STATUS_COLORS[o.status] ?? "bg-gray-100"} border-0 text-[10px]`}>{o.status.replace(/_/g, " ")}</Badge>
                      <span className="font-bold text-sm">₹{o.total.toFixed(0)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Credit Dialog */}
      <Dialog open={walletOpen} onOpenChange={v => { setWalletOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Credit Wallet — {user.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" placeholder="e.g. 100" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="mt-1" min="1" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input placeholder="Reason for credit" value={creditNote} onChange={e => setCreditNote(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={creditWallet} disabled={saving || !creditAmount}>
              {saving ? "Crediting..." : "Credit Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loyalty Points Dialog */}
      <Dialog open={loyaltyOpen} onOpenChange={v => { setLoyaltyOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Loyalty Points — {user.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Points</Label>
              <Input type="number" placeholder="e.g. 50" value={creditPoints} onChange={e => setCreditPoints(e.target.value)} className="mt-1" min="1" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input placeholder="Reason for bonus" value={creditNote} onChange={e => setCreditNote(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoyaltyOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={creditLoyalty} disabled={saving || !creditPoints}>
              {saving ? "Adding..." : "Add Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
