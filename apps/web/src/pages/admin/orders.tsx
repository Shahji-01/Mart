import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, CreditCard, Banknote, Printer, CheckSquare, Square } from "lucide-react";
import { useGetOrders, useUpdateOrderStatus, getGetOrdersQueryKey } from "@workspace/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-blue-100 text-blue-700",
};

const STATUSES = ["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"];

interface OrderRow {
  id: number;
  userName?: string | null;
  createdAt: string;
  status: string;
  paymentMethod: string;
  total: number;
  deliverySlot?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
}

function printOrderSlip(order: OrderRow) {
  const w = window.open("", "_blank", "width=600,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Order Slip #${order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 13px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { text-align: left; border-bottom: 2px solid #000; padding: 6px 0; font-size: 12px; }
    td { padding: 5px 0; font-size: 13px; border-bottom: 1px solid #eee; }
    .total { font-weight: bold; font-size: 16px; margin-top: 12px; text-align: right; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; background: #f0f0f0; }
    .footer { margin-top: 20px; font-size: 11px; color: #888; }
    @media print { button { display: none; } }
  </style></head><body>
  <h1>Shankeshwar Traders — Order Slip</h1>
  <div class="sub">Order #${order.id} &nbsp;|&nbsp; ${new Date(order.createdAt).toLocaleString("en-IN")}</div>
  <hr/>
  <p><strong>Customer:</strong> ${order.userName ?? "Customer"}</p>
  <p><strong>Payment:</strong> ${order.paymentMethod?.toUpperCase()} &nbsp; <span class="badge">${(order.paymentStatus ?? "pending").toUpperCase()}</span></p>
  <p><strong>Status:</strong> <span class="badge">${order.status.replace(/_/g, " ").toUpperCase()}</span></p>
  ${order.deliverySlot ? `<p><strong>Delivery Slot:</strong> ${order.deliverySlot}</p>` : ""}
  ${order.deliveryAddress ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ""}
  <div class="total">Total: ₹${order.total.toFixed(0)}</div>
  <div class="footer">Shankeshwar Traders (Shankeshwar Traders) &bull; Banswara, Rajasthan 327001</div>
  <br/><button onclick="window.print()">🖨 Print</button>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export default function AdminOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const activeFilter = filterStatus && filterStatus !== "_all" ? filterStatus : undefined;
  const { data: allOrders, isLoading } = useGetOrders(activeFilter ? { status: activeFilter, page } : { page });
  const updateStatus = useUpdateOrderStatus();

  const orders = search.trim()
    ? allOrders?.filter(o =>
        o.userName?.toLowerCase().includes(search.toLowerCase()) ||
        String(o.id).includes(search)
      )
    : allOrders;

  const allSelected = !!orders?.length && orders.every(o => selected.has(o.id));

  function toggleSelect(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set((Array.isArray(orders) ? orders : []).map(o => o.id)));
  }

  function handleStatusChange(orderId: number, status: string) {
    updateStatus.mutate({ id: orderId, data: { status: status as "pending" | "confirmed" | "processing" | "out_for_delivery" | "delivered" | "cancelled" } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        toast({ title: "Order status updated" });
      },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  }

  async function handleBulkUpdate() {
    if (!bulkStatus || selected.size === 0) return;
    const ids = Array.from(selected);
    await Promise.all(ids.map(id =>
      updateStatus.mutateAsync({ id, data: { status: bulkStatus as "pending" | "confirmed" | "processing" | "out_for_delivery" | "delivered" | "cancelled" } }).catch(() => null)
    ));
    qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
    toast({ title: `Updated ${ids.length} order${ids.length !== 1 ? "s" : ""} to "${bulkStatus.replace(/_/g, " ")}"` });
    setSelected(new Set());
    setBulkStatus("");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold">Orders Management</h1>
              <p className="text-sm text-muted-foreground">{orders?.length ?? 0} orders{activeFilter ? ` — ${activeFilter.replace(/_/g, " ")}` : ""}</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or order ID..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus || "_all"} onValueChange={v => setFilterStatus(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-48" data-testid="select-filter-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-primary">{selected.size} selected</span>
              <Select value={bulkStatus || "_none"} onValueChange={v => setBulkStatus(v === "_none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="Set status…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Set status…</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs bg-primary" disabled={!bulkStatus} onClick={handleBulkUpdate}>
                Apply
              </Button>
              <button className="text-xs text-muted-foreground hover:text-destructive ml-auto" onClick={() => setSelected(new Set())}>
                Clear selection
              </button>
            </div>
          )}

          <div className="bg-card rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-3 w-8">
                        <button onClick={toggleSelectAll}>
                          {allSelected
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium"># Order</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Customer</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Date</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Slot</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Payment</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Pay Status</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-medium">Total</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(orders) ? orders : []).map(order => (
                      <tr key={order.id} className={`border-b last:border-0 hover:bg-muted/20 ${selected.has(order.id) ? "bg-primary/5" : ""}`} data-testid={`order-row-${order.id}`}>
                        <td className="p-3">
                          <button onClick={() => toggleSelect(order.id)}>
                            {selected.has(order.id)
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-primary">#{order.id}</span>
                            <Link href={`/orders/${order.id}`}>
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
                            </Link>
                          </div>
                        </td>
                        <td className="p-3">{order.userName ?? "Customer"}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[120px]">
                          <span className="truncate block">{(order as { deliverySlot?: string }).deliverySlot ?? "—"}</span>
                        </td>
                        <td className="p-3">
                          <Badge className={`${STATUS_COLORS[order.status] ?? "bg-gray-100"} border-0 text-[10px] capitalize`}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground capitalize">
                            {order.paymentMethod === "cod"
                              ? <Banknote className="h-3.5 w-3.5" />
                              : <CreditCard className="h-3.5 w-3.5" />
                            }
                            {order.paymentMethod}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`${PAYMENT_COLORS[(order as { paymentStatus?: string }).paymentStatus ?? "pending"] ?? "bg-gray-100"} border-0 text-[10px] capitalize`}>
                            {(order as { paymentStatus?: string }).paymentStatus ?? "pending"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-bold">₹{order.total.toFixed(0)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={order.status}
                              onValueChange={(s) => handleStatusChange(order.id, s)}
                            >
                              <SelectTrigger className="h-7 text-xs w-32" data-testid={`select-status-${order.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map(s => (
                                  <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => printOrderSlip(order as OrderRow)}
                              className="h-7 w-7 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                              title="Print order slip"
                            >
                              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders?.length && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {search ? `No orders matching "${search}"` : "No orders found"}
                  </div>
                )}
                
                <div className="p-4 border-t flex items-center justify-end">
                  <Pagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                      </PaginationItem>
                      <PaginationItem>
                        {/* We assume the default page limit is 50 for the backend */}
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!orders || orders.length < 50}>Next</Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
