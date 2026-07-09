import { useState } from "react";
import { AdminSidebar } from "./dashboard";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Search, FileDown, Users } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@/lib/custom-fetch";
import { useQuery } from "@tanstack/react-query";

interface Subscriber {
  id: number;
  email: string;
  subscribedAt: string;
}

export default function AdminNewsletter() {
  const { toast } = useToast();
  const token = authStore.getToken();
  const [search, setSearch] = useState("");

  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const res = await customFetch("/api/newsletter/subscribers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Subscriber[]>;
    },
  });

  const filtered = search
    ? subscribers.filter(s => s.email.toLowerCase().includes(search.toLowerCase()))
    : subscribers;

  function handleExport() {
    if (!subscribers.length) return;
    const csv = [
      "Email,Subscribed At",
      ...subscribers.map(s => `"${s.email}","${new Date(s.subscribedAt).toLocaleDateString("en-IN")}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ntc-newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: `Exported ${subscribers.length} subscribers` });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
                <p className="text-sm text-muted-foreground">{subscribers.length} total subscribers</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={!subscribers.length}>
              <FileDown className="h-4 w-4 mr-2" />Export CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border rounded-xl p-4">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{subscribers.length}</p>
              <p className="text-xs text-muted-foreground">Total Subscribers</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Mail className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {subscribers.filter(s => new Date(s.subscribedAt) > new Date(Date.now() - 7 * 86400000)).length}
              </p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {subscribers.filter(s => new Date(s.subscribedAt) > new Date(Date.now() - 30 * 86400000)).length}
              </p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-card border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">{search ? `No results for "${search}"` : "No subscribers yet"}</p>
                <p className="text-sm mt-1">Newsletter signups will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">#</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Email</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Subscribed</th>
                      <th className="text-left p-3 text-xs text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="p-3 font-medium">{s.email}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(s.subscribedAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
