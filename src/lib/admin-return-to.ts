/** Remembers which filtered view of an admin list page the admin was on, so a create / edit page
 * can send them back there after saving instead of to the bare, unfiltered list. */

export function rememberAdminReturnTo(key: string, href: string): void {
  try {
    sessionStorage.setItem(key, href);
  } catch {
    // Storage unavailable — callers fall back to the unfiltered list.
  }
}

export function adminReturnTo(key: string, fallback: string): string {
  try {
    const href = sessionStorage.getItem(key);
    // Only ever return to the list page itself (optionally with a query string).
    if (href && (href === fallback || href.startsWith(`${fallback}?`))) return href;
  } catch {
    // ignore
  }
  return fallback;
}
