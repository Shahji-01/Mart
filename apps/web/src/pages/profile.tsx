import { useState } from "react";
import { Link, useLocation } from "wouter";
import { User, MapPin, Lock, Plus, Pencil, Trash2, ArrowLeft, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { Navbar } from "@/components/layout/navbar";
import { getGetMeQueryKey } from "@workspace/api-client";

interface UserProfile { id: number; name: string; email: string; phone: string; role: string; createdAt: string; }
interface Address { id: number; label: string; recipientName: string; phone: string; street: string; landmark: string; city: string; state: string; pincode: string; isDefault: boolean; createdAt: string; }

const TABS = ["profile", "addresses", "security"] as const;
type Tab = typeof TABS[number];

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = authStore.getToken();
  const [tab, setTab] = useState<Tab>("profile");

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Please login to view your profile</p>
          <Link href="/login"><Button>Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold">My Account</h1>
        </div>

        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-xl w-fit">
          {([["profile", User, "Profile"], ["addresses", MapPin, "Addresses"], ["security", Lock, "Security"]] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "profile" && <ProfileTab token={token} qc={qc} toast={toast} />}
        {tab === "addresses" && <AddressesTab token={token} qc={qc} toast={toast} />}
        {tab === "security" && <SecurityTab token={token} toast={toast} />}
      </main>
    </div>
  );
}

function ProfileTab({ token, qc, toast }: { token: string; qc: ReturnType<typeof useQueryClient>; toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const res = await customFetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const [form, setForm] = useState({ name: "", phone: "" });
  const [editing, setEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await customFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated successfully" });
      setEditing(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function startEdit() {
    if (!user) return;
    setForm({ name: user.name, phone: user.phone });
    setEditing(true);
  }

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;
  if (!user) return null;

  return (
    <div className="bg-card rounded-xl border p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-lg">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge className="mt-1 bg-primary/10 text-primary border-0 capitalize">{user.role}</Badge>
        </div>
      </div>
      <Separator />
      {editing ? (
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="flex-1 bg-primary" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {[["Full Name", user.name], ["Email", user.email], ["Phone", user.phone], ["Member Since", new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })]].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <p className="mt-0.5 font-medium">{value}</p>
            </div>
          ))}
          <Button variant="outline" className="gap-2" onClick={startEdit}><Pencil className="h-4 w-4" /> Edit Profile</Button>
        </div>
      )}
    </div>
  );
}

function AddressesTab({ token, qc, toast }: { token: string; qc: ReturnType<typeof useQueryClient>; toast: ReturnType<typeof useToast>["toast"] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const blank = { label: "Home", recipientName: "", phone: "", street: "", landmark: "", city: "Banswara", state: "Rajasthan", pincode: "327001", isDefault: false };
  const [form, setForm] = useState(blank);

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: async () => {
      const res = await customFetch("/api/addresses", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof blank) => {
      const res = await customFetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); toast({ title: "Address saved" }); setShowForm(false); setForm(blank); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof blank }) => {
      const res = await customFetch(`/api/addresses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); toast({ title: "Address updated" }); setShowForm(false); setEditingId(null); setForm(blank); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await customFetch(`/api/addresses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); toast({ title: "Address deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  function openEdit(a: Address) {
    setEditingId(a.id);
    setForm({ label: a.label, recipientName: a.recipientName, phone: a.phone, street: a.street, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.recipientName || !form.phone || !form.street || !form.pincode) { toast({ title: "Please fill all required fields", variant: "destructive" }); return; }
    if (editingId) updateMutation.mutate({ id: editingId, data: form });
    else createMutation.mutate(form);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
        <Button className="bg-primary gap-2" size="sm" onClick={() => { setEditingId(null); setForm(blank); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add Address
        </Button>
      </div>

      {isLoading ? <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div> : addresses.map(a => (
        <div key={a.id} className="bg-card rounded-xl border p-4 flex gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs capitalize">{a.label}</Badge>
              {a.isDefault && <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1"><Check className="h-2.5 w-2.5" /> Default</Badge>}
            </div>
            <p className="font-medium">{a.recipientName} · {a.phone}</p>
            <p className="text-sm text-muted-foreground">{a.street}{a.landmark ? `, ${a.landmark}` : ""}</p>
            <p className="text-sm text-muted-foreground">{a.city}, {a.state} – {a.pincode}</p>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
      {!isLoading && addresses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No saved addresses yet</p>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditingId(null); setForm(blank); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Label</Label>
                <select value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {["Home", "Work", "Other"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-medium">Set as default</span>
                </label>
              </div>
            </div>
            {[["recipientName", "Recipient Name *"], ["phone", "Phone Number *"], ["street", "Street Address *"], ["landmark", "Landmark (optional)"], ["pincode", "Pincode *"]].map(([field, label]) => (
              <div key={field}>
                <Label>{label}</Label>
                <Input
                  value={form[field as keyof typeof form] as string}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="mt-1"
                  placeholder={field === "street" ? "House no., Street, Colony" : ""}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null); setForm(blank); }}>Cancel</Button>
              <Button className="flex-1 bg-primary" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Add Address"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecurityTab({ token, toast }: { token: string; toast: ReturnType<typeof useToast>["toast"] }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const changePwMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await customFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function handleSubmit() {
    if (!form.currentPassword || !form.newPassword) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    if (form.newPassword.length < 6) { toast({ title: "New password must be at least 6 characters", variant: "destructive" }); return; }
    if (form.newPassword !== form.confirmPassword) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    changePwMutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  }

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Change Password</p>
          <p className="text-sm text-muted-foreground">Keep your account secure</p>
        </div>
      </div>
      <Separator className="mb-5" />
      <div className="space-y-4 max-w-sm">
        <div>
          <Label>Current Password</Label>
          <Input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} className="mt-1" placeholder="Enter current password" />
        </div>
        <div>
          <Label>New Password</Label>
          <Input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} className="mt-1" placeholder="Min. 6 characters" />
        </div>
        <div>
          <Label>Confirm New Password</Label>
          <Input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="mt-1" placeholder="Repeat new password" />
        </div>
        <Button className="bg-primary gap-2" onClick={handleSubmit} disabled={changePwMutation.isPending}>
          <Star className="h-4 w-4" />
          {changePwMutation.isPending ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </div>
  );
}
