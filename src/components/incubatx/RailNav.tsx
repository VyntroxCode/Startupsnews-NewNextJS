"use client";

import { useLayoutEffect, useRef } from "react";
import { STEP_LABELS, TOTAL_STEPS } from "./types";
import { useReducedMotion } from "./useReducedMotion";

interface RailNavProps {
  currentStep: number;
  onNavigate: (step: number) => void;
}

const TOTAL_NODES = TOTAL_STEPS + 1; // 5 numbered steps + the terminal review flag
const GAPS = TOTAL_NODES - 1;

/** The step rail: numbered nodes ①-⑤ plus a terminal "Review & submit" node that is visually
 * distinct (a flag/check glyph, not a number) rather than a 6th numbered step. A single
 * continuous progress track runs behind the nodes — GSAP animates its fill on every advance,
 * and each newly-completed node gets a small pop, both skipped under reduced motion. */
export function RailNav({ currentStep, onNavigate }: RailNavProps) {
  const onReview = currentStep > TOTAL_STEPS;
  const fillRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const mounted = useRef(false);

  const progressIndex = Math.min(currentStep - 1, GAPS);
  const fillPercent = (progressIndex / GAPS) * 100;

  useLayoutEffect(() => {
    if (!fillRef.current) return;
    if (!mounted.current) {
      // Snap to the restored/initial value on first paint — never animate from 0 on mount.
      fillRef.current.style.width = `${fillPercent}%`;
      mounted.current = true;
      return;
    }
    if (reducedMotion) {
      fillRef.current.style.width = `${fillPercent}%`;
      return;
    }
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled || !fillRef.current) return;
      gsap.to(fillRef.current, { width: `${fillPercent}%`, duration: 0.5, ease: "power2.out" });
      const activeNode = railRef.current?.querySelector('[data-state="active"], [data-state="done"]:last-of-type');
      if (activeNode) {
        gsap.fromTo(activeNode, { scale: 1 }, { scale: 1.18, duration: 0.18, ease: "power1.out", yoyo: true, repeat: 1 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fillPercent, reducedMotion]);

  return (
    <div className="ix-rail" role="group" aria-label="Dossier steps" ref={railRef}>
      <div className="ix-rail-track">
        <div className="ix-rail-track-fill" ref={fillRef} />
      </div>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const state = n < currentStep ? "done" : n === currentStep ? "active" : "pending";
        return (
          <div key={n} className="ix-rail-item">
            <button
              type="button"
              className="ix-rail-node"
              data-state={state}
              aria-current={state === "active" ? "step" : undefined}
              disabled={state === "pending"}
              onClick={() => state === "done" && onNavigate(n)}
            >
              {state === "done" ? "✓" : n}
            </button>
            <span className="ix-rail-label">{label}</span>
          </div>
        );
      })}
      <div className="ix-rail-item">
        <div className="ix-rail-node ix-rail-flag" data-state={onReview ? "active" : "pending"} aria-current={onReview ? "step" : undefined}>
          {onReview ? "✓" : "⚑"}
        </div>
        <span className="ix-rail-label">Review &amp; submit</span>
      </div>
    </div>
  );
}
