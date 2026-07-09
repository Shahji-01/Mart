import { useState } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, ShoppingBag, Users, Package, Upload, Bell, BarChart2, AlertTriangle, UserCheck, UserPlus, RefreshCw } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { customFetch } from "@/lib/custom-fetch";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts";

function downloadCSV(url: string, filename: string) {
  const token = authStore.getToken()!;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

interface CategoryRevenue { categoryId: number; categoryName: string; revenue: number; orderCount: number; }
interface LowStockItem { productId: number; productName: string; variantId: number; unit: string; unitValue: string; sku: string | null; stock: number; }
interface CustomerRetention { newCustomers: number; returningCustomers: number; total: number; }
interface DemandRow { pincode: string; orders: number; revenue: number; }

const CHART_COLORS = ["#15803d","#16a34a","#22c55e","#4ade80","#86efac","#bbf7d0","#f97316","#fb923c"];

export default function AdminReports() {
  const { toast } = useToast();
  const token = authStore.getToken();
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState("10");

  const { data: categoryRevenue = [], isLoading: loadingCatRev } = useQuery<CategoryRevenue[]>({
    queryKey: ["analytics-category-revenue"],
    queryFn: async () => {
      const res = await customFetch("/api/analytics/category-revenue", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: demand = [], isLoading: loadingDemand } = useQuery<DemandRow[]>({
    queryKey: ["analytics-demand-by-pincode"],
    queryFn: async () => {
      const res = await customFetch("/api/analytics/demand-by-pincode", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: lowStock = [], isLoading: loadingLowStock } = useQuery<LowStockItem[]>({
    queryKey: ["analytics-low-stock", lowStockThreshold],
    queryFn: async () => {
      const res = await customFetch(`/api/analytics/low-stock?threshold=${lowStockThreshold}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: retention, isLoading: loadingRetention } = useQuery<CustomerRetention>({
    queryKey: ["analytics-customer-retention"],
    queryFn: async () => {
      const res = await customFetch("/api/analytics/customer-retention", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { newCustomers: 0, returningCustomers: 0, total: 0 };
      return res.json();
    },
  });

  function handleOrdersExport() {
    const params = new URLSearchParams();
    if (orderFrom) params.set("from", orderFrom);
    if (orderTo) params.set("to", orderTo);
    const suffix = params.toString() ? "?" + params.toString() : "";
    downloadCSV(`/api/admin/export/orders${suffix}`, "ntc-orders.csv");
    toast({ title: "Downloading ntc-orders.csv" });
  }

  function handleLowStockExport() {
    const rows = [["Product", "Variant", "SKU", "Stock"]];
    lowStock.forEach(item => rows.push([item.productName, `${item.unitValue}${item.unit}`, item.sku ?? "", String(item.stock)]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ntc-low-stock.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Downloading ntc-low-stock.csv" });
  }

  async function handleSendNotification() {
    if (!notifMsg.trim()) { toast({ title: "Enter a message", variant: "destructive" }); return; }
    setSending(true);
    try {
      const res = await customFetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: notifMsg }),
      });
      const data = await res.json() as { sent: number };
      toast({ title: `Notification sent to ${data.sent} customer${data.sent !== 1 ? "s" : ""}!` });
      setNotifMsg("");
    } catch { toast({ title: "Failed to send", variant: "destructive" }); }
    finally { setSending(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Reports & Export</h1>
            <p className="text-sm text-muted-foreground">Analytics, low-stock alerts, and CSV exports</p>
          </div>

          {/* Demand by Pincode */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Demand by Pincode</h3>
                <p className="text-xs text-muted-foreground">Orders &amp; revenue grouped by delivery pincode</p>
              </div>
            </div>
            {loadingDemand ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : demand.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No order data yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {demand.map((d) => {
                  const max = Math.max(...demand.map(x => x.orders), 1);
                  return (
                    <div key={d.pincode} className="flex items-center gap-3 text-sm">
                      <span className="w-16 font-mono text-xs">{d.pincode}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div className="h-full bg-primary/70" style={{ width: `${(d.orders / max) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs">{d.orders}</span>
                      <span className="w-20 text-right text-xs text-muted-foreground">₹{Math.round(d.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Retention */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Customer Retention</h3>
                <p className="text-xs text-muted-foreground">New vs returning customers (by order count)</p>
              </div>
            </div>
            {loadingRetention ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : !retention || retention.total === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No order data yet</div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={200} height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "New", value: retention.newCustomers },
                        { name: "Returning", value: retention.returningCustomers },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#f97316" />
                      <Cell fill="#15803d" />
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "customers"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UserPlus className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">New customers</p>
                      <p className="text-2xl font-bold text-orange-600">{retention.newCustomers}</p>
                      <p className="text-xs text-muted-foreground">{Math.round((retention.newCustomers / retention.total) * 100)}% of total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-4 w-4 text-green-700" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Returning customers</p>
                      <p className="text-2xl font-bold text-green-700">{retention.returningCustomers}</p>
                      <p className="text-xs text-muted-foreground">{Math.round((retention.returningCustomers / retention.total) * 100)}% of total</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Revenue Chart */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <BarChart2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Revenue by Category</h3>
                <p className="text-xs text-muted-foreground">All-time sales revenue per category</p>
              </div>
            </div>
            {loadingCatRev ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : categoryRevenue.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryRevenue} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toFixed(0)}`, "Revenue"]} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {categoryRevenue.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Low Stock Alert */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Low Stock Alert</h3>
                  <p className="text-xs text-muted-foreground">{lowStock.length} variant{lowStock.length !== 1 ? "s" : ""} below threshold</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Threshold ≤</Label>
                <Input
                  type="number"
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(e.target.value)}
                  className="h-8 w-20 text-xs"
                  min="1"
                />
                {lowStock.length > 0 && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleLowStockExport}>
                    <FileDown className="h-3 w-3" /> Export
                  </Button>
                )}
              </div>
            </div>
            {loadingLowStock ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : lowStock.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>All products are well stocked!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-xs text-muted-foreground font-medium">Product</th>
                      <th className="text-left p-2 text-xs text-muted-foreground font-medium">Variant</th>
                      <th className="text-left p-2 text-xs text-muted-foreground font-medium">SKU</th>
                      <th className="text-right p-2 text-xs text-muted-foreground font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map(item => (
                      <tr key={item.variantId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2 font-medium">{item.productName}</td>
                        <td className="p-2 text-muted-foreground">{item.unitValue}{item.unit}</td>
                        <td className="p-2 text-muted-foreground font-mono text-xs">{item.sku ?? "—"}</td>
                        <td className="p-2 text-right">
                          <span className={`font-bold ${item.stock === 0 ? "text-red-600" : "text-orange-600"}`}>
                            {item.stock === 0 ? "Out of stock" : item.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders Export with date range */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Orders Export</h3>
                <p className="text-xs text-muted-foreground">All orders with customer info, totals, status, payment details</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs">From date</Label>
                <Input type="date" value={orderFrom} onChange={e => setOrderFrom(e.target.value)} className="h-8 text-xs w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To date</Label>
                <Input type="date" value={orderTo} onChange={e => setOrderTo(e.target.value)} className="h-8 text-xs w-40" />
              </div>
              <Button variant="outline" className="h-8 text-xs" onClick={handleOrdersExport}>
                <FileDown className="h-3.5 w-3.5 mr-1.5" />Download CSV
              </Button>
              {(orderFrom || orderTo) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setOrderFrom(""); setOrderTo(""); }}>
                  Clear filter
                </Button>
              )}
            </div>
          </div>

          {/* Other exports */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: "Products Export", desc: "All products with variants, pricing, stock levels, categories", icon: Package, url: "/api/admin/export/products", filename: "ntc-products.csv", color: "bg-green-500" },
              { title: "Customers Export", desc: "All customers with contact info, wallet balance, loyalty points", icon: Users, url: "/api/admin/export/customers", filename: "ntc-customers.csv", color: "bg-purple-500" },
            ].map(({ title, desc, icon: Icon, url, filename, color }) => (
              <div key={title} className="bg-card border rounded-xl p-5">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{desc}</p>
                <Button className="w-full" variant="outline" size="sm" onClick={() => { downloadCSV(url, filename); toast({ title: `Downloading ${filename}` }); }}>
                  <FileDown className="h-4 w-4 mr-2" />Download CSV
                </Button>
              </div>
            ))}
          </div>

          {/* Send Notification to All Customers */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Send Notification to All Customers</h2>
            <p className="text-sm text-muted-foreground mb-4">Broadcast a notification message to all registered customers.</p>
            <Textarea
              placeholder="e.g. 🎉 Big sale this weekend! Up to 40% off on fresh vegetables..."
              value={notifMsg}
              onChange={e => setNotifMsg(e.target.value)}
              className="mb-3 text-sm resize-none"
              rows={3}
            />
            <Button onClick={handleSendNotification} disabled={sending} className="bg-primary">
              <Bell className="h-4 w-4 mr-2" />{sending ? "Sending..." : "Send to All Customers"}
            </Button>
          </div>

          {/* Bulk Import */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Bulk Import Products</h2>
            <p className="text-sm text-muted-foreground mb-4">Go to the Bulk Import page to upload a CSV file with multiple products at once.</p>
            <Button variant="outline" onClick={() => window.location.href = "/admin/bulk-import"}>
              <Upload className="h-4 w-4 mr-2" />Open Bulk Importer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
