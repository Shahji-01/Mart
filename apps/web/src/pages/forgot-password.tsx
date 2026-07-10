import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NTCLogoIcon } from "@/components/layout/logo";
import { Mail, KeyRound, ArrowLeft, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.resetToken) setDemoToken(data.resetToken);
        setStep("reset");
        toast({ title: "Reset code generated", description: data.note || "Check your email for the reset code." });
      } else {
        toast({ title: data.error || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newPassword || newPassword !== confirm) {
      toast({ title: newPassword !== confirm ? "Passwords don't match" : "All fields required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: token.toUpperCase(), newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("done");
        toast({ title: "Password reset successfully!" });
      } else {
        toast({ title: data.error || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <NTCLogoIcon size={56} />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Shankeshwar Traders</h1>
              <p className="text-muted-foreground mt-1 text-sm">Shankeshwar Traders, Banswara</p>
            </div>
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border p-8">
          {step === "email" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Forgot Password</h2>
                  <p className="text-sm text-muted-foreground">Enter your email to reset</p>
                </div>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label>Email address</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" required />
                </div>
                <Button type="submit" className="w-full bg-primary h-11 font-semibold" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Code"}
                </Button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Reset Password</h2>
                  <p className="text-sm text-muted-foreground">Enter your reset code and new password</p>
                </div>
              </div>
              {demoToken && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="font-semibold text-amber-800 mb-1">Demo Mode — Reset Code:</p>
                  <p className="font-mono text-lg font-bold text-amber-700 tracking-widest">{demoToken}</p>
                  <p className="text-xs text-amber-600 mt-1">In production this would be emailed to you.</p>
                </div>
              )}
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <Label>Reset Code</Label>
                  <Input value={token} onChange={e => setToken(e.target.value)} placeholder="XXXXXX" className="mt-1 font-mono tracking-widest uppercase" required />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1" required />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" className="mt-1" required />
                </div>
                <Button type="submit" className="w-full bg-primary h-11 font-semibold" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
              <p className="text-muted-foreground text-sm mb-6">Your password has been updated successfully.</p>
              <Link href="/login">
                <Button className="w-full bg-primary h-11 font-semibold">Sign In Now</Button>
              </Link>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
