"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";
import type { PressImage } from "./images";

/** A framed photograph that drifts against the scroll and is uncovered the first time it enters
 * view. One component for every large image on the page so the reveal reads the same everywhere.
 *
 * THE REVEAL IS TRANSFORM-ONLY, AND MUST STAY THAT WAY. It used to be a `clipPath` mask animated
 * on the frame itself, and it never ran once: Motion 13 silently abandons a `clipPath` keyframe
 * animation that is started by `whileInView` — Chrome's computed `inset()` collapses its fourth
 * value, so the running value and the target no longer parse as the same shape, and Motion drops
 * the whole animation (every other property in the same target with it) rather than falling back.
 * The element then simply keeps the `initial` style Motion had already written into the SSR
 * markup, which is `inset(0 0 100% 0)` — clipped to nothing. Every photograph on this page was
 * invisible in every browser for exactly that reason. A `clipPath` in `animate` on mount does
 * work, which is why the hero's own reveal was unaffected and the bug went unnoticed.
 *
 * So the mask is now a veil: a block in the page's own ground colour (`--pr-veil`, white over the
 * CTA's card) that slides straight down out of the frame, uncovering the photograph from its top
 * edge, with a hairline of brand pink riding the veil's leading edge. Transforms are what every
 * other section on this page animates, and they demonstrably run.
 *
 * `strength` is the total parallax drift in percent of the frame height (kept small — the brief
 * asks for moderate parallax on desktop and none of the queasy full-height variety). The image
 * also settles out of a slight over-scale as it is uncovered, so the reveal has depth rather than
 * being a flat wipe.
 *
 * `enterFrom` makes the whole frame TRAVEL in from one side instead, for the alternating rows in
 * StoryPrinciples where the photograph should arrive from the edge it sits on. It replaces the
 * veil rather than adding to it: a veil sliding down while the frame slides sideways is two
 * reveals competing over the same second, and the brief for those rows is specifically that the
 * reader should see the picture come in from its side. The lateral travel is safe without any new
 * clipping because `.pr-page` already sets `overflow-x: clip`.
 *
 * Under reduced motion the drift, the scale settle and the travel are dropped and the veil is not
 * rendered at all, so the photograph is simply there. It carries content, not decoration. */
export function ParallaxImage({
  image,
  strength = 8,
  priority = false,
  sizes = "(max-width: 900px) 100vw, 50vw",
  className,
  enterFrom,
  children,
}: {
  image: PressImage;
  strength?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Travel in from this edge instead of being uncovered by the veil. */
  enterFrom?: "left" | "right";
  children?: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${strength / 2}%`, `-${strength / 2}%`]);
  const travels = !!enterFrom && !reducedMotion;

  const frameEntrance = travels
    ? {
        initial: { opacity: 0, x: enterFrom === "left" ? "-16%" : "16%" },
        whileInView: { opacity: 1, x: "0%" },
        viewport: { once: true, amount: 0.25 } as const,
        // Slow on purpose: the point of these rows is that the reader watches the photograph
        // arrive from its own side, which a half-second slide does not give them time to do.
        transition: { duration: 1.25, ease: PR_EASE },
      }
    : {};

  return (
    <motion.div ref={ref} className={"pr-figure" + (className ? ` ${className}` : "")} {...frameEntrance}>
      <motion.div
        className="pr-figure-inner"
        style={reducedMotion ? undefined : { y }}
        initial={reducedMotion ? false : { scale: 1.09 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1.4, ease: PR_EASE }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="pr-figure-img"
        />
      </motion.div>
      {!reducedMotion && !enterFrom && (
        <motion.span
          className="pr-figure-veil"
          aria-hidden="true"
          initial={{ y: "0%" }}
          whileInView={{ y: "100%" }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.95, ease: PR_EASE }}
        />
      )}
      {children}
    </motion.div>
  );
}
