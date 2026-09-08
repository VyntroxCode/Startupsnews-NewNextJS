"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STEPS } from "./stepMeta";
import { LockIcon, RocketIcon } from "./icons";

// Same useSyncExternalStore pattern as src/components/incubatx/useReducedMotion.ts — the
// React-recommended way to read a media query without the "setState synchronously in an effect"
// lint error a useState+useEffect version triggers. Server snapshot assumes desktop (false); the
// client re-syncs to the real value right after hydration, before paint, so there's no visible
// flash of the wrong-breakpoint fan geometry.
const NARROW_QUERY = "(max-width: 900px)";

function subscribeNarrow(callback: () => void) {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getNarrowSnapshot() {
  return window.matchMedia(NARROW_QUERY).matches;
}

function getNarrowServerSnapshot() {
  return false;
}

function useIsNarrow() {
  return useSyncExternalStore(subscribeNarrow, getNarrowSnapshot, getNarrowServerSnapshot);
}

/** One tilted side card — a completed step (checkmark) to the left, or a not-yet-reached step
 * (locked) to the right. `depth` (0 = nearest the center, 1 = further out) picks how far it sits.
 * Offsets are large enough on each breakpoint to clear both the rocket icon and each other —
 * mobile only ever gets a depth-0 card (see HeroFan), so it doesn't need the near/far clearance
 * math at all, just enough to clear the rocket. */
function SideCard({
  step,
  side,
  depth,
  state,
  narrow,
}: {
  step: (typeof STEPS)[number];
  side: "left" | "right";
  depth: 0 | 1;
  state: "done" | "locked";
  narrow: boolean;
}) {
  const dir = side === "left" ? -1 : 1;
  const rotate = dir * (depth === 0 ? 7 : 13);
  const x = dir * (narrow ? 92 : depth === 0 ? 140 : 285);
  const y = narrow ? 30 : depth === 0 ? 34 : 70;
  const scale = depth === 0 ? 0.94 : 0.82;
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={step.n}
        className={"fr-side-card" + (state === "locked" ? " fr-locked" : " fr-done") + (narrow ? " fr-narrow" : "")}
        style={{ zIndex: depth === 0 ? 2 : 1 }}
        initial={{ opacity: 0, x: dir * 260, y: y + 30, rotate: dir * 24, scale: 0.7 }}
        animate={{ opacity: 1, x, y, rotate, scale, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, x: dir * 120, scale: 0.7, transition: { duration: 0.3 } }}
      >
        <span className="fr-side-card-icon">
          <Icon width={20} height={20} />
        </span>
        <span className="fr-side-card-label">{step.label}</span>
        {state === "locked" ? (
          <span className="fr-side-card-lock">
            <LockIcon width={13} height={13} />
          </span>
        ) : (
          <span className="fr-side-card-check">✓</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function HeroFan({ currentStep }: { currentStep: number }) {
  const active = STEPS[currentStep - 1];
  const narrow = useIsNarrow();
  // Two cards per side on desktop (matches the reference image's fan); one per side on mobile,
  // where there simply isn't enough width to fan two without them colliding.
  const maxPerSide = narrow ? 1 : 2;
  const doneSteps = STEPS.filter((s) => s.n < currentStep).slice(-maxPerSide).reverse();
  const lockedSteps = STEPS.filter((s) => s.n > currentStep).slice(0, maxPerSide);

  return (
    <div className="fr-hero">
      <div className="fr-hero-stage">
        <motion.div
          className="fr-hero-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Step {currentStep} of {STEPS.length}
        </motion.div>

        <motion.div
          className="fr-hero-icon"
          initial={{ opacity: 0, y: -16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <RocketIcon width={44} height={44} />
          </motion.div>
        </motion.div>

        {doneSteps.map((s, i) => (
          <SideCard key={s.n} step={s} side="left" depth={i as 0 | 1} state="done" narrow={narrow} />
        ))}
        {lockedSteps.map((s, i) => (
          <SideCard key={s.n} step={s} side="right" depth={i as 0 | 1} state="locked" narrow={narrow} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.h1
          key={active.n}
          className="fr-hero-headline"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.2 } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
        >
          {active.headline}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}
