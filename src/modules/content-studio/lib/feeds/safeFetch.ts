import "server-only";

// ══════════════════════════════════════════════════════════════════
// SSRF-guarded fetch.
//
// This guard is new, and it exists *because* of the migration. In the original
// every request came from the user's browser, where the same-origin policy and
// the public CORS proxies incidentally kept requests off any private network.
// Now the fetch originates from our server, inside whatever VPC or LAN it runs
// in, with user-supplied URLs (URL Import, custom news sources, feed URLs).
// Without this, `http://169.254.169.254/` reads cloud instance metadata.
// ══════════════════════════════════════════════════════════════════

const TIMEOUT_MS = 15000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

// Some publishers reject the default fetch UA outright.
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

/** Throws when the URL must not be fetched from the server. */
export function assertSafeUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("That does not look like a valid URL");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new Error("Only http and https URLs are supported");

  const host = u.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) throw new Error("That address is not reachable");
  if (host.endsWith(".internal") || host.endsWith(".local"))
    throw new Error("That address is not reachable");
  if (isPrivateIPv4(host)) throw new Error("That address is not reachable");
  // Any IPv6 literal — too many private ranges to enumerate, and no legitimate
  // article source is addressed this way.
  if (host.startsWith("[")) throw new Error("That address is not reachable");

  return u;
}

export interface SafeFetchResult {
  body: string;
  /** The URL actually landed on, after redirects. */
  finalUrl: string;
}

/**
 * Fetch a user-supplied URL with redirects validated at every hop.
 *
 * `redirect: "manual"` rather than "follow" is deliberate: a public URL that
 * 302s to 169.254.169.254 would defeat a one-shot check on the input URL.
 */
export async function safeFetch(
  raw: string,
  init?: { accept?: string },
): Promise<SafeFetchResult> {
  let current = assertSafeUrl(raw).toString();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const r = await fetch(current, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          init?.accept ??
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
    });

    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) throw new Error(`HTTP ${r.status} with no redirect target`);
      // Re-validate every hop, resolving relative Location headers.
      current = assertSafeUrl(new URL(loc, current).toString()).toString();
      continue;
    }

    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    return { body: await readCapped(r), finalUrl: current };
  }

  throw new Error("Too many redirects");
}

/** Read a response body, aborting past MAX_BYTES so one huge page can't OOM us. */
async function readCapped(r: Response): Promise<string> {
  const reader = r.body?.getReader();
  if (!reader) return r.text();

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }

  const buf = new Uint8Array(total > MAX_BYTES ? MAX_BYTES : total);
  let offset = 0;
  for (const c of chunks) {
    if (offset + c.byteLength > buf.length) {
      buf.set(c.subarray(0, buf.length - offset), offset);
      break;
    }
    buf.set(c, offset);
    offset += c.byteLength;
  }

  return new TextDecoder("utf-8").decode(buf);
}
