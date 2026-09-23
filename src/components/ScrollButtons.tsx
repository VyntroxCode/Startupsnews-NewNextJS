"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AngleDownIcon, AngleUpIcon } from "@/components/icons";
import "./scroll-buttons.css";

/** How far down the page the user must be before the "scroll to top" button appears, and how
 * far from the bottom they must still be for "scroll to bottom" to be worth offering. Below
 * this the control would only move the page by a sliver, so it stays hidden. */
const EDGE_THRESHOLD_PX = 240;

/** The admin back office (everything under the `(admin)` route group, which serves `/admin/...`)
 * is excluded by request — its screens carry their own toolbars and the floating buttons would
 * only get in the way. The reader-facing `/dashboard` and the internal `/employee` sections do
 * still get them. */
function isExcludedRoute(pathname: string | null): boolean {
  return pathname === "/admin" || !!pathname?.startsWith("/admin/");
}

/**
 * Floating scroll-to-top / scroll-to-bottom controls, fixed to the bottom-right corner.
 *
 * Mounted once from the root layout (src/app/layout.tsx), so it runs on every page of the
 * site — public pages, the dashboard and the employee section — rather than only the routes
 * that ConditionalLayout wraps in site chrome. See isExcludedRoute for the one exception.
 *
 * Replaces the theme's original `.mvp-fly-top` element, which was inert: the old jQuery that
 * toggled `.mvp-to-top` never came across with the Next.js port, so it sat permanently
 * translated 100px off-screen, and media-queries.css hides it outright below 1004px.
 *
 * Each button hides itself when it has nothing left to do (already at the top / already at
 * the bottom), and both hide on pages too short to scroll.
 */
export function ScrollButtons() {
  const pathname = usePathname();
  const excluded = isExcludedRoute(pathname);
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  useEffect(() => {
    // Admin routes render nothing, so skip the listeners and the ResizeObserver entirely
    // rather than measuring a page that has no buttons to drive.
    if (excluded) return;

    // Infinite-scroll feeds, lazy images and ad slots all change the page height after load,
    // so recompute on resize and on any DOM growth, not just on scroll.
    const update = () => {
      const scrollTop = window.scrollY;
      const viewport = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const remaining = docHeight - viewport - scrollTop;

      // Nothing to scroll: keep both buttons out of the way.
      if (docHeight - viewport < EDGE_THRESHOLD_PX) {
        setShowUp(false);
        setShowDown(false);
        return;
      }

      setShowUp(scrollTop > EDGE_THRESHOLD_PX);
      setShowDown(remaining > EDGE_THRESHOLD_PX);
    };

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    // ResizeObserver on <body> catches content that grows in place — the infinite article
    // loader, late-loading images — which fires no scroll or resize event of its own.
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
    // Client-side navigation into or out of /admin re-runs this, so the listeners are attached
    // and torn down in step with whether the buttons are on screen.
  }, [excluded]);

  const scrollTo = useCallback((top: number) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

  if (excluded) return null;

  return (
    <div className="snf-scroll-btns" aria-hidden={!showUp && !showDown}>
      <button
        type="button"
        className={"snf-scroll-btn snf-scroll-btn--up" + (showUp ? " is-visible" : "")}
        onClick={() => scrollTo(0)}
        aria-label="Scroll to top"
        title="Scroll to top"
        tabIndex={showUp ? 0 : -1}
      >
        <AngleUpIcon />
      </button>
      <button
        type="button"
        className={"snf-scroll-btn snf-scroll-btn--down" + (showDown ? " is-visible" : "")}
        onClick={() => scrollTo(document.documentElement.scrollHeight)}
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
        tabIndex={showDown ? 0 : -1}
      >
        <AngleDownIcon />
      </button>
    </div>
  );
}

export default ScrollButtons;
