import { useState } from "react";
import { Link } from "wouter";
import { Package, Search, AlertTriangle, TrendingDown, ArrowLeft, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@/lib/custom-fetch";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

interface Variant { id: number; unit: string; unitValue: string; price: number; mrp: number; stock: number; sku?: string; }
interface Product { id: number; name: string; imageUrl: string; categoryName: string; variants: Variant[]; }

function StockCell({ variant, onSave }: { variant: Variant; onSave: (id: number, stock: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(variant.stock);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={val}
          min={0}
          onChange={e => setVal(parseInt(e.target.value) || 0)}
          className="h-7 w-20 text-xs"
        />
        <button onClick={() => { onSave(variant.id, val); setEditing(false); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setVal(variant.stock); setEditing(false); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group rounded px-1.5 py-0.5 hover:bg-muted transition-colors cursor-pointer">
      <span className={`font-semibold text-sm ${variant.stock === 0 ? "text-red-600" : variant.stock < 10 ? "text-orange-600" : "text-green-700"}`}>
        {variant.stock}
      </span>
      <Edit2 className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
    </button>
  );
}

export default function AdminInventory() {
  const token = authStore.getToken();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const res = await customFetch("/api/products?limit=500", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const j = await res.json();
      return j.data ?? j;
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ variantId, stock }: { variantId: number; stock: number }) => {
      const res = await customFetch(`/api/products/variants/${variantId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      toast({ title: "Stock updated" });
    },
    onError: () => toast({ title: "Failed to update stock", variant: "destructive" }),
  });

  const allVariants = products.flatMap(p =>
    p.variants.map(v => ({ ...v, productId: p.id, productName: p.name, productImage: p.imageUrl, categoryName: p.categoryName }))
  );

  const filtered = allVariants.filter(v => {
    const matchSearch = !search || v.productName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "out" && v.stock === 0) || (filter === "low" && v.stock > 0 && v.stock < 10);
    return matchSearch && matchFilter;
  });

  const outCount = allVariants.filter(v => v.stock === 0).length;
  const lowCount = allVariants.filter(v => v.stock > 0 && v.stock < 10).length;
  const totalItems = allVariants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Inventory Management</h1>
              <p className="text-sm text-muted-foreground">Monitor and update stock levels</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total SKUs", value: allVariants.length, color: "text-foreground" },
              { label: "Total Stock", value: totalItems, color: "text-green-700" },
              { label: "Low Stock", value: lowCount, color: "text-orange-600" },
              { label: "Out of Stock", value: outCount, color: "text-red-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card rounded-xl border p-4">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {(outCount > 0 || lowCount > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Stock Alert</p>
                <p className="text-sm text-orange-700 mt-0.5">
                  {outCount > 0 && `${outCount} variant${outCount > 1 ? "s" : ""} out of stock. `}
                  {lowCount > 0 && `${lowCount} variant${lowCount > 1 ? "s" : ""} running low (under 10 units).`}
                </p>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border">
            <div className="p-4 flex items-center gap-3 border-b">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                {(["all", "low", "out"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {f === "all" ? "All" : f === "low" ? `Low (${lowCount})` : `Out (${outCount})`}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No products match your filter</p>
              </div>
            ) : (
              <div className="divide-y">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Variant</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-2">Stock</div>
                </div>
                {filtered.map(v => (
                  <div key={v.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {v.productImage && <img src={v.productImage} alt={v.productName} className="w-full h-full object-cover" />}
                      </div>
                      <Link href={`/product/${v.productId}`}>
                        <p className="text-sm font-medium line-clamp-1 hover:text-primary cursor-pointer">{v.productName}</p>
                      </Link>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-xs">{v.categoryName}</Badge>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {v.unitValue} {v.unit}
                    </div>
                    <div className="col-span-2 text-sm font-medium">₹{v.price}</div>
                    <div className="col-span-2">
                      <StockCell
                        variant={{ id: v.id, unit: v.unit, unitValue: v.unitValue, price: v.price, mrp: v.mrp, stock: v.stock }}
                        onSave={(id, stock) => updateStock.mutate({ variantId: id, stock })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
