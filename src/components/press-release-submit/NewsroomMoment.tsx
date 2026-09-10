"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { pressReleaseImages } from "./images";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** Section 08 — the cinematic pause. A full-bleed photograph that slowly zooms as it passes, with
 * the overlay deepening at the same time so the type stays legible at every scroll position, and a
 * pink rule growing under the statement.
 *
 * This is the one dark moment on an otherwise light page — a held breath between the editorial
 * policy above it and the call to action below, not a change of visual system. Under reduced
 * motion the zoom and the overlay shift are dropped and the photograph simply sits still. */
export function NewsroomMoment() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const overlay = useTransform(scrollYProgress, [0, 0.5, 1], [0.72, 0.58, 0.72]);

  return (
    <section className="pr-moment" ref={ref} aria-labelledby="pr-moment-title">
      <motion.div className="pr-moment-media" style={reducedMotion ? undefined : { scale }}>
        <Image
          src={pressReleaseImages.newsroom.src}
          alt={pressReleaseImages.newsroom.alt}
          fill
          sizes="100vw"
          className="pr-figure-img"
        />
      </motion.div>
      <motion.span
        className="pr-moment-veil"
        aria-hidden="true"
        style={reducedMotion ? undefined : { opacity: overlay }}
      />

      <div className="pr-moment-inner">
        <motion.h2
          className="pr-moment-title"
          id="pr-moment-title"
          initial={reducedMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.85, ease: PR_EASE }}
        >
          Every announcement has a bigger story.
        </motion.h2>
        <motion.span
          className="pr-moment-rule"
          aria-hidden="true"
          initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.3, ease: PR_EASE }}
        />
        <motion.p
          className="pr-moment-sub"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.5, ease: PR_EASE }}
        >
          Help us understand yours.
        </motion.p>
      </div>
    </section>
  );
}
