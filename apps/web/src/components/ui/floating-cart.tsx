import { useGetCart, getGetCartQueryKey } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { useUIStore } from "@/lib/ui-store";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function FloatingCart() {
  const token = authStore.getToken();
  const { openCart, isCartOpen } = useUIStore();
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  
  const { data: cart } = useGetCart({
    query: { enabled: !!token, queryKey: getGetCartQueryKey() },
  });

  const itemsCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    // Don't show floating cart on cart page or checkout page or if cart is open
    const hideOnRoutes = ["/cart", "/checkout"];
    if (itemsCount > 0 && !isCartOpen && !hideOnRoutes.includes(location)) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [itemsCount, isCartOpen, location]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-40 animate-in slide-in-from-bottom-5 fade-in-0 duration-300 cursor-pointer shadow-xl rounded-2xl overflow-hidden" onClick={openCart}>
      <div className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center relative">
            <ShoppingBag className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 bg-white text-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {itemsCount}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
            <span className="text-xs text-white/80">₹{cart?.total} plus taxes</span>
          </div>
        </div>
        <div className="flex items-center gap-1 font-bold text-sm bg-white/20 px-3 py-1.5 rounded-xl">
          View Cart <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
