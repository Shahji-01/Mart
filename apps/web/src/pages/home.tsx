import { Link } from "wouter";
import { ShoppingBag, ChevronRight, Star, Truck, Shield, Clock, ChevronLeft, Zap, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCategories, useGetFeaturedProducts, useGetBanners, useAddToCart, getGetCartQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useState, useEffect, useCallback } from "react";
import { SEO } from "@/components/seo";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { ProductCard } from "@/components/ui/product-card";

interface FlashSale {
  id: number;
  label: string;
  productId: number;
  productName: string;
  productImage: string;
  discountType: string;
  discountValue: number;
  endsAt: string;
  isLive: boolean;
  variants: { id: number; price: number; salePrice: number; mrp: number; unit: string; unitValue: string; stock: number }[];
}

function FlashSalesBanner() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/flash-sales?active=true")
      .then(r => r.ok ? r.json() : [])
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && sales.length === 0) return null;
  if (loading) return <Skeleton className="h-28 rounded-2xl" />;

  return (
    <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Zap className="h-4 w-4 fill-white" />
          </div>
          <span className="font-bold text-lg">Flash Deals</span>
          <Badge className="bg-white/20 text-white border-white/30 text-[10px] animate-pulse">LIVE</Badge>
        </div>
        <Link href="/flash-sales">
          <Button size="sm" variant="outline" className="border-white/50 text-white hover:bg-white/20 hover:text-white h-8 text-xs">
            View All
          </Button>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {sales.slice(0, 6).map(s => {
          const v = s.variants[0];
          if (!v) return null;
          const disc = Math.round(((v.price - v.salePrice) / v.price) * 100);
          return (
            <Link key={s.id} href={`/product/${s.productId}`}>
              <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 min-w-[170px] cursor-pointer transition-colors">
                <img
                  src={s.productImage}
                  alt={s.productName}
                  className="w-12 h-12 rounded-lg object-cover bg-white/20 flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/48x48/ffffff/333333?text=P"; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium line-clamp-1">{s.productName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-sm">₹{v.salePrice}</span>
                    <span className="text-[10px] line-through opacity-75">₹{v.price}</span>
                  </div>
                  {disc > 0 && (
                    <Badge className="bg-white text-red-500 border-0 text-[9px] px-1 py-0 mt-0.5">{disc}% OFF</Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const FALLBACK_SLIDES = [
  { id: 0, title: "Fresh Groceries Delivered Same Day", subtitle: "Free delivery on orders above ₹499", imageUrl: "", linkUrl: "/category/vegetables", bgColor: "from-primary to-primary/80" },
  { id: 1, title: "Up to 30% off on Daily Essentials", subtitle: "Best prices on dairy, grains & spices", imageUrl: "", linkUrl: "/category/dairy", bgColor: "from-accent/90 to-accent/60" },
];

function HeroBanner() {
  const { data: banners, isLoading } = useGetBanners();
  const [idx, setIdx] = useState(0);

  const slides = Array.isArray(banners) && banners.length > 0
    ? banners.map(b => ({ id: b.id, title: b.title, subtitle: "Exclusive offers just for you", imageUrl: b.imageUrl ?? "", linkUrl: b.linkUrl ?? "/category/all", bgColor: "from-primary to-primary/80" }))
    : FALLBACK_SLIDES;

  const prev = useCallback(() => setIdx(i => (i - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [next, slides.length]);

  if (isLoading) return <Skeleton className="w-full h-56 md:h-72 rounded-2xl" />;

  const slide = slides[idx];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl h-56 md:h-72 group shadow-lg">
      {slide?.imageUrl ? (
        <div className="absolute inset-0">
          <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-r ${slide?.bgColor ?? "from-primary to-primary/80"}`} />
      )}

      <div className="relative z-10 h-full flex items-center px-8 md:px-16">
        <div>
          <Badge className="bg-accent text-white border-0 mb-3 shadow-sm text-xs">Limited Offer</Badge>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-lg drop-shadow">
            {slide?.title ?? "Fresh groceries at your doorstep"}
          </h1>
          <p className="text-white/85 mt-2 text-sm md:text-base drop-shadow-sm">
            {slide?.subtitle ?? "Serving all Banswara pincodes • Same day delivery"}
          </p>
          <Link href={slide?.linkUrl ?? "/category/all"}>
            <Button className="mt-4 bg-white text-primary hover:bg-white/90 font-semibold shadow-md" data-testid="button-shop-now">
              Shop Now <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-20">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-20">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-2 rounded-full transition-all ${i === idx ? "bg-white w-6" : "bg-white/50 w-2"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryGrid() {
  const { data: categories, isLoading } = useGetCategories();

  if (isLoading) return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-2xl" />
          <Skeleton className="w-14 h-3" />
        </div>
      ))}
    </div>
  );

  const catColors = [
    "bg-green-100/50", "bg-orange-100/50", "bg-purple-100/50", "bg-blue-100/50",
    "bg-yellow-100/50", "bg-pink-100/50", "bg-teal-100/50", "bg-red-100/50"
  ];

  return (
    <div className="flex gap-4 md:grid md:grid-cols-8 overflow-x-auto pb-4 scrollbar-hide px-1">
      <Link href="/category/all">
        <div className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px]" data-testid="link-category-all">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingBag className="h-7 w-7 text-primary" />
          </div>
          <span className="text-xs font-medium text-center text-primary whitespace-nowrap">All Items</span>
        </div>
      </Link>
      {(Array.isArray(categories) ? categories : []).map((cat, i) => (
        <Link key={cat.id} href={`/category/${cat.slug}`}>
          <div className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px]" data-testid={`link-category-${cat.id}`}>
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shadow-sm ${catColors[i % catColors.length]}`}>
              {cat.imageUrl ? (
                <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
              ) : (
                <span className="text-2xl font-bold text-gray-400">{cat.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-xs font-medium text-center text-foreground line-clamp-1 break-all w-16">{cat.name}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Imported ProductCard from components/ui/product-card

function RecentlyViewed() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    const saved: number[] = JSON.parse(localStorage.getItem("ntc_recently_viewed") ?? "[]");
    setIds(saved.slice(0, 6));
  }, []);

  if (ids.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Recently Viewed</h2>
          <p className="text-sm text-muted-foreground">Pick up where you left off</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {ids.map(id => (
          <Link key={id} href={`/product/${id}`}>
            <RecentProductCard productId={id} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentProductCard({ productId }: { productId: number }) {
  const [data, setData] = useState<{ name: string; imageUrl: string; price: number } | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (p) setData({ name: p.name, imageUrl: p.imageUrl, price: p.variants?.[0]?.price ?? 0 });
      })
      .catch(() => {});
  }, [productId]);

  if (!data) return (
    <div className="w-28 flex-shrink-0 bg-card border rounded-xl overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-2"><Skeleton className="h-3 w-full" /></div>
    </div>
  );

  return (
    <div className="w-28 flex-shrink-0 bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
      <div className="aspect-square bg-muted overflow-hidden">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <ShoppingBag className="h-6 w-6 text-primary/30" />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium line-clamp-1">{data.name}</p>
        <p className="text-xs text-primary font-bold mt-0.5">₹{data.price}</p>
      </div>
    </div>
  );
}

function BuyAgainRail() {
  const [products, setProducts] = useState<Array<Parameters<typeof ProductCard>[0]["product"]>>([]);
  useEffect(() => {
    if (!authStore.getToken()) return;
    customFetch("/api/products/buy-again")
      .then(r => r.ok ? r.json() : [])
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);
  if (products.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Buy Again</h2>
          <p className="text-sm text-muted-foreground">Your past favourites, one tap away</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {products.slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: featured, isLoading: loadingFeatured } = useGetFeaturedProducts();

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Shankeshwar Traders - Fresh Groceries Delivered" 
        description="Shop for fresh groceries, daily essentials, and organic produce online at Shankeshwar Traders. Fast delivery to your doorstep."
      />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <HeroBanner />

        <FlashSalesBanner />

        <BuyAgainRail />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Shop by Category</h2>
            <Link href="/category/all">
              <span className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
          <CategoryGrid />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Truck, title: "Free Delivery", desc: "On orders above ₹499", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
            { icon: Shield, title: "100% Fresh", desc: "Farm fresh guarantee", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { icon: Clock, title: "Same Day", desc: "Order before 5 PM", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
          ].map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div key={title} className={`flex items-center gap-3 p-4 rounded-xl ${bg} border ${border}`}>
              <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${color}`}>{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Featured Products</h2>
              <p className="text-sm text-muted-foreground">Hand-picked fresh arrivals</p>
            </div>
            <Link href="/category/all">
              <Button variant="outline" size="sm" className="gap-1 text-primary border-primary/30">
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(Array.isArray(featured) ? featured : []).map(p => <ProductCard key={p.id} product={p as Parameters<typeof ProductCard>[0]["product"]} />)}
            </div>
          )}
        </section>

        <RecentlyViewed />

        <section className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div>
            <h2 className="text-2xl font-bold">Fresh Vegetables & Fruits</h2>
            <p className="text-white/80 mt-1">Sourced daily from local farms in Rajasthan</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {["Tomatoes", "Spinach", "Carrots", "Mangoes"].map(item => (
                <Badge key={item} className="bg-white/20 text-white border-white/30 text-xs hover:bg-white/30 cursor-pointer">{item}</Badge>
              ))}
            </div>
          </div>
          <Link href="/category/vegetables">
            <Button className="bg-white text-primary hover:bg-white/90 font-semibold flex-shrink-0 gap-2 shadow-md">
              <Star className="h-4 w-4" /> Shop Fresh
            </Button>
          </Link>
        </section>

        <section className="bg-gradient-to-r from-accent/90 to-accent rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-5 w-5" />
                <span className="font-bold text-lg">Refer & Save</span>
              </div>
              <p className="text-white/85 text-sm">Invite friends to Shankeshwar Traders and earn ₹50 wallet credit for every successful referral.</p>
            </div>
            <Link href="/referral">
              <Button className="bg-white text-accent hover:bg-white/90 font-semibold flex-shrink-0 ml-4">
                Refer Now
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
