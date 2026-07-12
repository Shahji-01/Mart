import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { GlobalErrorBoundary } from "@/components/error-boundary";
import { useSocket } from "@/hooks/use-socket";
import { useEffect, useMemo, lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingCart } from "@/components/ui/floating-cart";
import HomePage from "@/pages/home";
import CategoryPage from "@/pages/category";
import ProductPage from "@/pages/product";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import WishlistPage from "@/pages/wishlist";
import ProfilePage from "@/pages/profile";
import SearchPage from "@/pages/search";
import FlashSalesPage from "@/pages/flash-sales";
import LoyaltyPage from "@/pages/loyalty";
import WalletPage from "@/pages/wallet";
import ReferralPage from "@/pages/referral";
import AddressesPage from "@/pages/addresses";
import InvoicePage from "@/pages/invoice";
import SubscriptionsPage from "@/pages/subscriptions";
// Admin pages are lazy-loaded so the customer bundle doesn't ship admin code.
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/products"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminCoupons = lazy(() => import("@/pages/admin/coupons"));
const AdminBanners = lazy(() => import("@/pages/admin/banners"));
const AdminCustomers = lazy(() => import("@/pages/admin/customers"));
const AdminInventory = lazy(() => import("@/pages/admin/inventory"));
const AdminReturns = lazy(() => import("@/pages/admin/returns"));
const AdminFlashSales = lazy(() => import("@/pages/admin/flash-sales"));
const AdminReports = lazy(() => import("@/pages/admin/reports"));
const AdminBulkImport = lazy(() => import("@/pages/admin/bulk-import"));
const AdminDelivery = lazy(() => import("@/pages/admin/delivery"));
const CustomerDetail = lazy(() => import("@/pages/admin/customer-detail"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminNewsletter = lazy(() => import("@/pages/admin/newsletter"));
const AdminReviews = lazy(() => import("@/pages/admin/reviews"));
const AdminQA = lazy(() => import("@/pages/admin/qa"));
import ForgotPasswordPage from "@/pages/forgot-password";
import { authStore } from "@/lib/auth-store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function parseJwtRole(token: string): string | null {
  try {
    const seg = token.split(".")[1];
    const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)).role ?? null;
  } catch { return null; }
}

function adminPage(Component: React.ComponentType) {
  return function AdminPage() {
    const [, setLocation] = useLocation();
    const token = authStore.getToken();
    // Compute the role once per render instead of calling parseJwtRole 3x (R27.3).
    const role = useMemo(() => (token ? parseJwtRole(token) : null), [token]);

    useEffect(() => {
      if (!token) { setLocation("/login"); return; }
      if (role !== "admin") setLocation("/");
    }, [token, role, setLocation]);

    if (!token) return null;
    if (role !== "admin") return null;
    return <Component />;
  };
}

// Guard customer pages that require authentication: redirect to /login when
// there's no token, instead of each page handling it inconsistently.
function protectedPage(Component: React.ComponentType) {
  return function Protected() {
    const [, setLocation] = useLocation();
    const token = authStore.getToken();
    useEffect(() => {
      if (!token) setLocation("/login");
    }, [token, setLocation]);
    if (!token) return null;
    return <Component />;
  };
}

function Router() {
  useSocket();

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>}>
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/category/:slug" component={CategoryPage} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={protectedPage(CheckoutPage)} />
      <Route path="/checkout/" component={protectedPage(CheckoutPage)} />
      <Route path="/orders" component={protectedPage(OrdersPage)} />
      <Route path="/orders/:id/invoice" component={protectedPage(InvoicePage)} />
      <Route path="/orders/:id" component={protectedPage(OrderDetailPage)} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/wishlist" component={protectedPage(WishlistPage)} />
      <Route path="/profile" component={protectedPage(ProfilePage)} />
      <Route path="/search" component={SearchPage} />
      <Route path="/flash-sales" component={FlashSalesPage} />
      <Route path="/loyalty" component={protectedPage(LoyaltyPage)} />
      <Route path="/wallet" component={protectedPage(WalletPage)} />
      <Route path="/referral" component={protectedPage(ReferralPage)} />
      <Route path="/addresses" component={protectedPage(AddressesPage)} />
      <Route path="/subscriptions" component={protectedPage(SubscriptionsPage)} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/admin" component={adminPage(AdminDashboard)} />
      <Route path="/admin/products" component={adminPage(AdminProducts)} />
      <Route path="/admin/categories" component={adminPage(AdminCategories)} />
      <Route path="/admin/orders" component={adminPage(AdminOrders)} />
      <Route path="/admin/coupons" component={adminPage(AdminCoupons)} />
      <Route path="/admin/banners" component={adminPage(AdminBanners)} />
      <Route path="/admin/customers" component={adminPage(AdminCustomers)} />
      <Route path="/admin/customers/:id" component={adminPage(CustomerDetail)} />
      <Route path="/admin/inventory" component={adminPage(AdminInventory)} />
      <Route path="/admin/returns" component={adminPage(AdminReturns)} />
      <Route path="/admin/flash-sales" component={adminPage(AdminFlashSales)} />
      <Route path="/admin/reports" component={adminPage(AdminReports)} />
      <Route path="/admin/bulk-import" component={adminPage(AdminBulkImport)} />
      <Route path="/admin/delivery" component={adminPage(AdminDelivery)} />
      <Route path="/admin/settings" component={adminPage(AdminSettings)} />
      <Route path="/admin/newsletter" component={adminPage(AdminNewsletter)} />
      <Route path="/admin/reviews" component={adminPage(AdminReviews)} />
      <Route path="/admin/qa" component={adminPage(AdminQA)} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <GlobalErrorBoundary>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <div className="relative flex min-h-screen flex-col">
                  <Router />
                  {/* Reserve space so page content/buttons are never hidden
                      behind the fixed mobile bottom nav (it is md:hidden). */}
                  <div className="h-16 pb-safe md:hidden" aria-hidden="true" />
                  <CartDrawer />
                  <FloatingCart />
                  <BottomNav />
                </div>
              </WouterRouter>
            </GlobalErrorBoundary>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
