import { Link } from "wouter";
import { NTCLogoIcon } from "./logo";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter, Send } from "lucide-react";
import { useState } from "react";
import { customFetch } from "@/lib/custom-fetch";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await customFetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setStatus("done"); setEmail(""); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }

  if (status === "done") return <p className="text-sm text-green-600 font-medium">You're subscribed! Thanks for joining.</p>;
  return (
    <form onSubmit={handleSubscribe} className="flex gap-2 mt-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" />{status === "loading" ? "..." : "Subscribe"}
      </button>
    </form>
  );
}

export function Footer() {
  return (
    <footer className="bg-foreground/5 border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <NTCLogoIcon size={36} />
              <div>
                <span className="font-bold text-xl text-primary block leading-tight">Shankeshwar Traders</span>
                <span className="text-[10px] text-muted-foreground">Shankeshwar Traders</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Banswara's neighbourhood grocery store — fresh vegetables, fruits, dairy, and daily essentials delivered same day.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-foreground/70">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "All Products", href: "/category/all" },
                { label: "Vegetables", href: "/category/vegetables" },
                { label: "Fruits", href: "/category/fruits" },
                { label: "Dairy", href: "/category/dairy" },
                { label: "Flash Deals", href: "/flash-sales" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-foreground/70">Account</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "My Orders", href: "/orders" },
                { label: "Wishlist", href: "/wishlist" },
                { label: "Profile", href: "/profile" },
                { label: "Wallet", href: "/wallet" },
                { label: "Loyalty Points", href: "/loyalty" },
                { label: "Refer & Earn", href: "/referral" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-foreground/70">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Shankeshwar Traders, Banswara, Rajasthan – 327001</span>
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="tel:+919876543210" className="hover:text-primary transition-colors">+91 98765 43210</a>
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="mailto:hello@shankeshwartraders.in" className="hover:text-primary transition-colors">hello@shankeshwartraders.in</a>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs font-medium text-primary">Delivery Hours</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mon – Sun: 7:00 AM – 9:00 PM</p>
              <p className="text-xs text-muted-foreground">Same-day delivery on orders before 5 PM</p>
            </div>
          </div>
        </div>

        <div className="border-t mt-10 pt-8 mb-8">
          <div className="max-w-md">
            <h3 className="font-semibold text-sm mb-1">Stay Updated</h3>
            <p className="text-xs text-muted-foreground mb-2">Get deals, new arrivals &amp; seasonal offers from Shankeshwar Traders.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Shankeshwar Traders (Shankeshwar Traders). All rights reserved. Made with ❤️ in Banswara.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
