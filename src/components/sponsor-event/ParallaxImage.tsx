"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { EventImage } from "./eventImages";
import { useReducedMotion } from "./hooks";

/** A full-bleed photograph that drifts and scales slightly against the page scroll.
 *
 * The movement is done by over-sizing the image (`height: 120%`) and translating within that
 * slack, so nothing is ever revealed at the edges no matter where the section sits in the scroll.
 * `strength` is the travel in percent of the container height. Scroll-linked transforms only —
 * no scroll event listeners, and the whole thing degrades to a plain static image under reduced
 * motion. */
export function ParallaxImage({
  image,
  strength = 12,
  zoom = false,
  priority = false,
  className = "",
  sizes = "100vw",
}: {
  image: EventImage;
  strength?: number;
  zoom?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);
  const scale = useTransform(scrollYProgress, [0, 1], zoom ? [1.02, 1.16] : [1, 1]);

  return (
    <div className={`sp-parallax ${className}`} ref={ref}>
      <motion.div className="sp-parallax-inner" style={reducedMotion ? undefined : { y, scale }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="sp-parallax-img"
          priority={priority}
        />
      </motion.div>
    </div>
  );
}
