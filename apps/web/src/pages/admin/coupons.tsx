import { useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCoupons, useCreateCoupon, getGetCouponsQueryKey } from "@workspace/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";
import { authStore } from "@/lib/auth-store";

type CouponForm = {
  code: string;
  discountType: "percentage" | "flat";
  discountValue: string;
  minOrderValue: string;
  maxDiscount: string;
  expiresAt: string;
};

const emptyForm: CouponForm = {
  code: "", discountType: "percentage", discountValue: "",
  minOrderValue: "", maxDiscount: "", expiresAt: "",
};

export default function AdminCoupons() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const { data: coupons, isLoading } = useGetCoupons();
  const createCoupon = useCreateCoupon();

  const deleteCoupon = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCouponsQueryKey() }); toast({ title: "Coupon deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleCoupon = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCouponsQueryKey() }); },
    onError: () => toast({ title: "Failed to update coupon", variant: "destructive" }),
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: object }) => {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetCouponsQueryKey() });
      toast({ title: "Coupon updated" });
      setEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast({ title: "Failed to update coupon", variant: "destructive" }),
  });

  function handleCreate() {
    if (!form.code || !form.discountValue) return;
    createCoupon.mutate({
      data: {
        code: form.code,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : undefined,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
        expiresAt: form.expiresAt || undefined,
        isActive: true,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCouponsQueryKey() });
        toast({ title: "Coupon created" });
        setCreateOpen(false);
        setForm(emptyForm);
      },
      onError: () => toast({ title: "Failed to create", variant: "destructive" }),
    });
  }

  function handleEdit() {
    if (!editingId || !form.code || !form.discountValue) return;
    updateCoupon.mutate({
      id: editingId,
      data: {
        code: form.code,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        expiresAt: form.expiresAt || null,
      },
    });
  }

  function openEdit(coupon: NonNullable<typeof coupons>[number]) {
    setEditingId(coupon.id);
    const exp = (coupon as typeof coupon & { expiresAt?: string | null }).expiresAt;
    setForm({
      code: coupon.code,
      discountType: coupon.discountType as "percentage" | "flat",
      discountValue: String(coupon.discountValue),
      minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : "",
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : "",
      expiresAt: exp ? exp.split("T")[0] : "",
    });
    setEditOpen(true);
  }



  const isExpired = (coupon: NonNullable<typeof coupons>[number]) => {
    const exp = (coupon as typeof coupon & { expiresAt?: string | null }).expiresAt;
    return exp ? new Date(exp) < new Date() : false;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Coupons</h1>
              <p className="text-sm text-muted-foreground">{coupons?.length ?? 0} coupons</p>
            </div>
            <Button className="bg-primary gap-1" onClick={() => { setForm(emptyForm); setCreateOpen(true); }} data-testid="button-add-coupon">
              <Plus className="h-4 w-4" /> Create Coupon
            </Button>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Code</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Type</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Discount</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Min Order</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Expires</th>
                      <th className="text-center p-3 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-center p-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Used</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(coupons) ? coupons : []).map(coupon => {
                      const exp = (coupon as typeof coupon & { expiresAt?: string | null }).expiresAt;
                      const expired = isExpired(coupon);
                      return (
                        <tr key={coupon.id} className="border-b last:border-0 hover:bg-muted/20" data-testid={`coupon-row-${coupon.id}`}>
                          <td className="p-3 font-mono font-bold text-primary">{coupon.code}</td>
                          <td className="p-3 capitalize text-muted-foreground">{coupon.discountType}</td>
                          <td className="p-3 font-medium">
                            {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                            {coupon.maxDiscount && <span className="text-xs text-muted-foreground ml-1">(max ₹{coupon.maxDiscount})</span>}
                          </td>
                          <td className="p-3 text-muted-foreground hidden sm:table-cell">{coupon.minOrderValue ? `₹${coupon.minOrderValue}` : "—"}</td>
                          <td className="p-3 hidden md:table-cell">
                            {exp ? (
                              <span className={expired ? "text-red-500 text-xs font-medium" : "text-xs text-muted-foreground"}>
                                {new Date(exp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {expired && " (Expired)"}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={
                              expired ? "bg-red-100 text-red-500 border-0" :
                              coupon.isActive ? "bg-green-100 text-green-700 border-0" :
                              "bg-gray-100 text-gray-500 border-0"
                            }>
                              {expired ? "Expired" : coupon.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-muted-foreground hidden sm:table-cell">{coupon.usageCount}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                title="Edit"
                                onClick={() => openEdit(coupon)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                title={coupon.isActive ? "Deactivate" : "Activate"}
                                onClick={() => toggleCoupon.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                              >
                                {coupon.isActive
                                  ? <ToggleRight className="h-4 w-4 text-green-600" />
                                  : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                }
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => { if (confirm(`Delete coupon ${coupon.code}?`)) deleteCoupon.mutate(coupon.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!coupons?.length && !isLoading && (
              <div className="text-center py-12 text-muted-foreground text-sm">No coupons yet. Create your first one!</div>
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Coupon Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="mt-1 uppercase font-mono" />
            </div>
            <div>
              <Label>Discount Type</Label>
              <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v as "percentage" | "flat" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discount Value</Label>
              <Input value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === "percentage" ? "20" : "50"} type="number" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Order Value (₹)</Label>
                <Input value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} placeholder="Optional" type="number" className="mt-1" />
              </div>
              {form.discountType === "percentage" && (
                <div>
                  <Label>Max Discount (₹)</Label>
                  <Input value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} placeholder="Optional" type="number" className="mt-1" />
                </div>
              )}
            </div>
            <div>
              <Label>Expiry Date (optional)</Label>
              <Input value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} type="date" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={handleCreate} disabled={createCoupon.isPending || !form.code || !form.discountValue} data-testid="button-create-coupon">
              {createCoupon.isPending ? "Creating..." : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Coupon Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="mt-1 uppercase font-mono" />
            </div>
            <div>
              <Label>Discount Type</Label>
              <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v as "percentage" | "flat" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discount Value</Label>
              <Input value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === "percentage" ? "20" : "50"} type="number" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Order Value (₹)</Label>
                <Input value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} placeholder="Optional" type="number" className="mt-1" />
              </div>
              {form.discountType === "percentage" && (
                <div>
                  <Label>Max Discount (₹)</Label>
                  <Input value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} placeholder="Optional" type="number" className="mt-1" />
                </div>
              )}
            </div>
            <div>
              <Label>Expiry Date (optional)</Label>
              <Input value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} type="date" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={handleEdit} disabled={updateCoupon.isPending || !form.code || !form.discountValue}>
              {updateCoupon.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
