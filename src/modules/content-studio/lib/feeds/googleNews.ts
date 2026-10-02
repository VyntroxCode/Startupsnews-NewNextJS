import "server-only";

import { BROWSER_UA } from "./safeFetch";

// ══════════════════════════════════════════════════════════════════
// Google News link resolution.
//
// Items from news.google.com/rss carry `link` values like
//   https://news.google.com/rss/articles/CBMimAFBVV95cUxQU0cyUUpmVDdQ...
// which are opaque redirect stubs, NOT publisher URLs. Fetching one directly
// returns a ~600 KB JavaScript interstitial containing no article text and no
// outbound link.
//
// The original file never had to handle this: r.jina.ai followed the chain
// transparently. Since this migration drops Jina, News-sourced generations
// would otherwise silently fall back to a headline plus a 180-char summary —
// exactly the thin-input failure the enrichment step exists to prevent
// (content-studio-v17.html:1695-1697).
//
// Note the base64 in the path is NOT the publisher URL. In the current format
// it decodes to an opaque token ("AU_yqL..."), so the only reliable route is
// Google's own `Fbv4je` RPC, which takes the article id plus a signature and
// timestamp scraped from the interstitial. Verified working against live
// Google News.
// ══════════════════════════════════════════════════════════════════

const RPC_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const TIMEOUT_MS = 15000;

export function isGoogleNewsUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("news.google.com");
  } catch {
    return false;
  }
}

function articleIdOf(url: string): string | null {
  try {
    return new URL(url).pathname.match(/\/articles\/([^/?]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a Google News stub to the real publisher URL.
 * Returns the input unchanged when it isn't a stub or cannot be resolved, so
 * callers degrade to the old behaviour rather than failing.
 */
export async function resolveGoogleNewsUrl(url: string): Promise<string> {
  if (!isGoogleNewsUrl(url)) return url;

  const articleId = articleIdOf(url);
  if (!articleId) return url;

  try {
    // Step 1: the interstitial carries a per-article signature and timestamp.
    const page = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!page.ok) return url;

    const html = await page.text();
    const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!signature || !timestamp) return url;

    // Step 2: ask Google's own RPC what the stub points at.
    const inner = JSON.stringify([
      "garturlreq",
      [
        ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
        "X",
        "X",
        1,
        [1, 1, 1],
        1,
        1,
        null,
        0,
        0,
        null,
        0,
      ],
      articleId,
      Number(timestamp),
      signature,
    ]);

    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({
        "f.req": JSON.stringify([[["Fbv4je", inner, null, "generic"]]]),
      }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return url;

    const text = await res.text();
    const hit = text.match(/https?:\/\/(?!news\.google\.com)[^"\\\s]+/);
    return hit ? hit[0] : url;
  } catch {
    return url;
  }
}

export { BROWSER_UA };
