"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { ArrowRightIcon } from "./icons";
import { useFinePointer, useReducedMotion } from "./hooks";

/** The page's call-to-action pill: label + a round arrow chip that nudges forward on hover.
 *
 * The magnetic pull lives on an outer span, not the button, on purpose: Motion writes the pull as
 * an inline `transform`, which would otherwise overwrite the CSS hover lift and press-down on the
 * button itself. Only on fine pointers, never under reduced motion.
 *
 * Solid pink only: the ghost/outline variants went with the hero's two buttons, their only users. */
export function CtaButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const finePointer = useFinePointer();
  const reducedMotion = useReducedMotion();
  const magnetic = finePointer && !reducedMotion;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  return (
    <motion.span
      className="sp-btn-magnet"
      style={magnetic ? { x: springX, y: springY } : undefined}
      onPointerMove={(event) => {
        if (!magnetic) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width - 0.5) * 12);
        y.set(((event.clientY - rect.top) / rect.height - 0.5) * 10);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <button type="button" className="sp-btn sp-btn-solid" onClick={onClick}>
        <span className="sp-btn-label">{children}</span>
        <span className="sp-btn-arrow" aria-hidden="true">
          <ArrowRightIcon />
        </span>
      </button>
    </motion.span>
  );
}
