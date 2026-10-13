/**
 * Public-site colour theme (Light / Dark / System).
 *
 * The theme is a single attribute, `data-theme="light|dark"`, on <html>. Every colour in the public
 * stylesheets is written as `var(--sn-token, <original light value>)`; the tokens are defined only
 * under `html[data-theme="dark"]` (end of globals.css), so without the attribute — or with
 * `light` — each declaration falls back to the value it always had.
 *
 * The attribute is never set on the staff / reader panels (/admin, /dashboard, /employee): they
 * have their own palettes and are not part of the dark theme.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "sn-theme";
/** What a first-time visitor gets. `light` keeps the site looking as it always has until a
 *  visitor opts in; change to `system` to follow the device setting out of the box. */
export const DEFAULT_THEME: ThemePreference = "light";
/** How long the cross-fade class stays on <html>. Keep in step with `html.sn-theme-switching`
 *  in globals.css. */
const SWITCH_MS = 320;

const PANEL_ROUTE = /^\/(admin|dashboard|employee)(\/|$)/;
const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "sn-theme-change";

/**
 * Runs in <head> before first paint so a saved dark preference never flashes white. Kept as a
 * string because it has to execute before React hydrates; it mirrors `applyTheme()` below.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(${PANEL_ROUTE}.test(location.pathname))return;var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})||${JSON.stringify(DEFAULT_THEME)};var d=t==="dark"||(t==="system"&&window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})();`;

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  }
  return preference;
}

let switchTimer: ReturnType<typeof setTimeout> | undefined;

/** Writes the resolved theme to <html>. `animate` cross-fades colours; it is skipped for
 *  reduced-motion users and when nothing actually changes. */
export function applyTheme(preference: ThemePreference, animate = false): void {
  const root = document.documentElement;
  if (PANEL_ROUTE.test(window.location.pathname)) {
    root.removeAttribute("data-theme");
    return;
  }
  const next = resolveTheme(preference);
  if (root.getAttribute("data-theme") === next) return;

  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("sn-theme-switching");
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => root.classList.remove("sn-theme-switching"), SWITCH_MS);
  }
  root.setAttribute("data-theme", next);
  // Mobile browser chrome (address bar) follows the page; #ffffff is the value layout.tsx ships.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next === "dark" ? "#0B0D12" : "#ffffff");
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode / blocked storage: the choice still applies for this page view.
  }
  applyTheme(preference, true);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribes to anything that can change the theme: the switcher (this tab), another tab
 *  (`storage`), and the OS setting (only matters while the preference is `system`). */
export function subscribeToTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onChange);
  };
}
