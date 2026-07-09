import { Link, useLocation } from "wouter";
import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";

export function BottomNav() {
  const [location] = useLocation();
  const { openCart } = useUIStore();

  const navItems = [
    { label: "Home", icon: Home, href: "/", isActive: location === "/" },
    { label: "Categories", icon: LayoutGrid, href: "/category/all", isActive: location.startsWith("/category") },
    { label: "Cart", icon: ShoppingBag, onClick: openCart, isActive: false }, // We use CartDrawer now instead of route
    { label: "Profile", icon: User, href: "/profile", isActive: location.startsWith("/profile") || location.startsWith("/login") },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-40 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${item.isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className={`h-5 w-5 ${item.isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          );

          if (item.onClick) {
            return (
              <button key={item.label} onClick={item.onClick} className="h-full focus:outline-none">
                {content}
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.href!} className="h-full focus:outline-none">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
