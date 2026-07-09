import { useSyncExternalStore } from "react";

const TOKEN_KEY = "ntc_token";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

export const authStore = {
  getToken: () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
    notify();
  },
  removeToken: () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    notify();
  },
  /** Subscribe to token changes (login/logout). Returns an unsubscribe fn. */
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    // Reflect changes made in other tabs/windows.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) listener();
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  },
};

/**
 * Reactive hook returning the current auth token. Re-renders consumers when the
 * token changes (login/logout) so effects depending on it can re-run without a
 * full page reload.
 */
export function useAuthToken(): string | null {
  return useSyncExternalStore(
    authStore.subscribe,
    authStore.getToken,
    () => null,
  );
}
