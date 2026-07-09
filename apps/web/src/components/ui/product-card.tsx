import { Link } from "wouter";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAddToCart, useUpdateCartItem, useGetCart, getGetCartQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    imageUrl: string;
    variants: { id: number; price: number; mrp: number; unit: string; unitValue: string; stock: number }[];
  };
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const addToCart = useAddToCart();
  const updateCart = useUpdateCartItem();
  const [loading, setLoading] = useState(false);
  const [notified, setNotified] = useState(false);

  const token = authStore.getToken();
  const { data: cart } = useGetCart({ query: { enabled: !!token, queryKey: getGetCartQueryKey() } });

  const defaultVariant = product.variants[0];
  const discount = defaultVariant?.mrp > defaultVariant?.price ? Math.round((1 - defaultVariant.price / defaultVariant.mrp) * 100) : 0;
  const inStock = defaultVariant?.stock > 0;

  const cartItem = useMemo(() => {
    if (!cart?.items || !defaultVariant) return null;
    return cart.items.find(i => i.variantId === defaultVariant.id);
  }, [cart, defaultVariant]);

  const quantity = cartItem?.quantity || 0;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault(); // Prevent navigating to product detail
    if (!token) { toast({ title: "Please login to add items to cart", variant: "destructive" }); return; }
    if (!defaultVariant) return;

    setLoading(true);
    try {
      await addToCart.mutateAsync({ data: { productId: product.id, variantId: defaultVariant.id, quantity: 1 } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: `${product.name} added to cart` });
    } catch { 
      toast({ title: "Failed to add to cart", variant: "destructive" }); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleUpdateQuantity(e: React.MouseEvent, newQuantity: number) {
    e.preventDefault();
    if (!cartItem) return;
    
    setLoading(true);
    try {
      await updateCart.mutateAsync({ variantId: defaultVariant.id, data: { quantity: newQuantity } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
    } catch {
      toast({ title: "Failed to update quantity", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!defaultVariant) return null;

  async function handleNotify(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) { toast({ title: "Please login to get notified", variant: "destructive" }); return; }
    if (!defaultVariant) return;
    setLoading(true);
    try {
      const res = await customFetch(`/api/products/variants/${defaultVariant.id}/notify-me`, { method: "POST" });
      if (!res.ok) throw new Error();
      setNotified(true);
      toast({ title: "We'll notify you when it's back in stock" });
    } catch {
      toast({ title: "Couldn't set notification", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("bg-card rounded-2xl border border-border/50 hover:border-primary/30 card-lift group flex flex-col overflow-hidden relative", className)} data-testid={`product-card-${product.id}`}>
      <Link href={`/product/${product.id}`} className="block relative bg-muted/30 aspect-square overflow-hidden p-2 pb-0">
        <div className="w-full h-full relative rounded-xl overflow-hidden bg-card">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500 ease-out" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/5">
              <ShoppingBag className="h-12 w-12 text-primary/20" />
            </div>
          )}
          
          {discount > 0 && (
            <div className="absolute top-0 left-0 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-br-xl shadow-sm z-10 flex flex-col items-center leading-none">
              <span>{discount}%</span>
              <span className="text-[8px] font-medium uppercase opacity-90 mt-0.5">OFF</span>
            </div>
          )}
          
          {/* Quick-commerce delivery tag (Blinkit-style) */}
          <div className="absolute bottom-1 left-1 bg-card/95 backdrop-blur-sm border border-border/50 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm z-10 flex items-center gap-1 text-foreground/80">
            <span className="text-brand-yellow">⚡</span> 10 MINS
          </div>

          {!inStock && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-20">
              <Badge className="bg-foreground text-background font-bold border-0">Sold Out</Badge>
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-3 pt-4 flex flex-col flex-1 bg-card relative z-10">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1 font-medium">{defaultVariant.unitValue} {defaultVariant.unit}</p>
          <Link href={`/product/${product.id}`}>
            <p className="text-sm font-semibold line-clamp-2 leading-tight text-foreground group-hover:text-primary transition-colors">{product.name}</p>
          </Link>
        </div>
        
        <div className="flex items-end justify-between mt-3">
          <div>
            <span className="text-[10px] text-muted-foreground line-through block mb-0.5 opacity-80">
              {discount > 0 ? `₹${defaultVariant.mrp}` : '\u00A0'}
            </span>
            <span className="font-bold text-sm sm:text-base text-foreground">₹{defaultVariant.price}</span>
          </div>
          
          <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
            {!inStock ? (
               <Button
                 size="sm"
                 variant="outline"
                 className="h-8 px-2 text-[11px] font-bold text-accent border-accent/40 bg-accent/5 hover:bg-accent hover:text-white rounded-lg shadow-sm w-[84px] transition-all disabled:opacity-60"
                 onClick={handleNotify}
                 disabled={loading || notified}
                 title="Notify me when back in stock"
               >
                 {notified ? "✓ Notified" : loading ? "..." : "Notify"}
               </Button>
            ) : quantity > 0 ? (
               <div className="flex items-center bg-primary rounded-lg shadow-sm border border-primary h-8 w-[84px]">
                 <button 
                   disabled={loading}
                   onClick={(e) => handleUpdateQuantity(e, quantity - 1)}
                   className="w-8 h-full flex items-center justify-center text-primary-foreground hover:bg-white/20 transition-colors disabled:opacity-50"
                 >
                   <Minus className="h-3.5 w-3.5" />
                 </button>
                 <span className="flex-1 text-center font-bold text-xs text-primary-foreground select-none">
                   {loading ? "..." : quantity}
                 </span>
                 <button 
                   disabled={loading || quantity >= defaultVariant.stock}
                   onClick={(e) => handleUpdateQuantity(e, quantity + 1)}
                   className="w-8 h-full flex items-center justify-center text-primary-foreground hover:bg-white/20 transition-colors disabled:opacity-50"
                 >
                   <Plus className="h-3.5 w-3.5" />
                 </button>
               </div>
            ) : (
               <Button
                 size="sm"
                 variant="outline"
                 className="h-8 px-4 text-xs font-bold text-primary border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground rounded-lg shadow-sm w-[84px] transition-all"
                 onClick={handleAdd}
                 disabled={loading}
               >
                 {loading ? "..." : "ADD"}
               </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
