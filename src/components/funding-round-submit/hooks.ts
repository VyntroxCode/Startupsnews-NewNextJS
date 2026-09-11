"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useInView, useReducedMotion as useMotionReducedMotion } from "motion/react";

const neverChanges = () => () => {};

/** False on the server and on the first client render, true from hydration onwards — the standard
 * useSyncExternalStore hydration probe. */
function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, () => true, () => false);
}

/** `prefers-reduced-motion`, but never before hydration.
 *
 * Motion's own `useReducedMotion` reports the real preference on the very first client render
 * while the server always rendered `false`, so branching on it directly — an `initial` that
 * becomes `false`, a wrapper that disappears — makes the first client tree disagree with the
 * server's HTML and React throws a hydration error at anyone who has the preference set. Holding
 * the value at `false` until hydration finishes keeps that first render identical to the server's;
 * React then re-renders with the real preference and every reduced-motion path applies as normal.
 *
 * Deliberately mirrors feature-startup/hooks.ts rather than importing from it — the two pages are
 * independent feature folders, and this is four lines of logic around one Motion call. */
export function useReducedMotion(): boolean {
  const reduced = useMotionReducedMotion();
  const hydrated = useHydrated();
  return hydrated && !!reduced;
}

/** Counts from 0 up to `target` the first time the returned ref's element scrolls into view, and
 * then stays there — a figure that re-runs on every pass reads as a glitch rather than a
 * flourish. Under reduced motion it lands on the final value with no tween: the number is the
 * information, the count is decoration.
 *
 * A rAF loop over a plain number rather than a MotionValue, because callers format the result
 * (decimals, separators, a ₹ prefix) at render time, which a MotionValue-driven text node cannot
 * do without re-implementing the formatting inside the subscription. */
export function useCountUp(target: number, { durationMs = 1700, decimals = 0 } = {}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Reduced motion still goes through the effect rather than being derived at render time, so
    // the server and the first client render agree on "0" — deriving it causes a hydration text
    // mismatch for anyone with the preference set.
    if (reducedMotion) {
      const settle = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(settle);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo — fast off the line, long settle, so the last digits land gently.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const factor = Math.pow(10, decimals);
      setValue(Math.round(target * eased * factor) / factor);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, durationMs, decimals, reducedMotion]);

  return { ref, value };
}

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToPointer(onChange: () => void) {
  const query = window.matchMedia(FINE_POINTER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Server render (and the first client render) assumes no fine pointer, so the tilt is inert until
 * React has hydrated — it is decoration, and starting a frame late costs nothing. */
const noFinePointer = () => false;

const NO_TILT = { rotateX: 0, rotateY: 0 };

/** A very small pointer-driven 3D tilt (±`max` degrees) for a single card. Returns handlers rather
 * than binding listeners itself, so the caller keeps control of its element. Inert under reduced
 * motion and on coarse pointers, where a tilt that cannot be driven is pure layout cost. */
export function useCardTilt(max = 2.5) {
  const reducedMotion = useReducedMotion();
  const finePointer = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    noFinePointer
  );
  const enabled = finePointer && !reducedMotion;
  const [tilt, setTilt] = useState(NO_TILT);

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rotateX: -py * max * 2, rotateY: px * max * 2 });
  }

  function onPointerLeave() {
    setTilt(NO_TILT);
  }

  return { tilt: enabled ? tilt : NO_TILT, onPointerMove, onPointerLeave };
}
