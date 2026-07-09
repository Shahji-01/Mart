import { Link, useLocation } from "wouter";
import { useState } from "react";
import { ShoppingCart, Trash2, ArrowLeft, Tag, Truck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, useClearCart, useApplyCoupon, useGetCouponSuggestions, getGetCartQueryKey, getGetCouponSuggestionsQueryKey } from "@workspace/api-client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { customFetch } from "@/lib/custom-fetch";
import { useToast } from "@/hooks/use-toast";
import { authStore } from "@/lib/auth-store";
import { Navbar } from "@/components/layout/navbar";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const token = authStore.getToken();

  const { data: cart, isLoading } = useGetCart({ query: { enabled: !!token, queryKey: getGetCartQueryKey() } });
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const clearCart = useClearCart();
  const applyCoupon = useApplyCoupon();
  const [couponInput, setCouponInput] = useState("");

  // Suggestions come from the generated React-Query hook; only fetch when the
  // user is logged in and no coupon is already applied.
  const { data: suggestionsData } = useGetCouponSuggestions({
    query: { enabled: !!token && !cart?.couponCode, queryKey: getGetCouponSuggestionsQueryKey() },
  });
  const suggestions = suggestionsData ?? [];

  const removeCoupon = useMutation({
    mutationFn: async () => {
      const res = await customFetch("/api/cart/remove-coupon", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { invalidate(); setCouponInput(""); toast({ title: "Coupon removed" }); },
  });

  function invalidate() { qc.invalidateQueries({ queryKey: getGetCartQueryKey() }); }

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Please login to view your cart</h2>
          <Link href="/login"><Button className="mt-4 bg-primary">Login</Button></Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold">My Cart</h1>
          {items.length > 0 && <span className="text-muted-foreground text-sm">({items.length} items)</span>}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="text-muted-foreground text-sm mt-1">Add some items to get started</p>
            <Link href="/category/all"><Button className="mt-6 bg-primary" data-testid="button-shop-now">Start Shopping</Button></Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => clearCart.mutate(undefined, { onSuccess: invalidate })}
                  data-testid="button-clear-cart"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Clear all
                </Button>
              </div>

              {items.map(item => (
                <div key={item.id} className="bg-card rounded-xl border p-4 flex gap-4 items-center" data-testid={`cart-item-${item.id}`}>
                  <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-primary/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1" data-testid={`text-item-name-${item.id}`}>{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.unitValue} {item.unit}</p>
                    <p className="font-bold text-primary mt-1">₹{item.price}</p>
                    {(item as typeof item & { stock?: number }).stock !== undefined && (item as typeof item & { stock?: number }).stock! <= 5 && (item as typeof item & { stock?: number }).stock! > 0 && (
                      <p className="text-xs text-orange-600 font-medium">Only {(item as typeof item & { stock?: number }).stock} left!</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (item.quantity === 1) {
                          removeItem.mutate({ variantId: item.variantId }, { onSuccess: invalidate });
                        } else {
                          updateItem.mutate({ variantId: item.variantId, data: { quantity: item.quantity - 1 } }, { onSuccess: invalidate });
                        }
                      }}
                      data-testid={`button-decrease-${item.id}`}
                    >-</Button>
                    <span className="w-6 text-center font-medium text-sm" data-testid={`text-qty-${item.id}`}>{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateItem.mutate({ variantId: item.variantId, data: { quantity: item.quantity + 1 } }, { onSuccess: invalidate })}
                      data-testid={`button-increase-${item.id}`}
                    >+</Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive ml-1"
                      onClick={() => removeItem.mutate({ variantId: item.variantId }, { onSuccess: invalidate })}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="font-bold" data-testid={`text-subtotal-${item.id}`}>₹{item.subtotal.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-4">
              {/* Coupon */}
              <div className="bg-card rounded-xl border p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-accent" /> Apply Coupon</h3>
                <div className="flex gap-2">
                  <Input
                    data-testid="input-coupon"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    className="text-sm uppercase"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={applyCoupon.isPending || !couponInput}
                    onClick={() => applyCoupon.mutate({ data: { code: couponInput } }, {
                      onSuccess: (c) => { invalidate(); toast({ title: `Coupon applied! Saved ₹${c.discount.toFixed(0)}` }); },
                      onError: () => toast({ title: "Invalid coupon", variant: "destructive" }),
                    })}
                    data-testid="button-apply-coupon"
                  >Apply</Button>
                </div>
                {cart?.couponCode && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-green-600 font-medium">✓ Coupon <strong>{cart.couponCode}</strong> applied</p>
                    <button
                      type="button"
                      onClick={() => removeCoupon.mutate()}
                      className="text-xs text-muted-foreground hover:text-destructive underline"
                      disabled={removeCoupon.isPending}
                    >Remove</button>
                  </div>
                )}
                {!cart?.couponCode && suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Ticket className="h-3 w-3" /> Available coupons</p>
                    <div className="flex flex-col gap-2">
                      {suggestions.map(s => (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => {
                            setCouponInput(s.code);
                            applyCoupon.mutate({ data: { code: s.code } }, {
                              onSuccess: (c) => { invalidate(); toast({ title: `Coupon applied! Saved ₹${c.discount.toFixed(0)}` }); },
                              onError: () => toast({ title: "Coupon not applicable", variant: "destructive" }),
                            });
                          }}
                          className="w-full text-left flex items-center gap-3 border border-dashed border-accent/60 rounded-lg px-3 py-2 hover:bg-accent/5 transition-colors group"
                        >
                          <span className="bg-accent/10 text-accent font-mono font-bold text-xs px-2 py-0.5 rounded group-hover:bg-accent group-hover:text-white transition-colors">{s.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{s.description}</p>
                            {s.minOrderValue > 0 && <p className="text-[10px] text-muted-foreground">Min order ₹{s.minOrderValue}</p>}
                          </div>
                          <span className="text-xs font-bold text-accent flex-shrink-0">
                            {s.discountType === "percentage" ? `${s.discountValue}% OFF` : `₹${s.discountValue} OFF`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <h3 className="font-semibold">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{cart?.subtotal.toFixed(0)}</span>
                  </div>
                  {(cart?.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{cart?.discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Delivery</span>
                    <span>{cart?.deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${cart?.deliveryFee}`}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span data-testid="text-total">₹{cart?.total.toFixed(0)}</span>
                  </div>
                </div>
                {(cart?.subtotal ?? 0) < 499 && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
                    Add items worth ₹{(499 - (cart?.subtotal ?? 0)).toFixed(0)} more for free delivery
                  </p>
                )}
                <Button
                  className="w-full bg-primary"
                  onClick={() => setLocation("/checkout")}
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
