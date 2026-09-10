"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "./hooks";
import type { PressImage } from "./images";

/** A framed photograph that drifts against the scroll and reveals from a clip-path mask the first
 * time it enters view. One component for every large image on the page so the reveal reads the
 * same everywhere.
 *
 * `strength` is the total drift in percent of the frame height (kept small — the brief asks for
 * moderate parallax on desktop and none of the queasy full-height variety). Under reduced motion
 * the drift is dropped entirely and the mask opens instantly; the photograph itself is unchanged,
 * since it carries content, not decoration. */
export function ParallaxImage({
  image,
  strength = 8,
  priority = false,
  sizes = "(max-width: 900px) 100vw, 50vw",
  className,
  children,
}: {
  image: PressImage;
  strength?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${strength / 2}%`, `-${strength / 2}%`]);

  return (
    <motion.div
      ref={ref}
      className={"pr-figure" + (className ? ` ${className}` : "")}
      initial={reducedMotion ? false : { clipPath: "inset(0 0 100% 0)" }}
      whileInView={{ clipPath: "inset(0 0 0% 0)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="pr-figure-inner" style={reducedMotion ? undefined : { y }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="pr-figure-img"
        />
      </motion.div>
      {children}
    </motion.div>
  );
}
