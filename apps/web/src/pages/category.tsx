import { useParams, useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Search, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetProducts, useGetCategories, useAddToCart, getGetCartQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { SEO } from "@/components/seo";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { ProductCard } from "@/components/ui/product-card";
import { authStore } from "@/lib/auth-store";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [location] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const [search, setSearch] = useState(urlParams.get("search") || "");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);

  const { data: categories } = useGetCategories();

  // Fix: correct ternary precedence — find category only when slug is not "all"
  const category = slug !== "all" ? categories?.find(c => c.slug === slug) : undefined;
  const categoryId = slug !== "all" && category ? category.id : undefined;

  const queryParams = { categoryId, search: search || undefined, inStock: inStockOnly || undefined, page, limit: 24 };
  const { data, isLoading } = useGetProducts(queryParams);

  const addToCart = useAddToCart();
  const [adding, setAdding] = useState<number | null>(null);

  useEffect(() => { setPage(1); }, [slug, search, inStockOnly]);

  async function handleAdd(productId: number, variantId: number, name: string) {
    if (!authStore.getToken()) { window.location.href = "/login"; return; }
    setAdding(variantId);
    addToCart.mutate({ data: { productId, variantId, quantity: 1 } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Added to cart", description: name });
        setAdding(null);
      },
      onError: () => { toast({ title: "Please login to add items to cart", variant: "destructive" }); setAdding(null); },
    });
  }

  const rawProducts = data?.data ?? [];
  const sortedProducts = [...rawProducts].sort((a, b) => {
    if (sortBy === "price_asc") return (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0);
    if (sortBy === "price_desc") return (b.variants[0]?.price ?? 0) - (a.variants[0]?.price ?? 0);
    if (sortBy === "discount") {
      const da = a.variants[0] ? Math.round(((a.variants[0].mrp - a.variants[0].price) / a.variants[0].mrp) * 100) : 0;
      const db = b.variants[0] ? Math.round(((b.variants[0].mrp - b.variants[0].price) / b.variants[0].mrp) * 100) : 0;
      return db - da;
    }
    return a.name.localeCompare(b.name);
  });

  const title = slug === "all" ? "All Products" : category?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <div className="min-h-screen bg-background">
      {category && (
        <SEO 
          title={`${category.name} | Shankeshwar Traders`}
          description={category.description || `Shop for ${category.name} at Shankeshwar Traders.`}
          image={category.imageUrl ?? undefined}
        />
      )}
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {data && <p className="text-sm text-muted-foreground">{data.total} products</p>}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-4 pb-2 overflow-x-auto scrollbar-hide">
          <Link href="/category/all">
            <Badge
              variant={slug === "all" ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs font-medium"
              data-testid="badge-all"
            >
              All
            </Badge>
          </Link>
          {(Array.isArray(categories) ? categories : []).map(cat => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <Badge
                variant={slug === cat.slug ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-xs font-medium"
                data-testid={`badge-category-${cat.id}`}
              >
                {cat.name}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-card rounded-xl border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-category"
              placeholder={`Search in ${title}...`}
              className="pl-10 h-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 h-9">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="discount">Best Discount</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 h-9">
            <Switch
              id="in-stock"
              checked={inStockOnly}
              onCheckedChange={setInStockOnly}
              data-testid="switch-in-stock"
            />
            <Label htmlFor="in-stock" className="text-sm cursor-pointer whitespace-nowrap">In stock only</Label>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try a different search or category</p>
            {(search || inStockOnly) && (
              <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setInStockOnly(false); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>

            {/* Pagination */}
            {data && data.total > data.limit && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / data.limit)}</span>
                <Button variant="outline" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
