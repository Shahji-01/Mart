import { authStore } from "./auth-store";
import { Capacitor } from "@capacitor/core";

export async function customFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = authStore.getToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization") && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let finalInput = input;
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  // If in Capacitor (native app) or production, ensure we use absolute URL for API calls.
  if ((Capacitor.isNativePlatform() || import.meta.env.PROD) && baseUrl) {
    if (typeof input === "string" && input.startsWith("/")) {
      finalInput = `${baseUrl}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith("/") && input.host === window.location.host) {
      finalInput = new URL(`${baseUrl}${input.pathname}${input.search}${input.hash}`);
    } else if (typeof input === "object" && 'url' in input && input.url.startsWith("/")) {
      finalInput = new Request(`${baseUrl}${input.url}`, input as Request);
    }
  }

  return fetch(finalInput, { ...init, headers, credentials: "include" });
}
