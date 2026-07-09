import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Copy, Gift, Check, Share2, AlertCircle } from "lucide-react";
import { authStore } from "@/lib/auth-store";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useGetMyReferrals, getGetMyReferralsQueryKey } from "@workspace/api-client";

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = authStore.getToken();

  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token, setLocation]);

  const { data, isLoading, isError } = useGetMyReferrals({ query: { enabled: !!token, queryKey: getGetMyReferralsQueryKey() } });

  function copyCode() {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Referral code copied!" });
    });
  }

  function shareCode() {
    if (!data?.referralCode) return;
    const text = `Join NTC Mart – Banswara's best online grocery store by Nageshwara Trading Company! Use my referral code ${data.referralCode} to get a discount on your first order. Shop at: ${window.location.origin}`;
    if (navigator.share) { navigator.share({ title: "Join NTC Mart", text }); }
    else { navigator.clipboard.writeText(text); toast({ title: "Invite link copied!" }); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Refer Friends, Earn Points</h1>
          <p className="text-muted-foreground">Invite your friends to NTC Mart. When they place their first order, you both earn loyalty points!</p>
        </div>

        {isError ? (
          <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground mb-6">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-40 text-red-500" />
            <p>We couldn't load your referral details right now. Please try again later.</p>
          </div>
        ) : (
          <>
            {/* Referral Code */}
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Your Referral Code</p>
              {isLoading ? <Skeleton className="h-14 rounded-lg" /> : (
                <>
                  <div className="flex gap-2">
                    <Input value={data?.referralCode ?? ""} readOnly className="font-mono text-xl font-bold tracking-widest text-center bg-primary/5 border-primary/30 h-14" />
                    <Button variant="outline" onClick={copyCode} className="h-14 px-4 shrink-0">
                      {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  </div>
                  <Button className="w-full mt-3" onClick={shareCode}>
                    <Share2 className="h-4 w-4 mr-2" />Share with Friends
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total Referred", value: isLoading ? "..." : data?.totalReferrals ?? 0, icon: Users },
                { label: "Completed", value: isLoading ? "..." : data?.completedReferrals ?? 0, icon: Check },
                { label: "Points Earned", value: isLoading ? "..." : data?.rewardPointsEarned ?? 0, icon: Gift },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-card border rounded-xl p-3 text-center">
                  <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* How it works */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">How it works</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Share your code", desc: "Share your unique referral code with friends and family" },
              { step: "2", title: "Friend signs up", desc: "Your friend registers using your referral code" },
              { step: "3", title: "Friend orders", desc: "Your friend places their first order on NTC Mart" },
              { step: "4", title: "Both earn points", desc: "You earn 100 loyalty points, your friend gets a welcome bonus!" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">{step}</div>
                <div>
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
