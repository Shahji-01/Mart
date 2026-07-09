import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { customFetch } from "@/lib/custom-fetch";
import { useToast } from "@/hooks/use-toast";
import { MapPicker } from "@/components/map-picker";

export interface Address {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}
export type AddressFormData = Omit<Address, "id">;

const EMPTY_FORM: AddressFormData = {
  label: "Home",
  recipientName: "",
  phone: "",
  street: "",
  landmark: "",
  city: "Banswara",
  state: "Rajasthan",
  pincode: "327001",
  isDefault: false,
};

/** Compose a single-line address string from the structured fields. */
export function formatAddress(a: Pick<Address, "street" | "landmark" | "city" | "state" | "pincode">): string {
  return [a.street, a.landmark, a.city, a.state].filter(Boolean).join(", ") + (a.pincode ? ` - ${a.pincode}` : "");
}

const FIELDS: { key: keyof AddressFormData; label: string; placeholder: string }[] = [
  { key: "recipientName", label: "Full Name", placeholder: "Recipient name" },
  { key: "phone", label: "Phone", placeholder: "10-digit mobile number" },
  { key: "street", label: "Street Address", placeholder: "House/Flat no, Building, Street" },
  { key: "landmark", label: "Landmark (optional)", placeholder: "Near school, hospital etc" },
  { key: "city", label: "City", placeholder: "City" },
  { key: "state", label: "State", placeholder: "State" },
  { key: "pincode", label: "Pincode", placeholder: "6-digit pincode" },
];

export function AddressFormDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (addr: Address) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await customFetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const created: Address = await res.json();
      toast({ title: "Address added" });
      onSaved(created);
      onOpenChange(false);
      setForm(EMPTY_FORM);
    } catch {
      toast({ title: "Failed to save address", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Address</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <MapPicker
            onChange={(loc) =>
              setForm((f) => ({
                ...f,
                street: loc.street || f.street,
                city: loc.city || f.city,
                state: loc.state || f.state,
                pincode: loc.pincode || f.pincode,
              }))
            }
          />
          <div>
            <Label className="text-xs mb-1">Label</Label>
            <div className="flex gap-2">
              {["Home", "Work", "Other"].map((l) => (
                <Button
                  key={l}
                  size="sm"
                  variant={form.label === l ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setForm((f) => ({ ...f, label: l }))}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
          {FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="text-xs mb-1">{label}</Label>
              <Input
                value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            <span className="text-sm">Set as default address</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Add Address"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
