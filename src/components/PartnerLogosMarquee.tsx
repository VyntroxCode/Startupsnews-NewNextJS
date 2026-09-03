"use client";

import { useEffect, useRef } from "react";
import { PartnerLogoTile } from "@/components/PartnerLogoTile";
import type { PartnerLogo } from "@/modules/inner-pages/domain/types";

/** Ignore a release older than this — a finger held still before lifting isn't a flick. */
const STALE_FLICK_MS = 120;
/** Cap fling speed so a violent swipe can't blur the strip into nothing. */
const MAX_FLING_PX_PER_SEC = 4000;
/** Flick glide time constant — how long inertia takes to bleed off. */
const INERTIA_TAU_SEC = 0.35;
/** Below this the glide is imperceptible, so hand control back to the auto-scroll. */
const INERTIA_CUTOFF_PX_PER_SEC = 1;
/** Movement past this during a press means "drag", not "click a logo". */
const DRAG_SLOP_PX = 4;

/**
 * One continuously auto-scrolling logo row that can also be grabbed and slid by hand.
 *
 * The track holds two copies of the logo set, and the row is offset by `translate3d` within
 * `[0, oneCopyWidth)` — wrapping across that boundary is invisible because both copies are
 * identical, which is what makes the strip feel endless in either direction.
 *
 * Auto-scroll, drag and flick-inertia all write to that same one offset, driven from a single
 * rAF loop, so they can never fight each other for the row's position. This deliberately does
 * NOT use a native `overflow-x: auto` scroller: `scrollLeft` clamps dead at 0, so a leftward
 * drag would hit an invisible wall at the loop seam instead of wrapping (and it would need a
 * hidden scrollbar per browser). `transform` also stays on the compositor, so dragging is
 * smooth on the 100+ logo rows.
 *
 * Hovering pauses the auto-scroll (the same courtesy as the /events carousel), and
 * prefers-reduced-motion disables it entirely — but dragging keeps working in both cases,
 * since that's the user moving the row themselves rather than motion imposed on them.
 */
function MarqueeRow({ logos, direction }: { logos: PartnerLogo[]; direction: "left" | "right" }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // One full copy of the logo set per `durationSec`, matching the CSS keyframes this replaced
  // so the strip still reads at its original pace regardless of how many logos are in the row.
  const durationSec = Math.max(18, logos.length * 3.5);

  useEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dirSign = direction === "left" ? 1 : -1;

    let copyWidth = 0; // width of ONE copy of the logo set — the wrap boundary
    let offset = 0; // px the track is slid by, always normalized into [0, copyWidth)
    let hovering = false;
    let dragging = false;
    let velocity = 0; // px/sec carried out of a flick, decays to 0
    let lastX = 0;
    let lastMoveMs = 0;
    let pressMovement = 0; // total px moved during this press, for click suppression
    let lastFrameMs = 0;
    let frame = 0;

    const normalize = (v: number) => (copyWidth > 0 ? ((v % copyWidth) + copyWidth) % copyWidth : 0);
    const apply = () => {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };

    // Logos are lazy-loaded from third-party hosts, so the track's width grows as they arrive —
    // re-measure instead of trusting a single width read at mount.
    const measure = () => {
      copyWidth = track.scrollWidth / 2;
      offset = normalize(offset);
      apply();
    };
    measure();

    const tick = (now: number) => {
      const dt = lastFrameMs ? Math.min((now - lastFrameMs) / 1000, 0.05) : 0; // clamp tab-switch jumps
      lastFrameMs = now;

      if (dragging) {
        // Position is owned by pointermove while the finger/cursor is down.
      } else if (Math.abs(velocity) > INERTIA_CUTOFF_PX_PER_SEC) {
        offset = normalize(offset + velocity * dt);
        velocity *= Math.exp(-dt / INERTIA_TAU_SEC);
        apply();
      } else if (!hovering && !reduceMotion && copyWidth > 0) {
        offset = normalize(offset + dirSign * (copyWidth / durationSec) * dt);
        apply();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      pressMovement = 0;
      velocity = 0; // grabbing mid-glide should stop it dead, like catching a spinning wheel
      lastX = e.clientX;
      lastMoveMs = e.timeStamp;
      row.setPointerCapture(e.pointerId);
      row.classList.add("is-dragging");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      if (dx === 0) return;
      pressMovement += Math.abs(dx);
      offset = normalize(offset - dx); // content follows the cursor 1:1
      apply();
      const dt = Math.max((e.timeStamp - lastMoveMs) / 1000, 0.001);
      // Blend samples so one jittery frame can't decide the whole fling.
      velocity = velocity * 0.7 + (-dx / dt) * 0.3;
      lastX = e.clientX;
      lastMoveMs = e.timeStamp;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      row.classList.remove("is-dragging");
      if (row.hasPointerCapture(e.pointerId)) row.releasePointerCapture(e.pointerId);
      if (e.timeStamp - lastMoveMs > STALE_FLICK_MS) velocity = 0;
      velocity = Math.max(-MAX_FLING_PX_PER_SEC, Math.min(MAX_FLING_PX_PER_SEC, velocity));
    };

    // A drag that ends over a linked logo must not also open that link.
    const onClickCapture = (e: MouseEvent) => {
      if (pressMovement > DRAG_SLOP_PX) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };

    row.addEventListener("pointerdown", onPointerDown);
    row.addEventListener("pointermove", onPointerMove);
    row.addEventListener("pointerup", onPointerUp);
    row.addEventListener("pointercancel", onPointerUp);
    row.addEventListener("click", onClickCapture, true);
    row.addEventListener("pointerenter", onEnter);
    row.addEventListener("pointerleave", onLeave);

    const observer = new ResizeObserver(measure);
    observer.observe(track);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      row.removeEventListener("pointerdown", onPointerDown);
      row.removeEventListener("pointermove", onPointerMove);
      row.removeEventListener("pointerup", onPointerUp);
      row.removeEventListener("pointercancel", onPointerUp);
      row.removeEventListener("click", onClickCapture, true);
      row.removeEventListener("pointerenter", onEnter);
      row.removeEventListener("pointerleave", onLeave);
    };
  }, [direction, durationSec]);

  if (logos.length === 0) return null;
  const looped = [...logos, ...logos];

  return (
    <div className="partners-marquee-row" ref={rowRef}>
      <div className="partners-marquee-track" ref={trackRef}>
        {looped.map((logo, i) => (
          <PartnerLogoTile key={`${logo.id}-${i}`} imageUrl={logo.imageUrl} linkUrl={logo.linkUrl} />
        ))}
      </div>
    </div>
  );
}

/**
 * Splits one category's logos into two counter-scrolling rows — first logo added goes to row
 * one, the second to row two, the third back to row one, and so on (plain index alternation),
 * so both rows stay roughly balanced no matter how many logos a category ends up with. Row one
 * flows rightward, row two leftward, for the "one row comes from the left, the other from the
 * right" effect.
 */
export function PartnerLogosMarquee({ logos }: { logos: PartnerLogo[] }) {
  if (logos.length === 0) return null;
  const rowA = logos.filter((_, i) => i % 2 === 0);
  const rowB = logos.filter((_, i) => i % 2 === 1);

  return (
    <div className="partners-marquee-group">
      <MarqueeRow logos={rowA} direction="right" />
      <MarqueeRow logos={rowB} direction="left" />
    </div>
  );
}
