// ══════════════════════════════════════════════════════════════════
// localStorage with an in-memory fallback, as a subscribable external store.
//
// Ports the probe + lsGet/lsSet/lsRemove wrapper from
// content-studio-v17.html:694-713. Two additions:
//
//  - It notifies subscribers, so two components reading the same key stay in
//    lockstep. The original had to hand-poke both time-range <select>s
//    (lines 1413, 1422) precisely because nothing bound them.
//  - It caches parsed values per key. useSyncExternalStore requires
//    getSnapshot to return a referentially stable value when nothing changed;
//    a bare JSON.parse returns a new object every call and sends React into
//    an infinite re-render loop.
// ══════════════════════════════════════════════════════════════════

const IN_TAB_EVENT = "content-studio:storage";

const memoryStore = new Map<string, string>();
let storageBlocked = false;
let probed = false;

const listeners = new Map<string, Set<() => void>>();
const rawCache = new Map<string, string | null>();
const parsedCache = new Map<string, unknown>();

function probe(): void {
  if (probed || typeof window === "undefined") return;
  probed = true;
  try {
    window.localStorage.setItem("__cs_probe__", "1");
    window.localStorage.removeItem("__cs_probe__");
    storageBlocked = false;
  } catch {
    // Safari private mode, blocked site data, etc.
    storageBlocked = true;
  }
}

export function isStorageBlocked(): boolean {
  probe();
  return storageBlocked;
}

export function getRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  probe();
  if (storageBlocked) return memoryStore.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function setRaw(key: string, value: string): void {
  if (typeof window === "undefined") return;
  probe();
  memoryStore.set(key, value);
  if (!storageBlocked) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      storageBlocked = true;
    }
  }
  invalidate(key);
}

export function removeRaw(key: string): void {
  if (typeof window === "undefined") return;
  memoryStore.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  invalidate(key);
}

function invalidate(key: string): void {
  rawCache.delete(key);
  parsedCache.delete(key);
  listeners.get(key)?.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(IN_TAB_EVENT, { detail: key }));
  }
}

export function subscribe(key: string, fn: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);

  // Cross-tab writes.
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) {
      rawCache.delete(key);
      parsedCache.delete(key);
      fn();
    }
  };
  // Same-tab writes from another hook instance.
  const onInTab = (e: Event) => {
    if ((e as CustomEvent<string>).detail === key) fn();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(IN_TAB_EVENT, onInTab);

  return () => {
    set.delete(fn);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(IN_TAB_EVENT, onInTab);
  };
}

/**
 * Read and parse a key, memoised on the raw string so the returned reference is
 * stable until the underlying value actually changes.
 */
export function getParsed<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | null,
): T {
  const raw = getRaw(key);

  if (rawCache.has(key) && rawCache.get(key) === raw) {
    return parsedCache.get(key) as T;
  }

  let value: T;
  try {
    value = raw == null ? fallback : (parse(raw) ?? fallback);
  } catch {
    value = fallback;
  }

  rawCache.set(key, raw);
  parsedCache.set(key, value);
  return value;
}

/** Storage keys, kept byte-identical to the original so saved data survives. */
export const KEYS = {
  authors: "cs_authors",
  customNewsSources: "cs_news_custom_sources",
  newsTimeRange: "cs_news_time_range",
  recentHeadlines: "cs_recent_headlines",
} as const;
