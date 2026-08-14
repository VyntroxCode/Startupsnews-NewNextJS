
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// No-ops on internal routes (/admin, /dashboard, /employee) since GoogleAnalytics
// never loads gtag.js there, so window.gtag is simply undefined.
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
