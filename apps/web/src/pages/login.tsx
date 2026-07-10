import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { connectSocket } from "@/hooks/use-socket";
import { NTCLogoIcon } from "@/components/layout/logo";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Minimum 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showPw, setShowPw] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: FormData) {
    loginMutation.mutate({ data }, {
      onSuccess: async (res) => {
        authStore.setToken(res.token);
        // Gate "login complete" on a live socket connection so realtime order
        // updates are ready before navigating; retries until connected, with a
        // safety timeout so navigation is never blocked indefinitely (R13.2).
        await Promise.race([
          connectSocket(res.token).catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
        toast({ title: `Welcome back, ${res.user.name}!` });
        setLocation(res.user.role === "admin" ? "/admin" : "/");
      },
      onError: () => toast({ title: "Login failed", description: "Invalid email or password", variant: "destructive" }),
    });
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
          <h2 className="text-xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to continue shopping</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input data-testid="input-email" placeholder="you@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        data-testid="input-password"
                        placeholder="Your password"
                        type={showPw ? "text" : "password"}
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button data-testid="button-submit" type="submit" className="w-full bg-primary h-11 font-semibold" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            New customer?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">Create account</Link>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
          </p>
          <div className="mt-4 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
            <p className="font-semibold text-foreground/70 mb-1">Demo credentials</p>
            <p><strong>Admin:</strong> admin@shankeshwartraders.in / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
