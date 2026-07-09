import { useState, useEffect } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Clock, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

interface DeliverySlot { id: number; label: string; timeRange: string; isActive: boolean; sortOrder: number; }
interface DeliveryZone { id: number; name: string; pincodes: string; deliveryFee: number; minOrderForFree: number; isActive: boolean; createdAt: string; }

export default function AdminDelivery() {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingZones, setLoadingZones] = useState(true);
  const [slotDialog, setSlotDialog] = useState(false);
  const [zoneDialog, setZoneDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [slotForm, setSlotForm] = useState({ label: "", timeRange: "", isActive: true, sortOrder: 0 });
  const [zoneForm, setZoneForm] = useState({ name: "", pincodes: "", deliveryFee: "40", minOrderForFree: "499", isActive: true });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const token = () => authStore.getToken()!;
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  async function loadSlots() {
    const res = await fetch("/api/admin/delivery-slots", { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setSlots(await res.json());
    setLoadingSlots(false);
  }
  async function loadZones() {
    const res = await fetch("/api/delivery-zones", { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setZones(await res.json());
    setLoadingZones(false);
  }

  useEffect(() => { loadSlots(); loadZones(); }, []);

  async function saveSlot() {
    setSaving(true);
    const url = editingSlot ? `/api/delivery-slots/${editingSlot.id}` : "/api/delivery-slots";
    const method = editingSlot ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(slotForm) });
    if (res.ok) { toast({ title: editingSlot ? "Slot updated" : "Slot created" }); setSlotDialog(false); loadSlots(); }
    else toast({ title: "Failed", variant: "destructive" });
    setSaving(false);
  }

  async function saveZone() {
    setSaving(true);
    const url = editingZone ? `/api/delivery-zones/${editingZone.id}` : "/api/delivery-zones";
    const method = editingZone ? "PATCH" : "POST";
    const body = { ...zoneForm, deliveryFee: parseFloat(zoneForm.deliveryFee), minOrderForFree: parseFloat(zoneForm.minOrderForFree) };
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
    if (res.ok) { toast({ title: editingZone ? "Zone updated" : "Zone created" }); setZoneDialog(false); loadZones(); }
    else toast({ title: "Failed", variant: "destructive" });
    setSaving(false);
  }

  async function deleteSlot(id: number) {
    if (!confirm("Delete this slot?")) return;
    await fetch(`/api/delivery-slots/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    loadSlots();
  }
  async function deleteZone(id: number) {
    if (!confirm("Delete this zone?")) return;
    await fetch(`/api/delivery-zones/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    loadZones();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center"><Truck className="h-5 w-5 text-white" /></div>
            <div><h1 className="text-2xl font-bold">Delivery Management</h1><p className="text-sm text-muted-foreground">Manage delivery slots and zones</p></div>
          </div>

          <Tabs defaultValue="slots">
            <TabsList className="mb-6"><TabsTrigger value="slots" className="gap-1.5"><Clock className="h-4 w-4" />Delivery Slots</TabsTrigger><TabsTrigger value="zones" className="gap-1.5"><MapPin className="h-4 w-4" />Delivery Zones</TabsTrigger></TabsList>

            <TabsContent value="slots">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{slots.length} slots configured</p>
                <Button size="sm" onClick={() => { setEditingSlot(null); setSlotForm({ label: "", timeRange: "", isActive: true, sortOrder: slots.length }); setSlotDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Slot</Button>
              </div>
              {loadingSlots ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : (
                <div className="space-y-2">
                  {slots.map(s => (
                    <div key={s.id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.timeRange}</p>
                      </div>
                      <Switch checked={s.isActive} onCheckedChange={async v => { await fetch(`/api/delivery-slots/${s.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ isActive: v }) }); loadSlots(); }} />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingSlot(s); setSlotForm({ label: s.label, timeRange: s.timeRange, isActive: s.isActive, sortOrder: s.sortOrder }); setSlotDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSlot(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="zones">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{zones.length} zones configured</p>
                <Button size="sm" onClick={() => { setEditingZone(null); setZoneForm({ name: "", pincodes: "", deliveryFee: "40", minOrderForFree: "499", isActive: true }); setZoneDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Zone</Button>
              </div>
              {loadingZones ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div> : (
                <div className="space-y-2">
                  {zones.map(z => (
                    <div key={z.id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm">{z.name}</p>
                          {!z.isActive && <Badge variant="outline" className="text-xs">Disabled</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">Pincodes: {z.pincodes}</p>
                        <p className="text-xs text-primary mt-0.5">₹{z.deliveryFee} fee · Free above ₹{z.minOrderForFree}</p>
                      </div>
                      <Switch checked={z.isActive} onCheckedChange={async v => { await fetch(`/api/delivery-zones/${z.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ isActive: v }) }); loadZones(); }} />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingZone(z); setZoneForm({ name: z.name, pincodes: z.pincodes, deliveryFee: z.deliveryFee.toString(), minOrderForFree: z.minOrderForFree.toString(), isActive: z.isActive }); setZoneDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteZone(z.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Slot Dialog */}
      <Dialog open={slotDialog} onOpenChange={setSlotDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingSlot ? "Edit Slot" : "Add Delivery Slot"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs mb-1">Label</Label><Input value={slotForm.label} onChange={e => setSlotForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Morning" /></div>
            <div><Label className="text-xs mb-1">Time Range</Label><Input value={slotForm.timeRange} onChange={e => setSlotForm(f => ({ ...f, timeRange: e.target.value }))} placeholder="e.g. 7:00 AM – 11:00 AM" /></div>
            <div><Label className="text-xs mb-1">Sort Order</Label><Input type="number" value={slotForm.sortOrder} onChange={e => setSlotForm(f => ({ ...f, sortOrder: parseInt(e.target.value) }))} /></div>
            <label className="flex items-center gap-2"><Switch checked={slotForm.isActive} onCheckedChange={v => setSlotForm(f => ({ ...f, isActive: v }))} /><span className="text-sm">Active</span></label>
            <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setSlotDialog(false)}>Cancel</Button><Button className="flex-1" onClick={saveSlot} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={zoneDialog} onOpenChange={setZoneDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingZone ? "Edit Zone" : "Add Delivery Zone"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs mb-1">Zone Name</Label><Input value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Central Banswara" /></div>
            <div><Label className="text-xs mb-1">Pincodes (comma-separated)</Label><Input value={zoneForm.pincodes} onChange={e => setZoneForm(f => ({ ...f, pincodes: e.target.value }))} placeholder="327001,327021,327022" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs mb-1">Delivery Fee (₹)</Label><Input type="number" value={zoneForm.deliveryFee} onChange={e => setZoneForm(f => ({ ...f, deliveryFee: e.target.value }))} /></div>
              <div><Label className="text-xs mb-1">Free Above (₹)</Label><Input type="number" value={zoneForm.minOrderForFree} onChange={e => setZoneForm(f => ({ ...f, minOrderForFree: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2"><Switch checked={zoneForm.isActive} onCheckedChange={v => setZoneForm(f => ({ ...f, isActive: v }))} /><span className="text-sm">Active</span></label>
            <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setZoneDialog(false)}>Cancel</Button><Button className="flex-1" onClick={saveZone} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
