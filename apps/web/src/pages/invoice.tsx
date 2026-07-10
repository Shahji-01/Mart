import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useLocation } from "wouter";

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
  }, [id]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12"><Skeleton className="h-[600px]" /></div>;
  if (!order) return <div className="text-center py-20 text-muted-foreground">Order not found</div>;

  const invoiceNo = `NTC-${order.id.toString().padStart(6, "0")}`;
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto">
        {/* Print controls - hidden on print */}
        <div className="flex gap-2 mb-4 print:hidden px-4">
          <Button variant="outline" onClick={() => setLocation(`/orders/${id}`)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print Invoice</Button>
        </div>

        {/* Invoice */}
        <div className="bg-white rounded-2xl shadow print:shadow-none print:rounded-none p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img src="/shankeshwar-logo.png" alt="Shankeshwar Traders" className="w-9 h-9 object-contain rounded-lg" />
                <div>
                  <span className="text-xl font-bold block leading-tight">Shankeshwar Traders</span>
                  <span className="text-xs text-gray-400">Shankeshwar Traders</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Banswara, Rajasthan – 327001</p>
              <p className="text-sm text-gray-500">contact@shankeshwartraders.in | GSTIN: 08XXXXX0000X1ZX</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">INVOICE</p>
              <p className="text-sm font-medium mt-1">#{invoiceNo}</p>
              <p className="text-sm text-gray-500">{date}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{order.paymentStatus.toUpperCase()}</span>
            </div>
          </div>

          {/* Billed To */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Delivered To</p>
            <p className="font-semibold">{order.userName ?? "Customer"}</p>
            <p className="text-sm text-gray-600 mt-0.5">{order.address}</p>
            {order.deliverySlot && <p className="text-xs text-gray-500 mt-0.5">Slot: {order.deliverySlot}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Item</th>
                <th className="text-center py-2 text-gray-500 font-medium">Qty</th>
                <th className="text-right py-2 text-gray-500 font-medium">Rate</th>
                <th className="text-right py-2 text-gray-500 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.unitValue} {item.unit}</p>
                  </td>
                  <td className="py-2.5 text-center">{item.quantity}</td>
                  <td className="py-2.5 text-right">₹{item.price.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-medium">₹{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-gray-200 pt-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-700"><span>Coupon ({order.couponCode})</span><span>-₹{order.discount.toFixed(2)}</span></div>}
              {order.gstAmount > 0 && <div className="flex justify-between"><span className="text-gray-600">GST</span><span>₹{order.gstAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">Delivery Fee</span><span>{order.deliveryFee === 0 ? <span className="text-green-700">FREE</span> : `₹${order.deliveryFee.toFixed(2)}`}</span></div>
              {order.walletAmountUsed > 0 && <div className="flex justify-between text-blue-700"><span>Wallet Used</span><span>-₹{order.walletAmountUsed.toFixed(2)}</span></div>}
              {order.loyaltyPointsUsed > 0 && <div className="flex justify-between text-purple-700"><span>Loyalty Points ({order.loyaltyPointsUsed} pts)</span><span>-₹{(order.loyaltyPointsUsed * 0.25).toFixed(2)}</span></div>}
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                <span>Total Paid</span><span className="text-primary">₹{order.total.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Payment via {order.paymentMethod.toUpperCase()}</p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            <p>Thank you for shopping at Shankeshwar Traders!</p>
            <p>For queries: contact@shankeshwartraders.in | Shankeshwar Traders, Banswara, Rajasthan – 327001</p>
          </div>
        </div>
      </div>
    </div>
  );
}
