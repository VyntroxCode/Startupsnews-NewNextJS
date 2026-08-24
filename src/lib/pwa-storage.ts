// Safe localStorage helpers for the PWA install card — localStorage throws in some
// private-browsing modes, so every access goes through try/catch.

export const PWA_INSTALLED_KEY = "pwa_installed_at";
export const PWA_INSTALL_DISMISSED_KEY = "pwa_install_dismissed_at";
export const PWA_HINT_DISMISSED_KEY = "pwa_hint_dismissed_at";

const DISMISS_DAYS = 14;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;

export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — nothing we can do.
  }
}

export function markInstalled(): void {
  safeSetItem(PWA_INSTALLED_KEY, String(Date.now()));
}

export function clearInstalledMarker(): void {
  try {
    window.localStorage.removeItem(PWA_INSTALLED_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export function isMarkedInstalled(): boolean {
  return safeGetItem(PWA_INSTALLED_KEY) !== null;
}

export function dismiss(key: string): void {
  safeSetItem(key, String(Date.now()));
}

export function isDismissed(key: string): boolean {
  const raw = safeGetItem(key);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_MS;
}
