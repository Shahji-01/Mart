import { useState } from "react";
import { RotateCcw, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@/lib/custom-fetch";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

interface ReturnRequest {
  id: number; orderId: number; userId: number; userName: string | null;
  reason: string; status: string; adminNote?: string | null;
  refundAmount: number | null; refundCredited: boolean;
  orderTotal: number | null; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminReturns() {
  const token = authStore.getToken();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newStatus, setNewStatus] = useState<"approved" | "rejected">("approved");
  const [refundAmount, setRefundAmount] = useState("");
  const [creditWallet, setCreditWallet] = useState(true);
  const [filter, setFilter] = useState("all");

  const { data: returns = [], isLoading } = useQuery<ReturnRequest[]>({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const res = await customFetch("/api/returns", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, note, refAmount, credit }: { id: number; status: string; note: string; refAmount?: string; credit: boolean }) => {
      const body: Record<string, unknown> = { status, adminNote: note, creditWallet: credit };
      if (refAmount && parseFloat(refAmount) > 0) body.refundAmount = parseFloat(refAmount);
      const res = await customFetch(`/api/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-returns"] });
      toast({ title: "Return request updated" });
      setSelectedReturn(null);
      setAdminNote("");
      setRefundAmount("");
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  function openApprove(r: ReturnRequest) {
    setSelectedReturn(r);
    setNewStatus("approved");
    setAdminNote("");
    setRefundAmount(r.orderTotal ? String(r.orderTotal) : "");
    setCreditWallet(true);
  }

  function openReject(r: ReturnRequest) {
    setSelectedReturn(r);
    setNewStatus("rejected");
    setAdminNote("");
    setRefundAmount("");
    setCreditWallet(false);
  }

  const filtered = filter === "all" ? returns : returns.filter(r => r.status === filter);
  const pendingCount = returns.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Return Requests</h1>
                <p className="text-sm text-muted-foreground">{pendingCount} pending review</p>
              </div>
            </div>
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {["all", "pending", "approved", "rejected"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === "pending" && pendingCount > 0 && (
                    <span className="ml-1 bg-orange-500 text-white text-[10px] rounded-full px-1">{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No return requests {filter !== "all" ? `with status "${filter}"` : "yet"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(r => (
                  <div key={r.id} className="p-4 flex items-start gap-4 hover:bg-muted/20 transition-colors">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">Return for Order #{r.orderId}</p>
                        <Badge className={`${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                        {r.status === "pending" && (
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs gap-1">
                            <Clock className="h-2.5 w-2.5" /> Needs Review
                          </Badge>
                        )}
                        {r.refundCredited && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                            ₹{r.refundAmount?.toFixed(0)} Refunded to Wallet
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">{r.userName ?? `User #${r.userId}`}</span> · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {r.orderTotal && <span> · Order Total: ₹{r.orderTotal.toFixed(0)}</span>}
                      </p>
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{r.reason}</p>
                      {r.adminNote && <p className="text-xs text-primary mt-1 font-medium">Admin note: {r.adminNote}</p>}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 h-8 text-xs" onClick={() => openApprove(r)}>
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1 h-8 text-xs" onClick={() => openReject(r)}>
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedReturn} onOpenChange={v => { if (!v) setSelectedReturn(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newStatus === "approved" ? "Approve" : "Reject"} Return Request</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm font-medium">Order #{selectedReturn.orderId}
                  {selectedReturn.orderTotal && <span className="text-muted-foreground font-normal"> · Total: ₹{selectedReturn.orderTotal.toFixed(0)}</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{selectedReturn.reason}</p>
              </div>

              {newStatus === "approved" && (
                <>
                  <div>
                    <Label>Refund Amount (₹)</Label>
                    <Input
                      type="number"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      placeholder={selectedReturn.orderTotal ? String(selectedReturn.orderTotal) : "Enter refund amount"}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave as order total for full refund, or enter partial amount</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch checked={creditWallet} onCheckedChange={setCreditWallet} />
                    <div>
                      <p className="text-sm font-medium">Credit to NTC Wallet</p>
                      <p className="text-xs text-muted-foreground">Instantly credit ₹{refundAmount || "0"} to customer's wallet</p>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Admin Note (optional)</Label>
                <Textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder={newStatus === "approved" ? "e.g. Full refund credited to wallet" : "e.g. Return window has expired"}
                  className="mt-1 h-20"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedReturn(null)}>Cancel</Button>
                <Button
                  className={`flex-1 ${newStatus === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                  onClick={() => updateMutation.mutate({ id: selectedReturn.id, status: newStatus, note: adminNote, refAmount: refundAmount, credit: creditWallet })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating…" : newStatus === "approved" ? "Approve & Refund" : "Reject Return"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
