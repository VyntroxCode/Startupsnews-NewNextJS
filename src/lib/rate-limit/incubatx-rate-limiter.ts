/**
 * Module-scope in-memory sliding-window rate limiter, scoped to the IncubatX dossier submit
 * route only — not a generic `lib/rate-limit.ts`, since over-promising reuse elsewhere would be
 * premature. In-memory is a deliberate, sufficient choice here: this app runs as a single
 * long-running PM2 `next start` process (not serverless/edge), and there's no Redis in this
 * repo. It resets on process restart/deploy — an acceptable tradeoff for a low-volume internal
 * form, not something worth adding infrastructure for.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, { windowMs, max }: { windowMs: number; max: number }): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}
