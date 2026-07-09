import { useState, useEffect } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Settings2, Store, MapPin, Clock, Truck, Share2 } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@/lib/custom-fetch";

interface StoreSettings {
  storeName: string;
  fullName: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  deliveryCutoff: string;
  lowStockThreshold: number;
  freeDeliveryAbove: number;
  deliveryFee: number;
  socialInstagram: string;
  socialFacebook: string;
  socialWhatsapp: string;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />{title}
      </h2>
      {children}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const token = authStore.getToken();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await customFetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json() as StoreSettings;
        setSettings(data);
      } catch { toast({ title: "Failed to load settings", variant: "destructive" }); }
      finally { setLoading(false); }
    }
    load();
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await customFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast({ title: "Settings saved successfully!" });
      else toast({ title: "Failed to save settings", variant: "destructive" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings(s => s ? { ...s, [key]: value } : s);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Store Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your store information and preferences</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
          ) : settings ? (
            <form onSubmit={handleSave} className="space-y-5">
              <Section title="Store Identity" icon={Store}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Store Name</Label>
                    <Input value={settings.storeName} onChange={e => set("storeName", e.target.value)} placeholder="NTC Mart" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Full Legal Name</Label>
                    <Input value={settings.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Nageshwara Trading Company" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">GSTIN</Label>
                    <Input value={settings.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())} placeholder="08AAAAA0000A1Z5" />
                  </div>
                </div>
              </Section>

              <Section title="Contact & Address" icon={MapPin}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Phone Number</Label>
                    <Input value={settings.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email Address</Label>
                    <Input type="email" value={settings.email} onChange={e => set("email", e.target.value)} placeholder="contact@ntcmart.in" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-sm">Store Address</Label>
                    <Input value={settings.address} onChange={e => set("address", e.target.value)} placeholder="Banswara, Rajasthan – 327001" />
                  </div>
                </div>
              </Section>

              <Section title="Operations & Delivery" icon={Truck}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Opening Hours</Label>
                    <Input value={settings.openingHours} onChange={e => set("openingHours", e.target.value)} placeholder="Mon – Sun: 7 AM – 9 PM" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Delivery Order Cutoff</Label>
                    <Input value={settings.deliveryCutoff} onChange={e => set("deliveryCutoff", e.target.value)} placeholder="5:00 PM" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Low Stock Alert (units below)</Label>
                    <Input type="number" min={1} value={settings.lowStockThreshold} onChange={e => set("lowStockThreshold", parseInt(e.target.value) || 10)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Free Delivery Above (₹)</Label>
                    <Input type="number" min={0} value={settings.freeDeliveryAbove} onChange={e => set("freeDeliveryAbove", parseInt(e.target.value) || 499)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Standard Delivery Fee (₹)</Label>
                    <Input type="number" min={0} value={settings.deliveryFee} onChange={e => set("deliveryFee", parseInt(e.target.value) || 40)} />
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    Delivery fee is <span className="font-medium text-primary">FREE</span> on orders above ₹{settings.freeDeliveryAbove}, otherwise ₹{settings.deliveryFee}.
                  </p>
                </div>
              </Section>

              <Section title="Hours & Timing" icon={Clock}>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  These settings are informational and displayed in the store footer and product pages.
                </p>
              </Section>

              <Section title="Social Media" icon={Share2}>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Instagram URL</Label>
                    <Input value={settings.socialInstagram} onChange={e => set("socialInstagram", e.target.value)} placeholder="https://instagram.com/ntcmart" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Facebook URL</Label>
                    <Input value={settings.socialFacebook} onChange={e => set("socialFacebook", e.target.value)} placeholder="https://facebook.com/ntcmart" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">WhatsApp Number</Label>
                    <Input value={settings.socialWhatsapp} onChange={e => set("socialWhatsapp", e.target.value)} placeholder="9876543210" />
                  </div>
                </div>
              </Section>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="bg-primary px-8" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save All Settings"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
