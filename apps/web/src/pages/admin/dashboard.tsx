import { Link, useLocation } from "wouter";
import { BarChart2, Package, ShoppingBag, Users, TrendingUp, Clock, LayoutDashboard, ChevronRight, Image, Layers, RotateCcw, Zap, Truck, FileDown, Upload, Menu, X, Settings2, Mail, Star, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useGetAnalyticsSummary, useGetRecentOrders, useGetTopProducts } from "@workspace/api-client";
import { useQuery } from "@tanstack/react-query";
import { authStore } from "@/lib/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: Clock, pendingBadge: true },
  { href: "/admin/coupons", label: "Coupons", icon: TrendingUp },
  { href: "/admin/banners", label: "Banners", icon: Image },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Layers },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/qa", label: "Q&A", icon: MessageCircle },
  { href: "/admin/flash-sales", label: "Flash Sales", icon: Zap },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/reports", label: "Reports", icon: FileDown },
  { href: "/admin/bulk-import", label: "Bulk Import", icon: Upload },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

function AdminSidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: summary } = useGetAnalyticsSummary();
  const pendingCount = summary?.pendingOrders ?? 0;

  function NavItems() {
    return (
      <>
        {ADMIN_NAV.map(({ href, label, icon: Icon, exact, pendingBadge }) => {
          const isActive = exact ? location === href : location.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${isActive ? "bg-primary text-white" : "hover:bg-primary/10 text-foreground"}`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-primary"}`} />
                <span className="flex-1">{label}</span>
                {pendingBadge && pendingCount > 0 && (
                  <Badge className="h-5 min-w-5 px-1 py-0 bg-accent text-white border-0 text-[10px] ml-auto">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
        <Separator className="my-2" />
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 text-sm font-medium transition-colors cursor-pointer text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            View Store
          </div>
        </Link>
      </>
    );
  }

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden mb-4 flex-shrink-0">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {mobileOpen ? "Close Menu" : "Admin Menu"}
          {pendingCount > 0 && !mobileOpen && (
            <Badge className="h-5 px-1 bg-accent text-white border-0 text-[10px]">{pendingCount}</Badge>
          )}
        </Button>
        {mobileOpen && (
          <div className="mt-2 bg-card rounded-xl border p-3 space-y-1 shadow-lg">
            <NavItems />
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="w-56 shrink-0 hidden lg:block">
        <div className="bg-card rounded-xl border p-3 sticky top-20 space-y-1">
          <NavItems />
        </div>
      </aside>
    </>
  );
}

export function useAdminGuard() {
  const token = authStore.getToken();
  return !!token;
}

export { AdminSidebar };

export default function AdminDashboard() {
  const { data: summary, isLoading: sumLoading } = useGetAnalyticsSummary();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts();
  const [chartDays, setChartDays] = useState<"7" | "30" | "90">("7");
  const { data: revenueChart, isLoading: chartLoading } = useQuery({
    queryKey: ["revenue-chart", chartDays],
    queryFn: async () => {
      const token = authStore.getToken();
      const res = await fetch(`/api/analytics/revenue-chart?days=${chartDays}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      return res.json() as Promise<Array<{ date: string; revenue: number; orders: number }>>;
    },
    staleTime: 60_000,
  });

  const statCards = [
    { label: "Total Revenue", value: `₹${(summary?.totalRevenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "bg-green-500", sub: `₹${(summary?.todayRevenue ?? 0).toFixed(0)} today` },
    { label: "Total Orders", value: (summary?.totalOrders ?? 0).toLocaleString(), icon: Package, color: "bg-blue-500", sub: `${summary?.todayOrders ?? 0} today` },
    { label: "Products", value: (summary?.totalProducts ?? 0).toLocaleString(), icon: ShoppingBag, color: "bg-purple-500", sub: "In catalog" },
    { label: "Customers", value: (summary?.totalCustomers ?? 0).toLocaleString(), icon: Users, color: "bg-orange-500", sub: "Registered users" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            {(summary?.pendingOrders ?? 0) > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 border-0">
                {summary?.pendingOrders} pending orders
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="bg-card rounded-xl border p-4" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
                {sumLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    <p className="text-xs text-primary mt-1 font-medium">{sub}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Chart + Top Products */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-card rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Revenue Overview</h2>
                <Select value={chartDays} onValueChange={(v) => setChartDays(v as "7" | "30" | "90")}>
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7" className="text-xs">Last 7 days</SelectItem>
                    <SelectItem value="30" className="text-xs">Last 30 days</SelectItem>
                    <SelectItem value="90" className="text-xs">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {chartLoading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString("en-IN", { weekday: "short" })} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`₹${Number(v).toFixed(0)}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-semibold mb-4">Top Products</h2>
              {topLoading ? <Skeleton className="h-48 w-full" /> : (
                <div className="space-y-3">
                  {(topProducts || []).slice(0, 6).map((p, i) => (
                    <div key={p.productId} className="flex items-center gap-2" data-testid={`top-product-${p.productId}`}>
                      <span className="text-sm font-bold text-muted-foreground w-4">{i + 1}</span>
                      <div className="w-8 h-8 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {p.imageUrl && <img src={p.imageUrl} alt={p.productName} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{p.productName}</p>
                        <p className="text-[10px] text-muted-foreground">{p.totalSold} sold</p>
                      </div>
                      <span className="text-xs font-bold text-primary">₹{p.revenue.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Orders</h2>
              <Link href="/admin/orders"><Button variant="ghost" size="sm" className="text-primary text-xs">View all <ChevronRight className="h-3 w-3 ml-1" /></Button></Link>
            </div>
            {ordersLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium">Customer</th>
                      <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium">Payment</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentOrders || []).slice(0, 8).map(order => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`order-row-${order.id}`}>
                        <td className="py-2.5 pr-4 font-medium text-muted-foreground">#{order.id}</td>
                        <td className="py-2.5 pr-4">{order.userName ?? "Guest"}</td>
                        <td className="py-2.5 pr-4">
                          <Badge className={`${STATUS_COLORS[order.status] ?? "bg-gray-100"} border-0 text-[10px]`}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground capitalize">{order.paymentMethod}</td>
                        <td className="py-2.5 text-right font-bold">₹{order.total.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
