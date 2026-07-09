import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useGetCart, getGetCartQueryKey, useUpdateCartItem, useRemoveFromCart } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { useUIStore } from "@/lib/ui-store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShoppingBag, Plus, Minus, Trash2, ChevronRight, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const token = authStore.getToken();
  
  const { data: cart, isLoading } = useGetCart({
    query: { enabled: !!token && isCartOpen, queryKey: getGetCartQueryKey() },
  });

  const qc = useQueryClient();
  const updateCart = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  async function handleUpdate(variantId: number, quantity: number) {
    if (quantity < 1) return handleRemove(variantId);
    setLoadingId(variantId);
    try {
      await updateCart.mutateAsync({ variantId, data: { quantity } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
    } finally { setLoadingId(null); }
  }

  async function handleRemove(variantId: number) {
    setLoadingId(variantId);
    try {
      await removeFromCart.mutateAsync({ variantId });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
    } finally { setLoadingId(null); }
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l-0 sm:border-l">
        <div className="p-4 bg-background border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" />
            My Cart
            {items.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!token ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Please Login</h3>
              <p className="text-muted-foreground text-sm mt-2 mb-6">You need to be logged in to view your cart</p>
              <Link href="/login" onClick={closeCart}>
                <Button className="w-full rounded-xl h-12 text-base font-bold shadow-md">Login Now</Button>
              </Link>
            </div>
          ) : isLoading ? (
            <div className="space-y-3 px-4 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 p-3 bg-card rounded-xl border">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-primary/20">
                <ShoppingBag className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-lg font-bold">Your cart is empty</h3>
              <p className="text-muted-foreground text-sm mt-2 mb-6">Looks like you haven't added anything to your cart yet.</p>
              <Button variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary/5" onClick={closeCart}>
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="px-4 pb-6 space-y-4">
              <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-emerald-50 p-2 text-center border-b border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-700">⚡ Delivery in 10 minutes</p>
                </div>
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="p-3 flex gap-3 relative group">
                      <div className="w-16 h-16 rounded-lg border bg-muted/30 overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain p-1" />
                        ) : (
                          <ShoppingBag className="w-full h-full p-4 text-muted-foreground opacity-20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{item.unitValue} {item.unit}</p>
                        <p className="text-sm font-semibold line-clamp-1 leading-tight mt-0.5">{item.productName}</p>
                        <p className="font-bold text-sm mt-1">₹{item.price}</p>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between">
                        <button 
                          onClick={() => handleRemove(item.variantId)}
                          className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-center bg-primary rounded-lg shadow-sm h-7 w-20">
                          <button 
                            disabled={loadingItems[item.id]}
                            onClick={() => handleUpdateQuantity(item, Math.max(0, item.quantity - 1))}
                            className="w-7 h-full flex items-center justify-center text-primary-foreground hover:bg-accent/20 transition-colors disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex-1 text-center font-bold text-xs text-primary-foreground">
                            {loadingId === item.variantId ? "..." : item.quantity}
                          </span>
                          <button 
                            disabled={loadingItems[item.id]}
                            onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            className="w-7 h-full flex items-center justify-center text-primary-foreground hover:bg-accent/20 transition-colors disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl border shadow-sm p-4">
                <h4 className="font-bold mb-3 text-sm">Bill Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Item Total</span>
                    <span>₹{cart?.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    {cart?.deliveryFee === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      <span>₹{cart?.deliveryFee}</span>
                    )}
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                    <span>To Pay</span>
                    <span>₹{cart?.total}</span>
                  </div>
                </div>
              </div>
              
              <div className="h-24"></div> {/* Spacer for bottom bar */}
            </div>
          )}
        </div>

        {!isEmpty && cart && (
          <div className="bg-background p-4 border-t shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-20 sticky bottom-0">
            <Link href="/checkout" onClick={closeCart}>
              <Button className="w-full h-14 rounded-xl text-base font-bold shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-between px-4">
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs text-primary-foreground/80 font-medium">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  <span className="text-lg">₹{cart?.total}</span>
                </div>
                <div className="flex items-center gap-1">
                  Checkout <ChevronRight className="h-5 w-5" />
                </div>
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
