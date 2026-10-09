'use client';

import { useEffect } from 'react';

/** Drop a trailing slash so "/events/" and "/events" compare equal ("/" stays "/"). */
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Makes a click on a link to the page you are already on reload that page.
 *
 * `next/link` treats a same-URL click as a no-op soft navigation, so the logo on the home page, or
 * "Events" while on /events, appeared to do nothing. One capture-phase listener on the document
 * covers every link in the public chrome (header, fly menu, footer, strips) and in page content,
 * instead of an onClick on each `<Link>`. It runs before React's handlers, so the link's own
 * onClick / Next's router never see the click.
 *
 * Left alone: new-tab and modified clicks, downloads, other origins, and same-page `#hash` links
 * (those are in-page jumps, not a request to reload).
 */
export function SamePageReload() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#')) return;
      if (anchor.hasAttribute('download')) return;
      const target = anchor.getAttribute('target');
      if (target && target !== '_self') return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.hash) return;
      if (normalizePath(url.pathname) !== normalizePath(window.location.pathname)) return;
      if (url.search !== window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      // Reload restores the scroll position it left from, so go to the top first.
      window.scrollTo(0, 0);
      window.location.reload();
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
