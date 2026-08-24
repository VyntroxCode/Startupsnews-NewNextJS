"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production so the PWA install prompt can fire (Chromium
 * requires a fetch-handling service worker alongside the manifest). In dev,
 * unregisters any leftover worker instead — otherwise it caches dev chunks
 * and keeps serving them after a rebuild.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure is non-fatal — the site still works without a worker.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
