import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getGetCategoriesQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";

interface CatRow { id: number; name: string; slug: string; imageUrl: string; productCount: number; }

const BLANK = { name: "", slug: "", imageUrl: "" };

export default function AdminCategories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatRow | null>(null);
  const [form, setForm] = useState(BLANK);

  const { data: categories, isLoading } = useGetCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() }); }

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(cat: CatRow) {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, imageUrl: cat.imageUrl ?? "" });
    setOpen(true);
  }

  function handleSave() {
    if (!form.name || !form.slug) return;
    if (editing) {
      updateCategory.mutate({ id: editing.id, data: { name: form.name, slug: form.slug, imageUrl: form.imageUrl || undefined } }, {
        onSuccess: () => { invalidate(); toast({ title: "Category updated" }); setOpen(false); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createCategory.mutate({ data: { name: form.name, slug: form.slug, imageUrl: form.imageUrl || undefined } }, {
        onSuccess: () => { invalidate(); toast({ title: "Category created" }); setOpen(false); },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    }
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? Products in this category will be uncategorized.`)) return;
    deleteCategory.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Category deleted" }); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Categories</h1>
              <p className="text-sm text-muted-foreground">{categories?.length ?? 0} categories</p>
            </div>
            <Button className="bg-primary gap-1" onClick={openCreate} data-testid="button-add-category">
              <Plus className="h-4 w-4" /> Add Category
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
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Category</th>
                    <th className="text-left p-3 text-xs text-muted-foreground font-medium">Slug</th>
                    <th className="text-center p-3 text-xs text-muted-foreground font-medium">Products</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(categories) ? categories : []).map(cat => (
                    <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/20" data-testid={`category-row-${cat.id}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{cat.name.charAt(0)}</div>
                          )}
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                      <td className="p-3 text-center">{cat.productCount}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(cat as CatRow)} data-testid={`button-edit-category-${cat.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id, cat.name)} data-testid={`button-delete-category-${cat.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                data-testid="input-category-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editing ? f.slug : e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                placeholder="Vegetables"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input data-testid="input-category-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="vegetables" className="mt-1 font-mono" />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input data-testid="input-category-image" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" className="h-20 rounded-lg object-cover border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={handleSave} disabled={isPending || !form.name || !form.slug} data-testid="button-create-category">
              {isPending ? "Saving..." : editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
