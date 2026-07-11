import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, ArrowLeft, Download } from "lucide-react";
import { authStore } from "@/lib/auth-store";

interface OrderItem { productName: string; unitValue: string; unit: string; price: number; quantity: number; subtotal: number; }
interface OrderData { id: number; userName: string | null; address: string; status: string; paymentMethod: string; paymentStatus: string; subtotal: number; discount: number; gstAmount: number; deliveryFee: number; walletAmountUsed: number; loyaltyPointsUsed: number; total: number; couponCode: string | null; deliverySlot: string | null; createdAt: string; items: OrderItem[]; }

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = authStore.getToken();
    if (!token) { setLocation("/login"); return; }
    fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setOrder).finally(() => setLoading(false));
  }, [id, setLocation]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><Skeleton className="h-[800px]" /></div>;
  if (!order) return <div className="text-center py-20 text-muted-foreground">Order not found</div>;

  const invoiceNo = `ST-INV-2026-${order.id.toString().padStart(6, "0")}`;
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-8 print:bg-white print:py-0">
      <div className="max-w-[800px] mx-auto relative">
        {/* Print controls - hidden on print */}
        <div className="flex justify-between items-center mb-6 print:hidden px-4">
          <Button variant="outline" className="text-gray-900 border-gray-300 hover:bg-gray-100 bg-white" onClick={() => setLocation(`/orders/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Order
          </Button>
          <div className="space-x-3">
            <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-white shadow-md">
              <Printer className="h-4 w-4 mr-2" /> Print Invoice
            </Button>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white shadow-xl rounded-none sm:rounded-lg print:shadow-none print:w-full overflow-hidden border border-gray-200 relative pb-12">
          
          {/* Top Brand Strip */}
          <div className="h-3 w-full bg-primary print:bg-primary print:print-color-adjust-exact"></div>

          <div className="p-8 sm:p-12">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-6 mb-6">
              {/* Company Details */}
              <div className="flex items-start gap-4">
                <img src="/shankeshwar-logo.png" alt="Shankeshwar Traders" className="w-16 h-16 object-contain rounded-xl border border-gray-100 shadow-sm" />
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shankeshwar Traders</h1>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Main Market, Banswara<br />
                    Rajasthan – 327001, India<br />
                    <strong>GSTIN:</strong> 08AAAAA0000A1Z5<br />
                    <strong>Email:</strong> contact@shankeshwartraders.in
                  </p>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="text-left sm:text-right">
                <h2 className="text-3xl font-black text-primary tracking-wider uppercase mb-2">Tax Invoice</h2>
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold tracking-widest uppercase rounded-full mb-3 print:border print:border-gray-300">
                  Original for Recipient
                </span>
                <table className="text-sm w-full sm:w-auto ml-auto">
                  <tbody>
                    <tr><td className="text-gray-500 pr-4 pb-1">Invoice No:</td><td className="font-semibold text-gray-900 pb-1">{invoiceNo}</td></tr>
                    <tr><td className="text-gray-500 pr-4 pb-1">Date:</td><td className="font-semibold text-gray-900 pb-1">{date}</td></tr>
                    <tr><td className="text-gray-500 pr-4">Order ID:</td><td className="font-semibold text-gray-900">#{order.id}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Billing Details */}
            <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</p>
                <p className="font-bold text-gray-900 text-base">{order.userName ?? "Customer"}</p>
                <p className="text-sm text-gray-600 mt-1 max-w-[250px] leading-relaxed">{order.address}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Details</p>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-medium text-gray-900 uppercase">{order.paymentMethod}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide print:border ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700 print:border-green-600" : "bg-yellow-100 text-yellow-700 print:border-yellow-600"}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.deliverySlot && (
                     <div className="flex items-center gap-2">
                      <span className="text-gray-500">Delivery Slot:</span>
                      <span className="font-medium text-gray-900">{order.deliverySlot}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden border border-gray-200 rounded-xl mb-8">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Description</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Rate</th>
                    <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.unitValue} {item.unit}</p>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-900">{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right font-medium text-gray-900">₹{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Signatory */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-8">
              {/* Authorized Signatory Placeholder */}
              <div className="order-2 sm:order-1 text-center sm:text-left">
                <div className="w-40 h-16 border-b-2 border-dashed border-gray-300 mb-2"></div>
                <p className="text-xs font-semibold text-gray-800">Authorized Signatory</p>
                <p className="text-[10px] text-gray-400">Shankeshwar Traders</p>
              </div>

              {/* Totals */}
              <div className="order-1 sm:order-2 w-full sm:w-72 bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-gray-900">₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount ({order.couponCode})</span>
                      <span>-₹{order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">GST (Included)</span>
                      <span className="font-medium text-gray-900">₹{order.gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery Fee</span>
                    <span className="font-medium text-gray-900">
                      {order.deliveryFee === 0 ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">FREE</span> : `₹${order.deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  {order.walletAmountUsed > 0 && (
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Wallet Used</span>
                      <span>-₹{order.walletAmountUsed.toFixed(2)}</span>
                    </div>
                  )}
                  {order.loyaltyPointsUsed > 0 && (
                    <div className="flex justify-between text-purple-600 font-medium">
                      <span>Loyalty Pts ({order.loyaltyPointsUsed})</span>
                      <span>-₹{(order.loyaltyPointsUsed * 0.25).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-lg font-black border-t-2 border-gray-200 pt-3 mt-3">
                    <span className="text-gray-900">Grand Total</span>
                    <span className="text-primary">₹{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center border-t border-gray-200 pt-6 print:absolute print:bottom-0 print:left-0 print:right-0 print:border-none print:pt-0 print:pb-8">
              <p className="text-xs font-semibold text-gray-600">Thank you for shopping with Shankeshwar Traders!</p>
              <p className="text-[10px] text-gray-400 mt-1">This is a computer generated invoice and does not require physical signature.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
