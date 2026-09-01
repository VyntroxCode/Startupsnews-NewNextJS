"use client";

import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useReducedMotion } from "./useReducedMotion";

interface SuccessSequenceProps {
  reference: string;
  onReset: () => void;
}

/** The one showy moment: the check mark pops in, the headline lifts into place, and the
 * reference number reveals character-by-character — one orchestrated ~1s GSAP timeline.
 * Renders its final frame immediately under reduced motion, no timeline created at all. */
export function SuccessSequence({ reference, onReset }: SuccessSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mark = root.querySelector(".mark");
    const heading = root.querySelector("h2");
    const meta = root.querySelector(".ix-success-meta");
    const refChars = root.querySelectorAll(".ix-ref-char");
    const actions = root.querySelector(".ix-success-actions");

    if (reducedMotion) {
      return; // CSS already renders the final state — nothing to animate.
    }

    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo(mark, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.2)" })
        .fromTo(heading, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, "-=0.15")
        .fromTo(meta, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, "-=0.2")
        .fromTo(refChars, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.03 }, "-=0.1")
        .fromTo(actions, { opacity: 0 }, { opacity: 1, duration: 0.25 }, "-=0.1");
    });
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  return (
    <div className="ix-success-stub" ref={rootRef}>
      <div className="mark">✓</div>
      <h2>Dossier submitted</h2>
      <div className="ix-success-meta">
        <p>
          Reference{" "}
          <strong className="ix-ref">
            {reference.split("").map((ch, i) => (
              <span className="ix-ref-char" key={i}>{ch}</span>
            ))}
          </strong>
        </p>
        <p className="ix-success-next">We&apos;ll review your dossier and reach out once it&apos;s ready to file.</p>
      </div>
      <div className="ix-success-actions">
        <Button variant="ghost" onClick={onReset}>Start another</Button>
      </div>
    </div>
  );
}
