"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, useReducedMotion } from "./hooks";

/** The page's outbound call to action.
 *
 *   pink / lime   thick-outlined pills (the hero pair)
 *   block         square pink button that throws a hard offset shadow on hover (Founder's Pass)
 *
 * A light sheen sweeps across on hover. The magnetic pull sits on an outer span, not the link, so
 * Motion's inline `transform` never fights the CSS hover lift (which uses `translate`). Only on
 * fine pointers, never under reduced motion. */
export function EnsButton({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: "pink" | "lime" | "block";
}) {
  const finePointer = useFinePointer();
  const reducedMotion = useReducedMotion();
  const magnetic = finePointer && !reducedMotion;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  return (
    <motion.span
      className="ens-magnet"
      style={magnetic ? { x: springX, y: springY } : undefined}
      onPointerMove={(event) => {
        if (!magnetic) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width - 0.5) * 14);
        y.set(((event.clientY - rect.top) / rect.height - 0.5) * 10);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" className={`ens-btn ens-btn-${variant}`}>
        <span className="ens-btn-shine" aria-hidden="true" />
        <span className="ens-btn-label">{children}</span>
        <span className="ens-sr-only"> (opens in a new tab)</span>
      </a>
    </motion.span>
  );
}
