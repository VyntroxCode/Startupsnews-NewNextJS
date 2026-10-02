
/**
 * Cloudflare edge-cache purging for article pages.
 *
 * Article pages (/{category}/{slug}) are cached at Cloudflare for a day (next.config.ts, only when
 * CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID are set at build time), so every change to a post
 * must purge its URL or readers keep seeing the old version.
 *
 * Purges by PREFIX ("startupnews.fyi/fintech/some-post"), not by exact URL: on this zone a
 * single-file purge returns success but leaves the object cached (verified 2026-09-30 — the Cache
 * Rule's cache key doesn't match a plain-URL purge), while a prefix purge clears it. A prefix also
 * catches ?utm_… variants of the same article. Prefix purges have a much lower rate limit on the
 * Free plan, so purges are queued and sent at most once per FLUSH_GAP_MS per process, batched.
 *
 * Ordering matters: purging while the origin's ISR copy is still stale would just let Cloudflare
 * refetch the stale page and keep it for another day. So each flush first "warms" the origin —
 * requests the page on localhost until Next stops answering `x-nextjs-cache: STALE` — and only
 * then purges. Each change is queued twice: right away (fast path, works when the caller already
 * revalidatePath'd) and again after ORIGIN_ISR_WINDOW_MS, by which point any ISR entry rendered
 * before the change has expired, so the warm-up forces a fresh render.
 *
 * Never throws — a Cloudflare/API hiccup must not fail a post save. Safe to import from the
 * standalone cron process (no Next.js imports).
 */

const API = "https://api.cloudflare.com/client/v4";
const SITE_HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi").host;
const ORIGIN = `http://127.0.0.1:${process.env.PORT || 3000}`;
/** Articles' `revalidate` is 60s; the second pass waits a bit longer than that. */
const ORIGIN_ISR_WINDOW_MS = 75_000;
/** Minimum gap between purge API calls from one process (web + cron together stay ≤ 4/min). */
const FLUSH_GAP_MS = 30_000;
/** Back-off after a 429 / 5xx before trying again. */
const RETRY_BACKOFF_MS = 90_000;
/** Prefixes per purge request. */
const PURGE_BATCH = 30;
/** More pending paths than this → one "purge everything" instead of many batches. */
const PURGE_EVERYTHING_THRESHOLD = 300;

/** Re-encode a path the way browsers send it (and Cloudflare keys it), tolerating odd input. */
function encodePath(path: string): string {
  try {
    return encodeURI(decodeURI(path));
  } catch {
    return encodeURI(path);
  }
}

function config(): { zoneId: string; token: string } | null {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  return zoneId && token ? { zoneId, token } : null;
}

export function isCloudflarePurgeConfigured(): boolean {
  return config() !== null;
}

/** Returns the HTTP status (0 on network error / not configured). */
async function callPurge(body: Record<string, unknown>): Promise<number> {
  const cfg = config();
  if (!cfg) return 0;
  try {
    const res = await fetch(`${API}/zones/${cfg.zoneId}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[cloudflare-purge] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return res.status;
  } catch (err) {
    console.error("[cloudflare-purge] request failed:", err);
    return 0;
  }
}

function toPrefix(path: string): string {
  return `${SITE_HOST}${encodePath(path)}`;
}

export async function purgeCloudflareEverything(): Promise<boolean> {
  return (await callPurge({ purge_everything: true })) === 200;
}

/** Purge public paths (e.g. "/fintech/some-post") right now — for scripts; no queue, no warm-up. */
export async function purgeCloudflarePathsNow(paths: string[]): Promise<boolean> {
  const unique = Array.from(new Set(paths.filter((p) => p && p.startsWith("/"))));
  if (unique.length === 0 || !config()) return false;
  if (unique.length > PURGE_EVERYTHING_THRESHOLD) return purgeCloudflareEverything();
  let ok = true;
  for (let i = 0; i < unique.length; i += PURGE_BATCH) {
    ok = (await callPurge({ prefixes: unique.slice(i, i + PURGE_BATCH).map(toPrefix) })) === 200 && ok;
  }
  return ok;
}

/** Requests the page on the origin until Next has a non-stale copy (or ~15s pass). */
async function warmOrigin(path: string): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(`${ORIGIN}${encodePath(path)}`, { redirect: "manual", cache: "no-store" });
      await res.arrayBuffer().catch(() => undefined);
      if (res.headers.get("x-nextjs-cache")?.toUpperCase() !== "STALE") return;
    } catch {
      return; // origin unreachable (e.g. mid-reload) — purge anyway
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ── Queue ────────────────────────────────────────────────────────────────────────────────────
const pending = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let nextAllowedAt = 0;

function scheduleFlush(): void {
  if (flushTimer || pending.size === 0) return;
  // A short minimum delay lets a burst of saves (bulk actions, RSS imports) coalesce.
  const delay = Math.max(2_000, nextAllowedAt - Date.now());
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, delay);
  flushTimer.unref?.();
}

async function flush(): Promise<void> {
  if (pending.size === 0) return;
  nextAllowedAt = Date.now() + FLUSH_GAP_MS;

  if (pending.size > PURGE_EVERYTHING_THRESHOLD) {
    pending.clear();
    if (!(await purgeCloudflareEverything())) nextAllowedAt = Date.now() + RETRY_BACKOFF_MS;
    scheduleFlush();
    return;
  }

  const batch = Array.from(pending).slice(0, PURGE_BATCH);
  batch.forEach((p) => pending.delete(p));
  for (let i = 0; i < batch.length; i += 5) {
    await Promise.all(batch.slice(i, i + 5).map(warmOrigin));
  }
  const status = await callPurge({ prefixes: batch.map(toPrefix) });
  if (status === 429 || status >= 500 || status === 0) {
    // Rate-limited or Cloudflare hiccup: put them back and retry later.
    batch.forEach((p) => pending.add(p));
    nextAllowedAt = Date.now() + RETRY_BACKOFF_MS;
  }
  scheduleFlush();
}

function enqueue(paths: string[]): void {
  paths.forEach((p) => pending.add(p));
  scheduleFlush();
}

/**
 * Purge these article paths from Cloudflare after a post change: now, and again once the origin's
 * ISR window has passed (see file header). Fire-and-forget; no-op when Cloudflare isn't configured.
 */
export function schedulePostPurge(paths: Array<string | null | undefined>): void {
  if (!config()) return;
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p && p.startsWith("/"))));
  if (unique.length === 0) return;
  enqueue(unique);
  const timer = setTimeout(() => enqueue(unique), ORIGIN_ISR_WINDOW_MS);
  timer.unref?.();
}
