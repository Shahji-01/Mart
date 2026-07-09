import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useRegister } from "@workspace/api-client";
import { authStore } from "@/lib/auth-store";
import { NTCLogoIcon } from "@/components/layout/logo";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
  password: z.string().min(6, "Minimum 6 characters"),
  referralCode: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [showPw, setShowPw] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", password: "", referralCode: "" },
  });

  function onSubmit(data: FormData) {
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        authStore.setToken(res.token);
        toast({ title: `Welcome to NTC Mart, ${res.user.name}!` });
        setLocation("/");
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { error?: string } })?.data?.error;
        toast({ title: "Registration failed", description: msg ?? "Please try again", variant: "destructive" });
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <NTCLogoIcon size={56} />
            <div>
              <h1 className="text-3xl font-bold">NTC Mart</h1>
              <p className="text-muted-foreground mt-1 text-sm">Nageshwara Trading Company, Banswara</p>
            </div>
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border p-8">
          <h2 className="text-xl font-semibold mb-1">Create your account</h2>
          <p className="text-sm text-muted-foreground mb-6">Join thousands of happy customers in Banswara</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input data-testid="input-name" placeholder="Ramesh Sharma" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl><Input data-testid="input-phone" placeholder="9876543210" type="tel" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl><Input data-testid="input-email" placeholder="you@example.com" type="email" {...field} /></FormControl>
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
                        placeholder="Min 6 characters"
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
              <FormField control={form.control} name="referralCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">Referral Code <span className="text-xs font-normal">(optional)</span></FormLabel>
                  <FormControl><Input data-testid="input-referral-code" placeholder="e.g. RAMESH123" className="uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button data-testid="button-submit" type="submit" className="w-full bg-primary h-11 font-semibold" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
