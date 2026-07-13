import { authStore } from "./auth-store";

export async function customFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = authStore.getToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization") && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}
