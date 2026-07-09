import { useSyncExternalStore } from "react";

// Selected delivery pincode, persisted in localStorage and reactive across the
// app (navbar, cart, checkout). Drives zone-based delivery fee + serviceability.
const KEY = "ntc_pincode";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

let current = read();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const locationStore = {
  getPincode(): string {
    return current;
  },
  setPincode(pincode: string) {
    current = (pincode ?? "").trim();
    try {
      if (current) localStorage.setItem(KEY, current);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore storage errors */
    }
    emit();
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

// Keep in sync across browser tabs.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      current = read();
      emit();
    }
  });
}

export function usePincode(): string {
  return useSyncExternalStore(locationStore.subscribe, locationStore.getPincode, () => current);
}
