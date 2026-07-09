import { useState } from "react";
import { Image, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { customFetch } from "@/lib/custom-fetch";
import { AdminSidebar } from "./dashboard";

interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminBanners() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "", isActive: true, sortOrder: 0 });

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const res = await customFetch("/api/banners/all", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await customFetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast({ title: "Banner created" }); setShowForm(false); resetForm(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof form> }) => {
      const res = await customFetch(`/api/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast({ title: "Banner updated" }); setEditing(null); setShowForm(false); resetForm(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await customFetch(`/api/banners/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast({ title: "Banner deleted" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  function resetForm() { setForm({ title: "", imageUrl: "", linkUrl: "", isActive: true, sortOrder: 0 }); }

  function openEdit(b: Banner) {
    setEditing(b);
    setForm({ title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? "", isActive: b.isActive, sortOrder: b.sortOrder });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.title || !form.imageUrl) { toast({ title: "Title and image URL required", variant: "destructive" }); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Banners</h1>
              <p className="text-muted-foreground text-sm">Manage homepage promotional banners</p>
            </div>
            <Button className="bg-primary gap-2" onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add Banner
            </Button>
          </div>

          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading banners…</div>
          ) : (
            <div className="space-y-3">
              {banners.map(b => (
                <div key={b.id} className="bg-card rounded-xl border p-4 flex items-center gap-4">
                  <div className="w-28 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {b.imageUrl && <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1">{b.title}</p>
                    {b.linkUrl && <p className="text-xs text-muted-foreground">{b.linkUrl}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={b.isActive ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-600 border-0"}>
                        {b.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Order: {b.sortOrder}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => updateMutation.mutate({ id: b.id, data: { isActive: !b.isActive } })}>
                      {b.isActive ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(b.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No banners yet. Add your first banner!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Fresh Deals This Week" />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-2 w-full h-24 object-cover rounded-lg" />}
            </div>
            <div>
              <Label>Link URL (optional)</Label>
              <Input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="/category/vegetables" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>Cancel</Button>
              <Button className="flex-1 bg-primary" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Save Changes" : "Create Banner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
