import { useState, useEffect } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { useGetProducts } from "@workspace/api-client";

interface FlashSale { id: number; label: string; productId: number; productName: string; productImage: string; discountType: string; discountValue: number; startsAt: string; endsAt: string; isActive: boolean; isLive: boolean; }

function toLocal(iso: string) { return new Date(iso).toISOString().slice(0, 16); }
function toISO(local: string) { return new Date(local).toISOString(); }

export default function AdminFlashSales() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FlashSale | null>(null);
  const [form, setForm] = useState({ label: "", productId: "", discountType: "percentage", discountValue: "", startsAt: "", endsAt: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data: productsData } = useGetProducts({ limit: 200 });

  async function load() {
    const token = authStore.getToken()!;
    const res = await fetch("/api/flash-sales", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSales(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setEditing(null); setForm({ label: "", productId: "", discountType: "percentage", discountValue: "", startsAt: "", endsAt: "", isActive: true }); setOpen(true); }
  function openEdit(s: FlashSale) { setEditing(s); setForm({ label: s.label, productId: s.productId.toString(), discountType: s.discountType, discountValue: s.discountValue.toString(), startsAt: toLocal(s.startsAt), endsAt: toLocal(s.endsAt), isActive: s.isActive }); setOpen(true); }

  async function save() {
    if (!form.label || !form.productId || !form.discountValue || !form.startsAt || !form.endsAt) { toast({ title: "All fields required", variant: "destructive" }); return; }
    setSaving(true);
    const token = authStore.getToken()!;
    const url = editing ? `/api/flash-sales/${editing.id}` : "/api/flash-sales";
    const method = editing ? "PATCH" : "POST";
    const body = { ...form, productId: parseInt(form.productId), discountValue: parseFloat(form.discountValue), startsAt: toISO(form.startsAt), endsAt: toISO(form.endsAt) };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    if (res.ok) { toast({ title: editing ? "Sale updated" : "Flash sale created" }); setOpen(false); load(); }
    else { toast({ title: "Failed", variant: "destructive" }); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Delete this flash sale?")) return;
    const token = authStore.getToken()!;
    await fetch(`/api/flash-sales/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    toast({ title: "Deleted" }); load();
  }

  async function toggle(s: FlashSale) {
    const token = authStore.getToken()!;
    await fetch(`/api/flash-sales/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: !s.isActive }) });
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center"><Zap className="h-5 w-5 text-white" /></div>
              <div>
                <h1 className="text-2xl font-bold">Flash Sales</h1>
                <p className="text-sm text-muted-foreground">{sales.filter(s => s.isLive).length} live now</p>
              </div>
            </div>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Create Flash Sale</Button>
          </div>

          {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div> : (
            <div className="space-y-3">
              {sales.map(s => (
                <div key={s.id} className={`bg-card border-2 rounded-xl p-4 ${s.isLive ? "border-red-200" : "border-border"}`}>
                  <div className="flex items-center gap-4">
                    <img src={s.productImage} alt={s.productName} className="w-14 h-14 rounded-lg object-cover bg-muted" onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/56x56?text=P"; }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold">{s.label}</p>
                        {s.isLive && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]"><Zap className="h-2.5 w-2.5 mr-0.5" />LIVE</Badge>}
                        {!s.isActive && <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">Disabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{s.productName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-red-600">{s.discountType === "percentage" ? `${s.discountValue}% OFF` : `₹${s.discountValue} OFF`}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(s.startsAt).toLocaleDateString("en-IN")} – {new Date(s.endsAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={s.isActive} onCheckedChange={() => toggle(s)} />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {sales.length === 0 && <div className="text-center py-16 text-muted-foreground"><Zap className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No flash sales yet. Create one to boost sales!</p></div>}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Flash Sale" : "Create Flash Sale"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs mb-1">Sale Label</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Weekend Veggie Deal" /></div>
            <div>
              <Label className="text-xs mb-1">Product</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{productsData?.data.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1">Discount Type</Label>
                <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage %</SelectItem><SelectItem value="fixed">Fixed ₹</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1">Discount Value</Label><Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder="e.g. 20" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs mb-1">Starts At</Label><Input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} /></div>
              <div><Label className="text-xs mb-1">Ends At</Label><Input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} /><span className="text-sm">Active</span></label>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
