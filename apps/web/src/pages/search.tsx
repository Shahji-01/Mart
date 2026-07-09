import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, ShoppingBag, Clock, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useGetProducts, useGetCategories } from "@workspace/api-client";
import { ProductCard } from "@/components/ui/product-card";

const RECENT_KEY = "ntc_recent_searches";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

function addRecent(q: string) {
  if (!q.trim()) return;
  const prev = getRecent();
  const updated = [q, ...prev.filter(r => r !== q)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function removeRecent(q: string) {
  const prev = getRecent();
  localStorage.setItem(RECENT_KEY, JSON.stringify(prev.filter(r => r !== q)));
}

interface Suggestion { id: number; name: string; imageUrl: string | null; }

export default function SearchPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);
  const [categoryId, setCategoryId] = useState(params.get("category") ?? "");
  const [sortBy, setSortBy] = useState("name");
  const [inStock, setInStock] = useState(false);
  const [, setLocation] = useLocation();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(searchString);
    const q = p.get("q") ?? "";
    setQuery(q);
    setInputVal(q);
    setCategoryId(p.get("category") ?? "");
  }, [searchString]);

  const { data: productsData, isLoading } = useGetProducts({
    search: query || undefined,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    inStock: inStock ? true : undefined,
    limit: 48,
  });
  const { data: categories } = useGetCategories();

  // Autocomplete suggestions
  useEffect(() => {
    if (inputVal.length < 2) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search-suggestions?q=${encodeURIComponent(inputVal)}`);
        if (res.ok) setSuggestions(await res.json());
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(timeout);
  }, [inputVal]);

  // Debounce query
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(inputVal), 400);
    return () => clearTimeout(timeout);
  }, [inputVal]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSearch(q: string) {
    addRecent(q);
    setRecentSearches(getRecent());
    setInputVal(q);
    setQuery(q);
    setFocused(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputVal.trim()) handleSearch(inputVal.trim());
  }

  const sortedProducts = [...(productsData?.data ?? [])].sort((a, b) => {
    if (sortBy === "price_asc") return (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0);
    if (sortBy === "price_desc") return (b.variants[0]?.price ?? 0) - (a.variants[0]?.price ?? 0);
    if (sortBy === "discount") {
      const da = a.variants[0] ? Math.round(((a.variants[0].mrp - a.variants[0].price) / a.variants[0].mrp) * 100) : 0;
      const db = b.variants[0] ? Math.round(((b.variants[0].mrp - b.variants[0].price) / b.variants[0].mrp) * 100) : 0;
      return db - da;
    }
    return a.name.localeCompare(b.name);
  });

  const showDropdown = focused && (suggestions.length > 0 || (inputVal.length === 0 && recentSearches.length > 0));
  const hasFilters = query || categoryId || inStock;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  className="pl-10 pr-10 h-12 text-base rounded-xl border-2 focus-visible:border-primary"
                  placeholder="Search groceries, vegetables, daily essentials..."
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onFocus={() => setFocused(true)}
                  autoFocus
                />
                {inputVal && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-muted-foreground/20 rounded-full flex items-center justify-center hover:bg-muted-foreground/30 transition-colors"
                    onClick={() => { setInputVal(""); setQuery(""); setSuggestions([]); }}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </form>

            {/* Autocomplete / Recent dropdown */}
            {showDropdown && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border rounded-xl shadow-lg overflow-hidden">
                {inputVal.length === 0 && recentSearches.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Recent Searches
                    </p>
                    {recentSearches.map(r => (
                      <div key={r} className="flex items-center justify-between group">
                        <button
                          type="button"
                          className="flex-1 text-left text-sm py-1.5 px-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                          onClick={() => handleSearch(r)}
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {r}
                        </button>
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { removeRecent(r); setRecentSearches(getRecent()); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {inputVal.length >= 2 && suggestions.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1 px-2 flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" /> Suggestions
                    </p>
                    {suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => {
                          handleSearch(s.name);
                          setLocation(`/product/${s.id}`);
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {s.imageUrl && <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-sm">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Select value={categoryId || "all"} onValueChange={v => setCategoryId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Array.isArray(categories) ? categories : []).map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

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

            <Button
              variant={inStock ? "default" : "outline"}
              size="sm"
              onClick={() => setInStock(!inStock)}
              className="h-9"
            >
              In Stock Only
            </Button>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground hover:text-destructive"
                onClick={() => { setInputVal(""); setQuery(""); setCategoryId(""); setInStock(false); }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear all
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Searching..." : (
                <>
                  <span className="font-semibold text-foreground">{sortedProducts.length}</span>
                  {" "}product{sortedProducts.length !== 1 ? "s" : ""} found
                  {query && <span> for "<span className="text-primary font-medium">{query}</span>"</span>}
                </>
              )}
            </p>
            {query && (
              <div className="flex gap-1 flex-wrap">
                {categories?.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3).map(c => (
                  <Link key={c.id} href={`/category/${c.slug}`}>
                    <Badge variant="outline" className="cursor-pointer text-xs hover:bg-primary hover:text-white transition-colors">
                      Browse {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {query ? `We couldn't find any products matching "${query}". Try a different term or browse by category.` : "Try searching for vegetables, fruits, dairy, or any daily essential."}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={() => { setInputVal(""); setQuery(""); setCategoryId(""); setInStock(false); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product as Parameters<typeof ProductCard>[0]["product"]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
