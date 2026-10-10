"use client";

import { useEffect, useRef } from "react";

/** Where the growing line's tip sits, as a fraction of the viewport height from the top. */
const TIP_VIEWPORT_FRACTION = 0.6;
/** The line's `top` / `bottom` inset inside the list, and the dot's centre inside its row — both
 * mirror the `.startup-events-wrap` rules in globals.css (first row sits 11px higher). */
const LINE_INSET_PX = 8;
const DOT_CENTRE_PX = 21;
const FIRST_DOT_CENTRE_PX = 10;

/** The Startup Events list with a live timeline: the red dashed line grows downwards as the page
 * scrolls, and each dot turns red and blinks at the moment the line reaches it.
 *
 * The line and the dots are CSS pseudo-elements (`::before` on the list and on every row), so
 * there is nothing for React to animate directly. This component only publishes progress — a
 * `--events-line` custom property on the list and a `data-reached` attribute on each row — and
 * the `[data-timeline="live"]` rules in globals.css do the drawing. `data-timeline` is set from
 * the effect, so without JS, and under reduced motion, the list keeps its plain all-red look.
 *
 * Progress is measured against the list itself, except inside the sticky sidebar: there the list
 * is pinned and never moves on screen, so the tall `#mvp-side-wrap` column it travels down is
 * measured instead. */
export function EventsTimelineList({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rows = Array.from(list.querySelectorAll<HTMLElement>(":scope > .startup-events-item"));
    const track = list.closest<HTMLElement>("#mvp-side-wrap") ?? list;
    list.dataset.timeline = "live";

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      // Hidden at this breakpoint (display: none) — nothing to measure.
      if (rect.height === 0) return;
      const progress = Math.min(
        1,
        Math.max(0, (window.innerHeight * TIP_VIEWPORT_FRACTION - rect.top) / rect.height)
      );
      list.style.setProperty("--events-line", `${progress * 100}%`);
      const tip = LINE_INSET_PX + progress * (list.offsetHeight - LINE_INSET_PX * 2);
      rows.forEach((row, i) => {
        const reached = tip >= row.offsetTop + (i === 0 ? FIRST_DOT_CENTRE_PX : DOT_CENTRE_PX);
        if (reached) row.dataset.reached = "";
        else delete row.dataset.reached;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      delete list.dataset.timeline;
      list.style.removeProperty("--events-line");
      rows.forEach((row) => delete row.dataset.reached);
    };
  }, []);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
