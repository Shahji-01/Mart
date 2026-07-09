import { Link, useLocation } from "wouter";
import { Heart, ShoppingCart, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetWishlist, useRemoveFromWishlist, useAddToCart, getGetCartQueryKey, getGetWishlistQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { useState } from "react";

export default function WishlistPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();
  const [addingId, setAddingId] = useState<number | null>(null);

  const { data: items = [], isLoading } = useGetWishlist({ query: { enabled: !!token, queryKey: getGetWishlistQueryKey() } });
  const removeFromWishlist = useRemoveFromWishlist();
  const addToCart = useAddToCart();

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Please login to view your wishlist</p>
          <Link href="/login"><Button>Login</Button></Link>
        </div>
      </div>
    );
  }

  function handleRemove(productId: number) {
    removeFromWishlist.mutate({ productId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
        toast({ title: "Removed from wishlist" });
      },
    });
  }

  async function handleAddToCart(productId: number, name: string) {
    if (!authStore.getToken()) { setLocation("/login"); return; }
    setAddingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      const product = await res.json();
      const variantId: number | undefined = product.variants?.[0]?.id;
      if (!variantId) throw new Error("No variant available");
      await addToCart.mutateAsync({ data: { productId, variantId, quantity: 1 } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Added to cart", description: name });
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6 text-red-500 fill-red-500" /> My Wishlist</h1>
          <span className="text-muted-foreground text-sm">({items.length} items)</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">Save products you love to buy them later</p>
            <Link href="/category/all"><Button className="bg-primary">Start Shopping</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-card rounded-xl border overflow-hidden group relative">
                <button
                  onClick={() => handleRemove(item.productId)}
                  className="absolute top-2 right-2 z-10 bg-white rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
                <Link href={`/product/${item.productId}`}>
                  <div className="aspect-square bg-muted overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <Link href={`/product/${item.productId}`}>
                    <p className="font-medium text-sm line-clamp-2 hover:text-primary mb-1">{item.productName}</p>
                  </Link>
                  <p className="text-primary font-bold text-sm mb-3">₹{item.price}</p>
                  <Button
                    size="sm"
                    className="w-full bg-primary h-8 text-xs gap-1"
                    onClick={() => handleAddToCart(item.productId, item.productName)}
                    disabled={addingId === item.productId}
                  >
                    {addingId === item.productId
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <><ShoppingCart className="h-3 w-3" /> Add to Cart</>
                    }
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
