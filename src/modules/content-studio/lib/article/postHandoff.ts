// ══════════════════════════════════════════════════════════════════
// Content Studio → Create Post handoff.
// The generated article is too large for a query string, so it rides in
// sessionStorage (same tab, cleared on read) and /admin/posts/create picks
// it up when opened with ?from=content-studio.
// ══════════════════════════════════════════════════════════════════

const KEY = "content_studio_post_handoff";
export const POST_HANDOFF_QUERY = "from=content-studio";

export type PostHandoff = {
  title: string;
  excerpt: string;
  metaDescription: string;
  /** The same full HTML document as "Copy full HTML" / "Download .html". */
  html: string;
};

export function savePostHandoff(h: PostHandoff): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(h));
    return true;
  } catch {
    return false;
  }
}

/** Reads and clears the handoff, so a refresh doesn't re-import it. */
export function takePostHandoff(): PostHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PostHandoff;
  } catch {
    return null;
  }
}
