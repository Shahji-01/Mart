import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import { setupCapacitorFetch } from "@/lib/capacitor-fetch";

setupCapacitorFetch();

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

createRoot(document.getElementById("root")!).render(<App />);
