import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, Star, Home, Briefcase } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { MapPicker } from "@/components/map-picker";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Address { id: number; label: string; recipientName: string; phone: string; street: string; landmark: string; city: string; state: string; pincode: string; isDefault: boolean; }
type FormData = Omit<Address, "id">;

const EMPTY_FORM: FormData = { label: "Home", recipientName: "", phone: "", street: "", landmark: "", city: "Banswara", state: "Rajasthan", pincode: "327001", isDefault: false };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function load() {
    const token = authStore.getToken();
    if (!token) { setLocation("/login"); return; }
    const res = await customFetch("/api/addresses");
    if (res.ok) setAddresses(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setOpen(true); }
  function openEdit(addr: Address) { setEditing(addr); setForm({ label: addr.label, recipientName: addr.recipientName, phone: addr.phone, street: addr.street, landmark: addr.landmark, city: addr.city, state: addr.state, pincode: addr.pincode, isDefault: addr.isDefault }); setOpen(true); }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/addresses/${editing.id}` : "/api/addresses";
    const method = editing ? "PATCH" : "POST";
    const res = await customFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { toast({ title: editing ? "Address updated" : "Address added" }); setOpen(false); load(); }
    else { toast({ title: "Failed to save", variant: "destructive" }); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Delete this address?")) return;
    await customFetch(`/api/addresses/${id}`, { method: "DELETE" });
    toast({ title: "Address deleted" }); load();
  }

  async function setDefault(id: number) {
    await customFetch(`/api/addresses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }) });
    load();
  }

  const labelIcons: Record<string, typeof MapPin> = { Home, Work: Briefcase, Other: MapPin };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Saved Addresses</h1>
            <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Address</Button>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-card">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Saved Addresses</h2>
            <p className="text-muted-foreground mb-4">Add your delivery address to checkout faster</p>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Your First Address</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => {
              const LabelIcon = labelIcons[addr.label] ?? MapPin;
              return (
                <div key={addr.id} className={`bg-card border-2 rounded-xl p-4 ${addr.isDefault ? "border-primary/50" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <LabelIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{addr.label}</span>
                          {addr.isDefault && <Badge className="bg-primary/10 text-primary border-0 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />Default</Badge>}
                        </div>
                        <p className="text-sm font-medium">{addr.recipientName} · {addr.phone}</p>
                        <p className="text-sm text-muted-foreground">{addr.street}{addr.landmark ? `, ${addr.landmark}` : ""}</p>
                        <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!addr.isDefault && <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setDefault(addr.id)}><Star className="h-3.5 w-3.5" /></Button>}
                      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openEdit(addr)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => remove(addr.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Address" : "Add New Address"}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <MapPicker
                onChange={(loc) => setForm(f => ({
                  ...f,
                  street: loc.street || f.street,
                  city: loc.city || f.city,
                  state: loc.state || f.state,
                  pincode: loc.pincode || f.pincode,
                }))}
              />
              <div>
                <Label className="text-xs mb-1">Label</Label>
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map(l => (
                    <Button key={l} size="sm" variant={form.label === l ? "default" : "outline"} className="h-8" onClick={() => setForm(f => ({ ...f, label: l }))}>{l}</Button>
                  ))}
                </div>
              </div>
              {[
                { key: "recipientName", label: "Full Name", placeholder: "Recipient name" },
                { key: "phone", label: "Phone", placeholder: "10-digit mobile number" },
                { key: "street", label: "Street Address", placeholder: "House/Flat no, Building, Street" },
                { key: "landmark", label: "Landmark (optional)", placeholder: "Near school, hospital etc" },
                { key: "city", label: "City", placeholder: "City" },
                { key: "state", label: "State", placeholder: "State" },
                { key: "pincode", label: "Pincode", placeholder: "6-digit pincode" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs mb-1">{label}</Label>
                  <Input value={form[key as keyof FormData] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                <span className="text-sm">Set as default address</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add Address"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
