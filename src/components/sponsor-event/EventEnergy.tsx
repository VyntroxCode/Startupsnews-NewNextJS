"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ParallaxImage } from "./ParallaxImage";
import { eventImages } from "./eventImages";
import { useReducedMotion } from "./hooks";

/** 11 — the emotional break. A full-bleed photograph that slowly zooms as it passes, with two
 * lines of type that separate as the reader scrolls and a scrim that deepens behind them.
 *
 * There is nothing to read here beyond two sentences, and that is the point: after nine sections
 * of argument the page stops making a case for a moment. Motion language: *scroll-linked zoom and
 * counter-drift*, used nowhere else. */
export function EventEnergy() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const topY = useTransform(scrollYProgress, [0, 1], ["40%", "-40%"]);
  const bottomY = useTransform(scrollYProgress, [0, 1], ["70%", "-70%"]);
  const scrim = useTransform(scrollYProgress, [0, 0.5, 1], [0.75, 0.5, 0.75]);

  return (
    <section className="sp-energy" ref={ref} aria-labelledby="sp-energy-title">
      <ParallaxImage image={eventImages.energy} strength={10} zoom sizes="100vw" />
      <motion.span className="sp-energy-scrim" aria-hidden="true" style={reducedMotion ? undefined : { opacity: scrim }} />

      <div className="sp-energy-copy">
        <motion.h2 id="sp-energy-title" className="sp-energy-line" style={reducedMotion ? undefined : { y: topY }}>
          Bring People Together.
        </motion.h2>
        <motion.p className="sp-energy-line sp-energy-line-b" style={reducedMotion ? undefined : { y: bottomY }}>
          Create Moments That Move The Ecosystem Forward.
        </motion.p>
      </div>

      <div className="sp-energy-meta" aria-hidden="true">
        <span>Founders</span>
        <span>Investors</span>
        <span>Builders</span>
        <span>Communities</span>
      </div>
    </section>
  );
}
