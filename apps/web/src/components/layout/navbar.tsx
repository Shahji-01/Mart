import { Link, useLocation } from "wouter";
import { Search, User, Menu, X, LogOut, ChevronDown, ShoppingBag, Bell, LayoutDashboard, Heart, Package, Moon, Sun } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGetCart, useGetMe, getGetMeQueryKey, getGetCartQueryKey, useGetCategories } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { NTCLogoIcon } from "./logo";
import { LocationPicker } from "./location-picker";
import { useUIStore } from "@/lib/ui-store";
import { enablePush, getPushPermission, pushSupported } from "@/lib/push";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface Notification { id: number; title: string; message: string; type: string; isRead: boolean; createdAt: string; }

function NotificationBell() {
  const token = authStore.getToken();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notes = [], refetch } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await customFetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await customFetch("/api/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => refetch(),
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await customFetch(`/api/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notes.filter(n => !n.isRead).length;
  const typeIcon: Record<string, string> = { success: "✅", warning: "⚠️", info: "ℹ️" };

  const [pushOn, setPushOn] = useState(false);
  useEffect(() => { getPushPermission().then(p => setPushOn(p === "granted")); }, []);
  async function handleEnablePush() {
    const r = await enablePush();
    if (r.ok) setPushOn(true);
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost" size="icon"
        className="text-white hover:bg-white/20 relative"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground rounded-xl shadow-xl border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline font-medium">
                Mark all read
              </button>
            )}
          </div>
          {pushSupported() && !pushOn && (
            <button
              onClick={handleEnablePush}
              className="w-full px-4 py-2 text-xs text-primary hover:bg-primary/5 border-b font-medium text-left flex items-center gap-1.5"
            >
              <Bell className="h-3.5 w-3.5" /> Enable push notifications
            </button>
          )}
          <div className="max-h-80 overflow-y-auto divide-y">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No notifications yet</div>
            ) : notes.slice(0, 20).map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                className={`px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
              >
                <div className="flex gap-2">
                  <span className="text-base flex-shrink-0">{typeIcon[n.type] ?? "📢"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SEARCH_SUGGESTIONS = ["milk", "bread", "eggs", "atta", "paneer", "rice", "chips", "curd", "cold drinks", "chocolate", "bananas", "tomato"];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const catRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { openCart } = useUIStore();
  const { theme, setTheme } = useTheme();

  const token = authStore.getToken();
  const { data: user } = useGetMe({ query: { enabled: !!token, queryKey: getGetMeQueryKey() } });
  const { data: cart } = useGetCart({ query: { enabled: !!token, queryKey: getGetCartQueryKey() } });
  const { data: categories } = useGetCategories();

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const cartTotal = cart?.total ?? 0;

  // Rotating search placeholder (Blinkit-style)
  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % SEARCH_SUGGESTIONS.length), 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCategoriesOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    authStore.removeToken();
    queryClient.clear();
    setLocation("/login");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-primary dark:bg-card dark:border-b shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Header - Location & Quick Actions */}
        <div className="flex items-center justify-between h-10 border-b border-white/10 dark:border-border hidden md:flex">
          <LocationPicker variant="desktop" />
          <div className="flex items-center gap-4 text-xs text-white/80">
            <Link href="/loyalty" className="hover:text-white transition-colors">NTC Coins</Link>
            <Link href="/referral" className="hover:text-white transition-colors">Refer & Earn</Link>
            <a href="tel:+919876543210" className="hover:text-white transition-colors">Help</a>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 h-16">
          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 -ml-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b text-left bg-primary text-white">
                  <SheetTitle className="text-white">
                    <div className="flex items-center gap-2">
                      <NTCLogoIcon size={24} />
                      <span className="font-black text-lg">NTC Mart</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  <div className="px-4 pb-4 border-b">
                    {user ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Log in to unlock special features</p>
                        <SheetClose asChild>
                          <Link href="/login">
                            <Button className="w-full">Login / Sign Up</Button>
                          </Link>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 space-y-1">
                    {user && user.role === "admin" && (
                      <SheetClose asChild>
                        <Link href="/admin">
                          <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-6 h-auto">
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Admin Dashboard</span>
                              <span className="text-xs text-muted-foreground font-normal">Manage store</span>
                            </div>
                          </Button>
                        </Link>
                      </SheetClose>
                    )}
                    <SheetClose asChild>
                      <Link href="/orders">
                        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-6 h-auto">
                          <Package className="h-5 w-5 text-primary" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">My Orders</span>
                            <span className="text-xs text-muted-foreground font-normal">Track your deliveries</span>
                          </div>
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/wishlist">
                        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-6 h-auto">
                          <Heart className="h-5 w-5 text-primary" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">My Wishlist</span>
                            <span className="text-xs text-muted-foreground font-normal">Your saved items</span>
                          </div>
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/loyalty">
                        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-6 h-auto">
                          <Star className="h-5 w-5 text-primary" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">NTC Coins</span>
                            <span className="text-xs text-muted-foreground font-normal">View your rewards</span>
                          </div>
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/category/all">
                        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-6 h-auto">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Shop by Category</span>
                            <span className="text-xs text-muted-foreground font-normal">Browse all products</span>
                          </div>
                        </Button>
                      </Link>
                    </SheetClose>
                  </div>
                </div>
                
                <div className="p-4 border-t space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-medium">Dark Mode</span>
                    <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
                  </div>
                  {user && (
                    <Button variant="outline" className="w-full gap-2 text-destructive" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex-shrink-0 hidden sm:flex">
            <div className="flex items-center gap-2">
              <NTCLogoIcon size={32} />
              <div className="hidden sm:flex flex-col">
                <span className="text-white font-black text-xl leading-none tracking-tight">NTC Mart</span>
                <span className="text-yellow-400 font-bold text-[9px] leading-tight uppercase tracking-wider">Minutes Delivery</span>
              </div>
            </div>
          </Link>

          {/* Mobile Location Header */}
          <div className="flex-1 md:hidden">
            <LocationPicker variant="mobile" />
          </div>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder={`Search "${SEARCH_SUGGESTIONS[phIdx]}"`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-muted text-black dark:text-foreground border-0 focus-visible:ring-2 focus-visible:ring-yellow-400 h-11 rounded-xl text-base shadow-inner transition-all w-full"
            />
          </form>

          <div className="flex items-center gap-2 ml-auto">
            {/* Desktop Cart Button */}
            <div className="hidden md:block">
              <Button 
                onClick={openCart}
                data-testid="button-cart" 
                variant="secondary" 
                aria-label="Open cart"
                className="bg-green-800/40 hover:bg-green-800/60 dark:bg-primary/20 dark:hover:bg-primary/30 text-white dark:text-primary-foreground border-0 h-11 px-4 rounded-xl flex items-center gap-2.5"
              >
                <div className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-yellow-400 text-black border-0">
                      {cartCount}
                    </Badge>
                  )}
                </div>
                {cartCount > 0 ? (
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-medium text-white/80">{cartCount} {cartCount === 1 ? "item" : "items"}</span>
                    <span className="font-bold text-sm">₹{cartTotal}</span>
                  </div>
                ) : (
                  <span className="font-bold text-sm">Cart</span>
                )}
              </Button>
            </div>

            {/* Mobile Search & Cart Buttons */}
            <div className="flex items-center md:hidden">
              <Link href="/search">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Search className="h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 relative"
                onClick={openCart}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-yellow-400 text-black border-0">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>

            {user ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                {user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" data-testid="link-admin" title="Admin Dashboard">
                      <LayoutDashboard className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <NotificationBell />
                <Link href="/wishlist">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hidden sm:inline-flex" data-testid="link-wishlist" title="Wishlist">
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/orders">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hidden sm:inline-flex" data-testid="link-orders" title="My Orders">
                    <Package className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" data-testid="link-profile" title="Profile">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hidden md:inline-flex" onClick={handleLogout} data-testid="button-logout" title="Logout">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 hidden md:inline-flex"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Link href="/login" className="hidden md:block">
                  <Button data-testid="button-login" variant="secondary" className="bg-white text-primary hover:bg-gray-100 h-11 px-6 rounded-xl font-bold">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Category Quick Bar */}
        <div className="hidden md:flex items-center gap-1 pb-2 -mt-1 overflow-x-auto scrollbar-hide">
          <Link href="/category/all">
            <button className="px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 transition-all whitespace-nowrap">
              All Products
            </button>
          </Link>
          {(Array.isArray(categories) ? categories : []).slice(0, 8).map(cat => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <button className="px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 transition-all whitespace-nowrap">
                {cat.name}
              </button>
            </Link>
          ))}
          {(categories?.length ?? 0) > 8 && (
            <div ref={catRef} className="relative">
              <button
                onClick={() => setCategoriesOpen(o => !o)}
                className="px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 transition-all flex items-center gap-1 whitespace-nowrap"
              >
                More <ChevronDown className="h-3 w-3" />
              </button>
              {categoriesOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border z-50 py-1 min-w-40">
                  {(Array.isArray(categories) ? categories : []).slice(8).map(cat => (
                    <Link key={cat.id} href={`/category/${cat.slug}`}>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors">
                        {cat.name}
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link href="/flash-sales">
            <button className="px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-all whitespace-nowrap flex items-center gap-1">
              ⚡ Flash Deals
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
