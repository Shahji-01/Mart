import { useState } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, CheckCircle, Clock, Trash2, Send } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@/lib/custom-fetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface QAItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  userName: string;
  question: string;
  answer: string | null;
  answererName: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export default function AdminQA() {
  const token = authStore.getToken();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { data: items = [], isLoading } = useQuery<QAItem[]>({
    queryKey: ["admin-qa-all"],
    queryFn: async () => {
      const res = await customFetch("/api/products/qa/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const answerMutation = useMutation({
    mutationFn: async ({ id, answer }: { id: number; answer: string }) => {
      const res = await customFetch(`/api/products/qa/${id}/answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      toast({ title: "Answer posted!" });
      setAnswers(prev => { const n = { ...prev }; delete n[id]; return n; });
      qc.invalidateQueries({ queryKey: ["admin-qa-all"] });
    },
    onError: () => toast({ title: "Failed to post answer", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await customFetch(`/api/products/qa/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Question deleted" });
      qc.invalidateQueries({ queryKey: ["admin-qa-all"] });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const unanswered = items.filter(i => !i.answer);
  const answered = items.filter(i => i.answer);

  function QACard({ item, showAnswerForm }: { item: QAItem; showAnswerForm: boolean }) {
    const answer = answers[item.id] ?? "";
    return (
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          {item.productImage ? (
            <img src={item.productImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">{item.productName}</p>
            <p className="text-xs text-muted-foreground">{item.userName} · {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate(item.id)}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
            title="Delete question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium flex items-start gap-2">
            <MessageCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            {item.question}
          </p>
        </div>

        {item.answer ? (
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <p className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Answered by {item.answererName ?? "Admin"} · {item.answeredAt ? new Date(item.answeredAt).toLocaleDateString("en-IN") : ""}
            </p>
            <p className="text-sm">{item.answer}</p>
          </div>
        ) : showAnswerForm ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Type your answer…"
              rows={2}
              value={answer}
              onChange={e => setAnswers(prev => ({ ...prev, [item.id]: e.target.value }))}
              className="text-sm resize-none"
            />
            <Button
              size="sm"
              className="bg-primary h-8 text-xs gap-1"
              disabled={!answer.trim() || answerMutation.isPending}
              onClick={() => answerMutation.mutate({ id: item.id, answer })}
            >
              <Send className="h-3 w-3" /> Post Answer
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" /> Q&A Management
            </h1>
            <p className="text-sm text-muted-foreground">{unanswered.length} unanswered · {answered.length} answered</p>
          </div>

          <Tabs defaultValue="unanswered">
            <TabsList>
              <TabsTrigger value="unanswered" className="gap-2">
                <Clock className="h-4 w-4" /> Unanswered
                {unanswered.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] ml-1 px-1.5">{unanswered.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="answered" className="gap-2">
                <CheckCircle className="h-4 w-4" /> Answered
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unanswered" className="mt-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
              ) : unanswered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No unanswered questions right now.</p>
                </div>
              ) : (
                unanswered.map(item => <QACard key={item.id} item={item} showAnswerForm />)
              )}
            </TabsContent>

            <TabsContent value="answered" className="mt-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
              ) : answered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">No answered questions yet.</div>
              ) : (
                answered.map(item => <QACard key={item.id} item={item} showAnswerForm={false} />)
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
