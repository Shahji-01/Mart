import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useGetCart, getGetCartQueryKey, useUpdateCartItem, useRemoveFromCart, useApplyCoupon, useRemoveCoupon, useGetCouponSuggestions, getGetCouponSuggestionsQueryKey } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { useUIStore } from "@/lib/ui-store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShoppingBag, Plus, Minus, Trash2, ChevronRight, X, Tag, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const token = authStore.getToken();
  
  const { data: cart, isLoading } = useGetCart({
    query: { enabled: !!token && isCartOpen, queryKey: getGetCartQueryKey() },
  });

  const qc = useQueryClient();
  const { toast } = useToast();
  const updateCart = useUpdateCartItem();
  const removeFromCart = useRemoveFromCart();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [couponInput, setCouponInput] = useState("");
  
  const { data: suggestionsData } = useGetCouponSuggestions({
    query: { enabled: !!token && isCartOpen && !cart?.couponCode, queryKey: getGetCouponSuggestionsQueryKey() },
  });
  const suggestions = suggestionsData ?? [];
  
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const subtotal = cart?.subtotal ?? 0;
    const aEligible = subtotal >= a.minOrderValue;
    const bEligible = subtotal >= b.minOrderValue;
    if (aEligible && !bEligible) return -1;
    if (!aEligible && bEligible) return 1;
    return b.discountValue - a.discountValue; // Sort by discount value if both have same eligibility
  });

  const isApplyingCoupon = applyCoupon.isPending;
  const isRemovingCoupon = removeCoupon.isPending;

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

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    try {
      await applyCoupon.mutateAsync({ data: { code: couponInput.trim() } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Coupon applied successfully" });
      setCouponInput("");
    } catch (err: any) {
      toast({ title: "Failed to apply coupon", description: err.message || "Invalid coupon", variant: "destructive" });
    }
  }

  async function handleRemoveCoupon() {
    try {
      await removeCoupon.mutateAsync();
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Coupon removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove coupon", variant: "destructive" });
    }
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
                            disabled={loadingId === item.variantId}
                            onClick={() => handleUpdate(item.variantId, Math.max(0, item.quantity - 1))}
                            className="w-7 h-full flex items-center justify-center text-primary-foreground hover:bg-accent/20 transition-colors disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex-1 text-center font-bold text-xs text-primary-foreground">
                            {loadingId === item.variantId ? "..." : item.quantity}
                          </span>
                          <button 
                            disabled={loadingId === item.variantId}
                            onClick={() => handleUpdate(item.variantId, item.quantity + 1)}
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
                {cart?.couponCode ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">'{cart.couponCode}' applied</p>
                        <p className="text-xs text-emerald-600">You saved ₹{cart.discount}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveCoupon}
                      disabled={isRemovingCoupon}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Enter coupon code" 
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="pl-9 bg-muted/50 border-0 h-10 uppercase"
                      />
                    </div>
                    <Button 
                      variant="secondary"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || isApplyingCoupon}
                      className="h-10 px-4"
                    >
                      {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}

                {!cart?.couponCode && sortedSuggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">Available coupons</p>
                    <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-2">
                      {sortedSuggestions.map(s => {
                        const isEligible = (cart?.subtotal ?? 0) >= s.minOrderValue;
                        return (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => {
                              if (!isEligible) {
                                toast({ title: `Add items worth ₹${(s.minOrderValue - (cart?.subtotal ?? 0)).toFixed(0)} more to use this coupon`, variant: "destructive" });
                                return;
                              }
                              setCouponInput(s.code);
                              applyCoupon.mutate({ data: { code: s.code } }, {
                                onSuccess: (c) => { 
                                  qc.invalidateQueries({ queryKey: getGetCartQueryKey() }); 
                                  toast({ title: `Coupon applied! Saved ₹${c.discount.toFixed(0)}` }); 
                                  setCouponInput("");
                                },
                                onError: (error: any) => {
                                  const message = error.response?.data?.error || error.response?.error || error.message || "Coupon not applicable";
                                  toast({ title: message, variant: "destructive" });
                                },
                              });
                            }}
                            className={`w-full text-left flex items-center gap-3 border border-dashed rounded-lg px-3 py-2 transition-colors group ${isEligible ? 'border-primary/60 hover:bg-primary/5 cursor-pointer' : 'border-muted opacity-60 cursor-not-allowed'}`}
                          >
                            <span className="bg-primary/10 text-primary font-mono font-bold text-xs px-2 py-0.5 rounded group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{s.code}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{s.description}</p>
                              {s.minOrderValue > 0 && <p className="text-[10px] text-muted-foreground">Min order ₹{s.minOrderValue}</p>}
                            </div>
                            <span className="text-xs font-bold text-primary flex-shrink-0">
                              {s.discountType === "percentage" ? `${s.discountValue}% OFF` : `₹${s.discountValue} OFF`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-card rounded-2xl border shadow-sm p-4">
                <h4 className="font-bold mb-3 text-sm">Bill Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Item Total</span>
                    <span>₹{cart?.subtotal}</span>
                  </div>
                  {(cart?.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Item Discount</span>
                      <span>-₹{cart!.discount}</span>
                    </div>
                  )}
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
