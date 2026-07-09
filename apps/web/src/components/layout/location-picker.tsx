import { useState } from "react";
import { MapPin, ChevronDown, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { locationStore, usePincode } from "@/lib/location-store";
import { authStore } from "@/lib/auth-store";
import { customFetch } from "@/lib/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client";

interface ZoneInfo {
  id: number;
  name: string;
  deliveryFee: number;
  minOrderForFree: number;
}
interface CheckResult {
  pincode: string;
  serviceable: boolean;
  zone: ZoneInfo | null;
}

export function LocationPicker({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const pincode = usePincode();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(pincode);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check(pin: string) {
    if (!/^\d{6}$/.test(pin)) {
      setResult(null);
      return;
    }
    setChecking(true);
    try {
      const res = await customFetch(`/api/delivery/check?pincode=${pin}`);
      if (res.ok) setResult(await res.json());
      else setResult({ pincode: pin, serviceable: false, zone: null });
    } catch {
      setResult({ pincode: pin, serviceable: false, zone: null });
    } finally {
      setChecking(false);
    }
  }

  async function confirm() {
    if (!result?.serviceable) return;
    locationStore.setPincode(result.pincode);
    // Persist server-side so the cart recomputes zone-based delivery fee.
    if (authStore.getToken()) {
      try {
        await customFetch("/api/cart/pincode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pincode: result.pincode }),
        });
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      } catch {
        /* non-blocking */
      }
    }
    setOpen(false);
  }

  const label = pincode ? `Delivering to ${pincode}` : "Select delivery location";

  const trigger =
    variant === "mobile" ? (
      <button
        onClick={() => { setValue(pincode); setResult(null); setOpen(true); }}
        className="flex flex-col justify-center text-left"
      >
        <span className="flex items-center gap-1 text-white text-xs font-bold leading-tight">Delivery in 10 mins</span>
        <span className="flex items-center gap-1 text-white/80 text-[10px] leading-tight truncate">
          <span className="truncate">{pincode ? `Pincode ${pincode}` : "Set your location"}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </span>
      </button>
    ) : (
      <button
        onClick={() => { setValue(pincode); setResult(null); setOpen(true); }}
        className="flex items-center gap-1.5 text-white/90 text-xs hover:text-white transition-colors"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span className="font-bold text-white">Delivery in 10 mins</span>
        <span className="opacity-50 mx-1">•</span>
        <span>{pincode ? `Pincode ${pincode}` : "Banswara, Rajasthan"}</span>
        <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
      </button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Choose delivery location
            </DialogTitle>
            <DialogDescription>Enter your pincode to check serviceability and delivery charges.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit pincode"
                value={value}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setValue(v);
                  setResult(null);
                  if (v.length === 6) check(v);
                }}
                className="h-11 text-base"
                autoFocus
              />
              <Button onClick={() => check(value)} disabled={value.length !== 6 || checking} className="h-11">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
              </Button>
            </div>

            {result && (
              <div
                className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${
                  result.serviceable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                {result.serviceable ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-700">Delivering to {result.pincode}</p>
                      {result.zone && (
                        <p className="text-green-700/80 text-xs mt-0.5">
                          {result.zone.name} • Delivery ₹{result.zone.deliveryFee}
                          {" "}(FREE over ₹{result.zone.minOrderForFree})
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700">Sorry, we don't deliver to {result.pincode} yet</p>
                      <p className="text-red-700/80 text-xs mt-0.5">Try a nearby pincode or check back soon.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <Button className="w-full h-11 font-semibold" onClick={confirm} disabled={!result?.serviceable}>
              Confirm location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
