export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function openRazorpayCheckout(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  onSuccess: (resp: RazorpaySuccess) => void;
  onDismiss?: () => void;
}): Promise<boolean> {
  const ok = await loadRazorpay();
  if (!ok) return false;
  const Ctor = (window as unknown as { Razorpay: new (o: Record<string, unknown>) => { open: () => void } }).Razorpay;
  const rzp = new Ctor({
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency,
    name: opts.name ?? "NTC Mart",
    description: opts.description ?? "Payment",
    order_id: opts.orderId,
    handler: opts.onSuccess,
    modal: { ondismiss: opts.onDismiss },
    theme: { color: "#1f8f4e" },
  });
  rzp.open();
  return true;
}
