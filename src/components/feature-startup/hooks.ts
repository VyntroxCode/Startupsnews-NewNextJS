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
 * while the server always rendered `false`, so branching on it directly — a wrapper element that
 * disappears, an `initial` that becomes `false` — makes the first client tree disagree with the
 * server's HTML and React throws a hydration error at anyone who has the preference set. Holding
 * the value at `false` until hydration finishes keeps that first render identical to the server's;
 * React then re-renders with the real preference and every reduced-motion path applies as normal.
 *
 * Every component on this page reads the preference through here rather than from Motion directly. */
export function useReducedMotion(): boolean {
  const reduced = useMotionReducedMotion();
  const hydrated = useHydrated();
  return hydrated && !!reduced;
}

/** Counts from 0 up to `target` the first time the returned ref's element scrolls into view, and
 * then stays at the final value (a stat that re-runs every time it passes the viewport reads as a
 * glitch rather than a flourish). Under `prefers-reduced-motion` it jumps straight to the final
 * value with no tween — the number itself is the information, the animation is decoration.
 *
 * Deliberately a rAF loop over a single number rather than a motion value + subscriber: the value
 * is formatted (decimals, separators) at render time by the caller, which a MotionValue-driven
 * text node can't do without re-implementing the formatting inside the subscription. */
export function useCountUp(target: number, { durationMs = 1600, decimals = 0 } = {}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Reduced motion still goes through the effect (rather than being derived at render time) so
    // that the server and the first client render agree on "0" — deriving it caused a hydration
    // text mismatch for anyone with the preference set.
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

/** Server render (and the first client render) assumes no fine pointer, so the tilt is simply
 * inert until React has hydrated — it is decoration, and starting it a frame late costs nothing. */
const noFinePointer = () => false;

interface TiltState {
  rotateX: number;
  rotateY: number;
}

const NO_TILT: TiltState = { rotateX: 0, rotateY: 0 };

/** Very small pointer-driven 3D tilt (±`max` degrees, 2 by default) for one hero/showcase card.
 * Returns handlers rather than binding listeners itself so the caller keeps control of the
 * element. Disabled entirely under reduced motion and on coarse-pointer devices — a tilt that
 * can't be driven by a pointer is just a layout cost on mobile. */
export function useCardTilt(max = 2) {
  const reducedMotion = useReducedMotion();
  const finePointer = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    noFinePointer
  );
  const enabled = finePointer && !reducedMotion;
  const [tilt, setTilt] = useState<TiltState>(NO_TILT);

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
