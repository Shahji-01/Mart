import { useState } from "react";
import { Star, Check, X, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "./dashboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@/lib/custom-fetch";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: number; userId: number; userName: string; productId: number;
  rating: number; comment: string; images: string[];
  isApproved: boolean; createdAt: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const token = authStore.getToken();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      const url = filter !== "all" ? `/api/admin/reviews?status=${filter}` : "/api/admin/reviews";
      const res = await customFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const toggleApprove = useMutation({
    mutationFn: async ({ id, isApproved }: { id: number; isApproved: boolean }) => {
      const res = await customFetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isApproved }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review updated" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: number) => {
      const res = await customFetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const approved = reviews.filter(r => r.isApproved).length;
  const pending = reviews.filter(r => !r.isApproved).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Review Moderation</h1>
                <p className="text-sm text-muted-foreground">{approved} approved · {pending} pending</p>
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : reviews.length === 0 ? (
            <div className="bg-card border rounded-xl py-16 text-center text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No reviews {filter !== "all" ? `with status "${filter}"` : "yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-card border rounded-xl p-4 flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StarRating rating={r.rating} />
                      <span className="font-medium text-sm">{r.userName}</span>
                      <Badge className={r.isApproved ? "bg-green-100 text-green-700 border-0 text-xs" : "bg-yellow-100 text-yellow-700 border-0 text-xs"}>
                        {r.isApproved ? "Approved" : "Pending"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Product #{r.productId}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground line-clamp-2">{r.comment}</p>}
                    {r.images.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {r.images.map((img, i) => (
                          <img key={i} src={img} alt="review" className="w-10 h-10 rounded-md object-cover border" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 text-xs gap-1 ${r.isApproved ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50" : "border-green-200 text-green-700 hover:bg-green-50"}`}
                      onClick={() => toggleApprove.mutate({ id: r.id, isApproved: !r.isApproved })}
                      disabled={toggleApprove.isPending}
                    >
                      {r.isApproved ? <><X className="h-3 w-3" /> Hide</> : <><Check className="h-3 w-3" /> Approve</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-red-50"
                      onClick={() => { if (confirm("Delete this review?")) deleteReview.mutate(r.id); }}
                      disabled={deleteReview.isPending}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-muted-foreground" asChild>
                      <a href={`/product/${r.productId}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3 w-3" /> View
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
