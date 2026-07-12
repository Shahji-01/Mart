import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Star, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useGetProducts, useGetCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, getGetProductsQueryKey } from "@workspace/api-client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";

interface VariantForm { unit: string; unitValue: string; price: string; mrp: string; stock: string; }
interface ProductRow { id: number; name: string; slug: string; description: string; imageUrl: string; categoryId: number; categoryName: string; isFeatured: boolean; tags: string; variants: { id: number; price: number; mrp: number; unit: string; unitValue: string; stock: number }[] }

const BLANK_FORM = { name: "", slug: "", description: "", imageUrl: "", categoryId: "", isFeatured: false, tags: "" };
const BLANK_VARIANT: VariantForm = { unit: "g", unitValue: "500", price: "", mrp: "", stock: "100" };

export default function AdminProducts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(BLANK_FORM);
  const [variants, setVariants] = useState<VariantForm[]>([{ ...BLANK_VARIANT }]);

  const limit = 10;
  const params = { search: search || undefined, categoryId: (catFilter && catFilter !== "_all") ? parseInt(catFilter) : undefined, limit, page };
  const { data: productsPage, isLoading } = useGetProducts(params, { query: { queryKey: getGetProductsQueryKey(params) } });
  const { data: categories } = useGetCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetProductsQueryKey() }); }

  const duplicateProduct = useMutation({
    mutationFn: async (id: number) => {
      const res = await customFetch(`/api/products/${id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { invalidate(); toast({ title: "Product duplicated" }); },
    onError: () => toast({ title: "Failed to duplicate", variant: "destructive" }),
  });

  function addVariant() { setVariants(v => [...v, { ...BLANK_VARIANT, unitValue: "" }]); }
  function removeVariant(i: number) { setVariants(v => v.filter((_, idx) => idx !== i)); }

  function openCreate() {
    setEditing(null);
    setForm(BLANK_FORM);
    setVariants([{ ...BLANK_VARIANT }]);
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      imageUrl: product.imageUrl ?? "",
      categoryId: String(product.categoryId),
      isFeatured: product.isFeatured,
      tags: product.tags ?? "",
    });
    setVariants(product.variants.map(v => ({
      unit: v.unit,
      unitValue: String(v.unitValue),
      price: String(v.price),
      mrp: String(v.mrp),
      stock: String(v.stock),
    })));
    setOpen(true);
  }

  function handleSave() {
    if (!form.name || !form.categoryId || !variants[0]?.price) return;
    if (editing) {
      updateProduct.mutate({
        id: editing.id,
        data: {
          name: form.name,
          description: form.description || ("" as any),
          imageUrl: form.imageUrl || ("" as any),
          categoryId: parseInt(form.categoryId),
          isFeatured: form.isFeatured,
          tags: (form.tags ? form.tags.split(",").map(t => t.trim()) : []) as any,
        }
      }, {
        onSuccess: () => { invalidate(); toast({ title: "Product updated" }); setOpen(false); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createProduct.mutate({
        data: {
          name: form.name,
          slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
          description: form.description || ("" as any),
          imageUrl: form.imageUrl || ("" as any),
          categoryId: parseInt(form.categoryId),
          isFeatured: form.isFeatured,
          tags: (form.tags ? form.tags.split(",").map(t => t.trim()) : []) as any,
          variants: variants.filter(v => v.price).map(v => ({
            id: 0, unit: v.unit, unitValue: v.unitValue,
            price: parseFloat(v.price), mrp: parseFloat(v.mrp || v.price),
            stock: parseInt(v.stock || "100"),
          })),
        }
      }, {
        onSuccess: () => { invalidate(); toast({ title: "Product created" }); setOpen(false); },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    }
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteProduct.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Product deleted" }); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold">Products</h1>
              <p className="text-sm text-muted-foreground">{productsPage?.total ?? 0} total products</p>
            </div>
            <Button className="bg-primary gap-1" onClick={openCreate} data-testid="button-add-product">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input data-testid="input-search" placeholder="Search products..." className="pl-10" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={catFilter || "_all"} onValueChange={v => { setCatFilter(v === "_all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44" data-testid="select-category-filter"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All categories</SelectItem>
                {(Array.isArray(categories) ? categories : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Product</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Category</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Price</th>
                      <th className="text-center p-3 text-xs text-muted-foreground font-medium">Variants</th>
                      <th className="text-center p-3 text-xs text-muted-foreground font-medium">Stock</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsPage?.data.map(product => {
                      const v = product.variants[0];
                      const totalStock = product.variants.reduce((s, vi) => s + vi.stock, 0);
                      return (
                        <tr key={product.id} className="border-b last:border-0 hover:bg-muted/20" data-testid={`product-row-${product.id}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover" />
                              ) : (
                                <div className="w-9 h-9 bg-primary/10 rounded-lg" />
                              )}
                              <div>
                                <p className="font-medium line-clamp-1 max-w-48">{product.name}</p>
                                {product.isFeatured && <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px] mt-0.5"><Star className="h-2.5 w-2.5 mr-0.5" />Featured</Badge>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{product.categoryName}</td>
                          <td className="p-3 font-medium">{v ? `₹${v.price}` : "—"}</td>
                          <td className="p-3 text-center text-muted-foreground">{product.variants.length}</td>
                          <td className="p-3 text-center">
                            <Badge className={totalStock > 0 ? "bg-green-100 text-green-700 border-0 text-[10px]" : "bg-red-100 text-red-700 border-0 text-[10px]"}>
                              {totalStock > 0 ? totalStock : "Out"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(product as unknown as ProductRow)} data-testid={`button-edit-${product.id}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600" onClick={() => duplicateProduct.mutate(product.id)} title="Duplicate product" disabled={duplicateProduct.isPending}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)} data-testid={`button-delete-${product.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!productsPage?.data.length && (
                  <div className="text-center py-12 text-muted-foreground text-sm">No products found</div>
                )}
                
                {productsPage && productsPage.total > limit && (
                  <div className="p-4 border-t flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, productsPage.total)} of {productsPage.total}
                    </p>
                    <Pagination className="w-auto mx-0">
                      <PaginationContent>
                        <PaginationItem>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                        </PaginationItem>
                        <PaginationItem>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= productsPage.total}>Next</Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Product Name</Label>
                <Input
                  data-testid="input-product-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editing ? f.slug : e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  placeholder="Basmati Rice"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="mt-1" data-testid="select-category"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(categories) ? categories : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea data-testid="input-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description..." className="mt-1 h-16 resize-none" /></div>
            <div><Label>Image URL</Label><Input data-testid="input-image-url" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" /></div>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" className="h-24 rounded-lg object-cover border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.isFeatured} onCheckedChange={v => setForm(f => ({ ...f, isFeatured: v }))} data-testid="switch-featured" />
              <Label>Featured Product</Label>
            </div>

            {!editing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Variants (Size/Weight)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant} className="h-6 text-xs">+ Add Variant</Button>
                </div>
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                    <div><Label className="text-xs">Qty</Label><Input value={v.unitValue} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, unitValue: e.target.value } : x))} placeholder="500" className="mt-1 h-8 text-xs" /></div>
                    <div><Label className="text-xs">Unit</Label><Input value={v.unit} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} placeholder="g" className="mt-1 h-8 text-xs" /></div>
                    <div><Label className="text-xs">Price ₹</Label><Input type="number" value={v.price} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="45" className="mt-1 h-8 text-xs" /></div>
                    <div><Label className="text-xs">MRP ₹</Label><Input type="number" value={v.mrp} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, mrp: e.target.value } : x))} placeholder="55" className="mt-1 h-8 text-xs" /></div>
                    <div className="flex gap-1">
                      <div className="flex-1"><Label className="text-xs">Stock</Label><Input type="number" value={v.stock} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))} placeholder="100" className="mt-1 h-8 text-xs" /></div>
                      {i > 0 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-5 text-destructive" onClick={() => removeVariant(i)}><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">To edit stock/price after creation, use the Inventory page.</p>
              </div>
            )}

            {editing && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                To update stock or pricing, use the <strong>Inventory</strong> page after saving.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={handleSave} disabled={isPending || !form.name || !form.categoryId} data-testid="button-create-product">
              {isPending ? (editing ? "Saving..." : "Creating...") : (editing ? "Save Changes" : "Create Product")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
