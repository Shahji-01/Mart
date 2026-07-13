import { Capacitor } from "@capacitor/core";

export function setupCapacitorFetch() {
  if (!Capacitor.isNativePlatform()) return;

  const originalFetch = window.fetch;
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  
  if (!baseUrl) return;

  window.fetch = async (input, init) => {
    let finalInput = input;
    
    if (typeof input === "string" && input.startsWith("/")) {
      finalInput = `${baseUrl}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith("/") && input.host === window.location.host) {
      finalInput = new URL(`${baseUrl}${input.pathname}${input.search}${input.hash}`);
    } else if (typeof input === "object" && 'url' in input && input.url.startsWith("/")) {
      finalInput = new Request(`${baseUrl}${input.url}`, input as Request);
    }
    
    return originalFetch(finalInput, init);
  };
}
