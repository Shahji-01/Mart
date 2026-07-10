import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingCart, Package, Shield, Truck, Heart, Star, Share2, MessageCircle, Send, Bell, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useGetProduct, useAddToCart, getGetCartQueryKey, useGetWishlist, useAddToWishlist, useRemoveFromWishlist, getGetWishlistQueryKey, useGetProductReviews, useCreateReview, getGetProductReviewsQueryKey } from "@workspace/api-client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { Navbar } from "@/components/layout/navbar";
import { SEO } from "@/components/seo";
import { usePincode } from "@/lib/location-store";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

interface RelatedProduct {
  id: number; name: string; imageUrl: string; categoryId: number;
  variants: { id: number; price: number; mrp: number; unit: string; unitValue: string; stock: number }[];
}

interface QA {
  id: number;
  question: string;
  answer: string | null;
  askedBy: string;
  createdAt: string;
}

function QASection({ productId }: { productId: number }) {
  const token = authStore.getToken();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: qaList = [], refetch } = useQuery<QA[]>({
    queryKey: ["product-qa", productId],
    queryFn: async () => {
      const res = await customFetch(`/api/products/${productId}/qa`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!productId,
  });

  const askQuestion = useMutation({
    mutationFn: async (q: string) => {
      const res = await customFetch(`/api/products/${productId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question submitted!" });
      setQuestion("");
      setShowForm(false);
      refetch();
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  return (
    <div className="mt-10">
      <Separator className="mb-6" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" /> Questions & Answers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{qaList.length} question{qaList.length !== 1 ? "s" : ""}</p>
        </div>
        {token && !showForm && (
          <Button variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
            <MessageCircle className="h-4 w-4" /> Ask a Question
          </Button>
        )}
        {!token && (
          <Link href="/login">
            <Button variant="outline" size="sm">Login to Ask</Button>
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-5 mb-5">
          <h3 className="font-semibold mb-3">Ask a Question</h3>
          <Input
            placeholder="What would you like to know about this product?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="mb-3"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowForm(false); setQuestion(""); }}>Cancel</Button>
            <Button
              className="bg-primary gap-2"
              onClick={() => question.trim() && askQuestion.mutate(question.trim())}
              disabled={askQuestion.isPending || !question.trim()}
            >
              <Send className="h-4 w-4" />
              {askQuestion.isPending ? "Submitting…" : "Submit Question"}
            </Button>
          </div>
        </div>
      )}

      {qaList.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {qaList.map(qa => (
            <div key={qa.id} className="bg-card border rounded-xl p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">Q</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{qa.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Asked by {qa.askedBy} · {new Date(qa.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  {qa.answer && (
                    <div className="mt-3 flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-green-600">A</span>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 flex-1">
                        <p className="text-sm text-green-900">{qa.answer}</p>
                        <p className="text-xs text-green-600 mt-1 font-medium">Shankeshwar Traders Team</p>
                      </div>
                    </div>
                  )}
                  {!qa.answer && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Awaiting answer from seller…</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FlashSale {
  id: number;
  label: string;
  productId: number;
  discountType: string;
  discountValue: number;
  endsAt: string;
  isLive: boolean;
  variants: { id: number; price: number; salePrice: number; unit: string; unitValue: string }[];
}

function useFlashCountdown(endsAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    function tick() {
      const diff = new Date(endsAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s });
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  return timeLeft;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const productId = parseInt(id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();
  const pincode = usePincode();

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: [`product-${productId}`] },
  });
  const { data: wishlistItems = [] } = useGetWishlist({ query: { enabled: !!token, queryKey: getGetWishlistQueryKey() } });
  const { data: reviews = [] } = useGetProductReviews(productId, { query: { enabled: !!productId, queryKey: getGetProductReviewsQueryKey(productId) } });

  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const flashTimeLeft = useFlashCountdown(flashSale?.endsAt ?? null);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const createReview = useCreateReview();

  const selectedVariant = selectedVariantId
    ? product?.variants.find(v => v.id === selectedVariantId)
    : product?.variants[0];

  const isWishlisted = wishlistItems.some(w => w.productId === productId);

  const productExtra = product as typeof product & { images?: string };
  const productImages: string[] = product
    ? [product.imageUrl, ...(Array.isArray(productExtra.images) ? productExtra.images : [])].filter(Boolean)
    : [];
  const displayImage = selectedImage ?? productImages[0] ?? "";

  useEffect(() => {
    if (!product) return;
    const KEY = "ntc_recently_viewed";
    const prev: number[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const updated = [product.id, ...prev.filter(i => i !== product.id)].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(updated));
  }, [product?.id]);

  useEffect(() => {
    if (!productId) return;
    customFetch("/api/flash-sales?active=true")
      .then(r => r.ok ? r.json() : [])
      .then((sales: FlashSale[]) => {
        const match = sales.find(s => s.productId === productId && s.isLive);
        setFlashSale(match ?? null);
      })
      .catch(() => setFlashSale(null));
  }, [productId]);

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard!" });
    }
  }

  function handleAdd() {
    if (!token) { setLocation("/login"); return; }
    const variantId = selectedVariant?.id ?? product?.variants[0]?.id;
    if (!variantId || !product) return;
    addToCart.mutate({ data: { productId: product.id, variantId, quantity: qty } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Added to cart", description: `${product.name} x${qty}` });
      },
            onError: () => toast({ title: "Please login to add items to cart", variant: "destructive" }),
    });
  }

  async function handleNotifyMe() {
    if (!token) { setLocation("/login"); return; }
    const variantId = selectedVariant?.id ?? product?.variants[0]?.id;
    if (!variantId) return;
    try {
      await customFetch(`/api/products/variants/${variantId}/notify-me`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "We'll notify you!", description: "You'll get an alert when this item is back in stock." });
    } catch { toast({ title: "Failed to register", variant: "destructive" }); }
  }

  async function handleSubscribe() {
    if (!token) { setLocation("/login"); return; }
    const variantId = selectedVariant?.id ?? product?.variants[0]?.id;
    if (!variantId || !product) return;
    try {
      const res = await customFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, variantId, quantity: qty, frequency: "weekly" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Subscribed weekly", description: "Auto-refills will be added to your cart. Manage in My Subscriptions." });
    } catch { toast({ title: "Couldn't subscribe", variant: "destructive" }); }
  }

  function handleWishlist() {
    if (!token) { setLocation("/login"); return; }
    if (isWishlisted) {
      removeFromWishlist.mutate({ productId }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }); toast({ title: "Removed from wishlist" }); },
      });
    } else {
      addToWishlist.mutate({ data: { productId } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }); toast({ title: "Added to wishlist" }); },
      });
    }
  }

  function handleReviewSubmit() {
    if (!token) { setLocation("/login"); return; }
    createReview.mutate({ id: productId, data: { rating: reviewRating, comment: reviewComment } }, {
      onSuccess: () => {
        // Refetch the reviews list using the generated key so it matches the
        // query above; a refetch failure must not be surfaced as a mutation
        // failure (R12.4).
        void qc.invalidateQueries({ queryKey: getGetProductReviewsQueryKey(productId) });
        toast({ title: "Review submitted!" });
        setReviewComment("");
        setReviewRating(5);
        setShowReviewForm(false);
      },
      onError: () => toast({ title: "Failed to submit review", variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold">Product not found</h2>
          <Link href="/"><Button className="mt-4">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  const discount = selectedVariant && selectedVariant.mrp > selectedVariant.price
    ? Math.round((1 - selectedVariant.price / selectedVariant.mrp) * 100) : 0;

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    description: product.description || `Buy ${product.name} at Shankeshwar Traders.`,
    category: product.categoryName,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: selectedVariant?.price ?? product.variants[0]?.price ?? 0,
      availability: (selectedVariant?.stock ?? 0) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(avgRating.toFixed(1)),
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      {product && (
        <SEO 
          title={product.name}
          description={product.description || `Buy ${product.name} at Shankeshwar Traders.`}
          image={product.imageUrl}
          jsonLd={productJsonLd}
        />
      )}
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Link href={`/category/all`}>
          <Button variant="ghost" size="sm" className="mb-4 gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
              {displayImage ? (
                <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-accent text-white font-bold text-sm px-3 py-1 rounded-full">
                  {discount}% OFF
                </div>
              )}
              <button
                onClick={handleWishlist}
                className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${isWishlisted ? "bg-red-500 text-white" : "bg-white text-muted-foreground hover:text-red-500"}`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                title="Share product"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {productImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${(selectedImage ?? productImages[0]) === img ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Badge variant="outline" className="text-xs mb-2">{product.categoryName}</Badge>
                  <h1 className="text-2xl font-bold" data-testid="text-product-name">{product.name}</h1>
                </div>
                <button
                  onClick={handleShare}
                  className="flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors mt-1"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />)}
                  <span className="text-sm text-muted-foreground ml-1">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                </div>
              )}
              <p className="text-muted-foreground text-sm mt-2">{product.description}</p>
            </div>

            {/* Flash sale banner */}
            {flashSale && flashTimeLeft && (() => {
              const flashVariant = flashSale.variants.find(v => v.id === (selectedVariant?.id ?? product.variants[0]?.id));
              if (!flashVariant) return null;
              const pad = (n: number) => String(n).padStart(2, "0");
              return (
                <div className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-1">⚡ {flashSale.label}</span>
                    <span className="text-xs bg-white/20 rounded-md px-2 py-0.5 font-mono font-bold">
                      {pad(flashTimeLeft.h)}:{pad(flashTimeLeft.m)}:{pad(flashTimeLeft.s)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">₹{flashVariant.salePrice}</span>
                    <span className="text-sm line-through opacity-75">₹{flashVariant.price}</span>
                    <span className="text-xs bg-white text-orange-600 font-bold rounded px-1.5 py-0.5">
                      {flashSale.discountType === "percentage" ? `${flashSale.discountValue}% OFF` : `₹${flashSale.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-xs opacity-80">Flash price · ends when timer hits zero</p>
                </div>
              );
            })()}

            {/* Price */}
            {selectedVariant && !flashSale && (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary" data-testid="text-price">₹{selectedVariant.price}</span>
                {selectedVariant.mrp > selectedVariant.price && (
                  <span className="text-lg text-muted-foreground line-through">₹{selectedVariant.mrp}</span>
                )}
                {discount > 0 && <Badge className="bg-green-100 text-green-700 border-0">Save ₹{(selectedVariant.mrp - selectedVariant.price).toFixed(0)}</Badge>}
              </div>
            )}
            {selectedVariant && flashSale && (
              <span className="text-sm text-muted-foreground" data-testid="text-price">MRP ₹{selectedVariant.mrp}</span>
            )}

            {/* Variant selector */}
            {product.variants.length > 1 && (
              <div>
                <p className="text-sm font-medium mb-2">Select Size/Weight</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        (selectedVariantId === v.id || (!selectedVariantId && v.id === product.variants[0]?.id))
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      } ${v.stock === 0 ? "opacity-50 line-through" : ""}`}
                      disabled={v.stock === 0}
                      data-testid={`button-variant-${v.id}`}
                    >
                      {v.unitValue} {v.unit}
                      <span className="block text-xs font-bold text-primary">₹{v.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty & Add */}
            {(selectedVariant?.stock ?? 0) === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <Package className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Out of Stock</p>
                    <p className="text-xs text-red-500">This variant is currently unavailable</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    variant="outline"
                    onClick={handleNotifyMe}
                    data-testid="button-notify-me"
                  >
                    <Bell className="h-4 w-4 text-primary" />
                    Notify Me When Back
                  </Button>
                  <Button variant="outline" size="icon" className={`h-10 w-10 ${isWishlisted ? "text-red-500 border-red-200 bg-red-50" : ""}`} onClick={handleWishlist}>
                    <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border rounded-lg overflow-hidden">
                  <Button variant="ghost" size="icon" className="h-10 rounded-none" onClick={() => setQty(q => Math.max(1, q - 1))}>-</Button>
                  <span className="w-8 text-center font-medium" data-testid="text-quantity">{qty}</span>
                  <Button variant="ghost" size="icon" className="h-10 rounded-none" onClick={() => setQty(q => q + 1)}>+</Button>
                </div>
                <Button
                  className="flex-1 bg-primary h-10 gap-2"
                  onClick={handleAdd}
                  disabled={addToCart.isPending}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addToCart.isPending ? "Adding..." : "Add to Cart"}
                </Button>
                <Button variant="outline" size="icon" className={`h-10 w-10 ${isWishlisted ? "text-red-500 border-red-200 bg-red-50" : ""}`} onClick={handleWishlist}>
                  <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Delivery ETA by pincode */}
            <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-100 rounded-xl p-3">
              <Truck className="h-4 w-4 text-green-600 flex-shrink-0" />
              {pincode ? (
                <span className="text-green-800">Delivering to <b>{pincode}</b> in ~10 minutes</span>
              ) : (
                <span className="text-green-800/80">Set your delivery location in the top bar for delivery time & charges</span>
              )}
            </div>

            {(selectedVariant?.stock ?? 0) > 0 && (
              <button
                onClick={handleSubscribe}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl py-2.5 transition-colors"
                data-testid="button-subscribe"
              >
                <RotateCcw className="h-4 w-4" /> Subscribe weekly &amp; never run out
              </button>
            )}

            {/* Info */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Truck, title: "Free delivery", sub: "On ₹499+" },
                { icon: Shield, title: "Fresh quality", sub: "Guaranteed" },
                { icon: Package, title: "Easy returns", sub: "No questions" },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="text-center bg-muted/50 rounded-xl p-3">
                  <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xs font-medium">{title}</p>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>

            {selectedVariant && (
              <p className="text-sm text-muted-foreground">
                Stock: <span className={selectedVariant.stock > 10 ? "text-green-600 font-medium" : "text-orange-500 font-medium"}>
                  {selectedVariant.stock > 0 ? `${selectedVariant.stock} available` : "Out of stock"}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-10">
          <Separator className="mb-6" />
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Customer Reviews</h2>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />)}
                  </div>
                  <span className="font-semibold">{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                </div>
              )}
            </div>
            {token && !showReviewForm && (
              <Button variant="outline" className="gap-2" onClick={() => setShowReviewForm(true)}>
                <Star className="h-4 w-4" /> Write a Review
              </Button>
            )}
            {!token && (
              <Link href="/login">
                <Button variant="outline" size="sm">Login to Review</Button>
              </Link>
            )}
          </div>

          {showReviewForm && (
            <div className="bg-card border rounded-xl p-5 mb-5">
              <h3 className="font-semibold mb-3">Your Review</h3>
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Rating</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setReviewRating(s)}>
                      <Star className={`h-7 w-7 transition-colors ${s <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Share your experience with this product (optional)..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                className="mb-3 resize-none"
                rows={3}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowReviewForm(false); setReviewComment(""); setReviewRating(5); }}>Cancel</Button>
                <Button className="bg-primary" onClick={handleReviewSubmit} disabled={createReview.isPending}>
                  {createReview.isPending ? "Submitting…" : "Submit Review"}
                </Button>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="bg-card border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {r.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.userName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />)}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Q&A Section */}
        <QASection productId={productId} />

        {/* Related Products */}
        <RelatedProducts productId={productId} onAddToCart={(pid, vid) => {
          if (!token) { setLocation("/login"); return; }
          addToCart.mutate({ data: { productId: pid, variantId: vid, quantity: 1 } }, {
            onSuccess: () => { qc.invalidateQueries({ queryKey: getGetCartQueryKey() }); toast({ title: "Added to cart" }); },
                  onError: () => toast({ title: "Please login to add items to cart", variant: "destructive" }),
          });
        }} />
      </main>
    </div>
  );
}

function RelatedProducts({ productId, onAddToCart }: { productId: number; onAddToCart: (pid: number, vid: number) => void }) {
  const { data: related = [], isLoading } = useQuery<RelatedProduct[]>({
    queryKey: ["related-products", productId],
    queryFn: async () => {
      const res = await customFetch(`/api/products/${productId}/related`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!productId,
  });

  if (isLoading) return <div className="mt-10"><Skeleton className="h-8 w-48 mb-4" /><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div></div>;
  if (related.length === 0) return null;

  return (
    <div className="mt-10">
      <Separator className="mb-6" />
      <h2 className="text-xl font-bold mb-5">You might also like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {related.map(p => {
          const v = p.variants[0];
          const discount = v && v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
          return (
            <div key={p.id} className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
              <Link href={`/product/${p.id}`}>
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/300x300/f5f5f5/999?text=No+Image"; }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <Package className="h-8 w-8 text-primary/30" />
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{discount}% OFF</div>
                  )}
                </div>
              </Link>
              <div className="p-3 flex flex-col flex-1">
                <Link href={`/product/${p.id}`}><h3 className="font-medium text-sm line-clamp-2 hover:text-primary">{p.name}</h3></Link>
                {v && (
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div>
                      <span className="font-bold text-primary text-sm">₹{v.price}</span>
                      {discount > 0 && <span className="text-xs line-through text-muted-foreground ml-1">₹{v.mrp}</span>}
                    </div>
                    <Button size="sm" className="h-7 text-xs px-3 bg-primary" onClick={() => onAddToCart(p.id, v.id)} disabled={(v.stock ?? 0) === 0}>
                      {(v.stock ?? 0) === 0 ? "Out" : "Add"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
