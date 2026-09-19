"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useReducedMotion as useMotionReducedMotion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

const neverChanges = () => () => {};

/** False on the server and on the first client render, true from hydration onwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, () => true, () => false);
}

/** `prefers-reduced-motion`, but never before hydration — same reasoning as
 * src/components/sponsor-event/hooks.ts: branching on Motion's hook directly makes the first client
 * render disagree with the server HTML for exactly the people who set the preference. Every
 * component on this page reads the preference through here. */
export function useReducedMotion(): boolean {
  const reduced = useMotionReducedMotion();
  return useHydrated() && !!reduced;
}

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** True only on a device that can actually drive a hover / magnetic effect. */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/** The desktop layout — the only place scroll-linked parallax runs. */
export function useWideScreen(): boolean {
  return useMediaQuery("(min-width: 960px)");
}

/** Props for an element that lifts out of a light blur the first time it scrolls into view.
 *
 * The reduced-motion branch must still animate to the visible state: the preference only arrives
 * after hydration, by which time the element has already mounted with the hidden `initial`, and
 * Motion ignores a later change to `initial` — so `{ initial: false }` alone would leave it
 * invisible. It jumps there instantly instead. */
export function useRise() {
  const reducedMotion = useReducedMotion();
  return useCallback(
    (delay = 0, y = 28) =>
      reducedMotion
        ? {
            initial: false as const,
            animate: { opacity: 1, y: 0, filter: "blur(0px)" },
            transition: { duration: 0 },
          }
        : {
            initial: { opacity: 0, y, filter: "blur(8px)" },
            whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
            viewport: { once: true, amount: 0.4 },
            transition: { duration: 0.9, delay, ease: EASE },
          },
    [reducedMotion]
  );
}

/** The closing enquiry form (PlanYourJourney) — where every "Participate Now" button lands. */
export const PARTICIPATE_TARGET = "ens-participate";

/** Scrolls to the enquiry form, clearing whatever is pinned above it — the sticky delegation band
 * and the event bar — which `scrollIntoView` would park the form's opening line underneath. Their
 * heights are read at click time, so the tightened (scrolled) sizes are what get subtracted. Bails
 * out without `preventDefault` if the target is missing, so the plain anchor still works, and
 * `.ens-journey`'s `scroll-margin-top` covers that fallback. EnsNav keeps its own copy because it
 * already measures the pinned stack for `--ens-nav-top`. */
export function scrollToParticipate(event: React.MouseEvent<HTMLAnchorElement>, reducedMotion: boolean) {
  const target = document.getElementById(PARTICIPATE_TARGET);
  if (!target) return;
  event.preventDefault();
  const pinned = [".ens-delegation-band", ".ens-nav"].reduce((sum, selector) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return sum;
    const position = getComputedStyle(el).position;
    return position === "sticky" || position === "fixed" ? sum + el.getBoundingClientRect().height : sum;
  }, 0);
  const top = target.getBoundingClientRect().top + window.scrollY - pinned - 12;
  window.scrollTo({ top: Math.max(top, 0), behavior: reducedMotion ? "auto" : "smooth" });
}
