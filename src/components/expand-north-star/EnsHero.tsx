"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { EnsVideo } from "./EnsVideo";
import { EnsButton } from "./EnsButton";
import { RevealWords } from "./RevealWords";
import { ENS_LINKS, ensVideos } from "./media";
import { EASE, useReducedMotion } from "./hooks";

/** First viewport: pink two-weight headline, then the big rounded video card, and the two outlined
 * pills straddling the card's bottom edge.
 *
 *   ~0.25s  headline words slide up out of their masks
 *   ~0.55s  the card rises and sharpens out of a blur
 *   ~1.1s   the two pills lift in
 *
 * On scroll the footage drifts inside the card and the card eases back a touch. The pink washes
 * behind drift on their own slow loop. The clip loops on its own; the pause/play button was removed
 * on request (2026-09-15), so under reduced motion it simply holds on its poster. */
export function EnsHero() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const cardScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <section className="ens-hero" id="ens-top" ref={ref} aria-labelledby="ens-hero-title">
      <span className="ens-blob ens-hero-blob-a" aria-hidden="true" />
      <span className="ens-blob ens-hero-blob-b" aria-hidden="true" />

      <div className="ens-wrap">
        <RevealWords
          as="h1"
          id="ens-hero-title"
          className="ens-hero-title"
          immediate
          delay={0.25}
          lines={[{ text: "The world’s largest", className: "is-strong" }, { text: "startup and investor connector event" }]}
        />

        <div className="ens-hero-stage">
          <motion.div
            className="ens-hero-card"
            style={reducedMotion ? undefined : { scale: cardScale }}
            initial={reducedMotion ? false : { opacity: 0, y: 70, filter: "blur(14px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.3, delay: 0.55, ease: EASE }}
          >
            <motion.div className="ens-hero-media" style={reducedMotion ? undefined : { y: mediaY }}>
              <EnsVideo video={ensVideos.hero} eager />
            </motion.div>
            <span className="ens-hero-shade" aria-hidden="true" />
          </motion.div>

          <motion.div
            className="ens-hero-ctas"
            initial={reducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
          >
            <EnsButton href={ENS_LINKS.exhibit} variant="pink">
              Exhibit with us
            </EnsButton>
            <EnsButton href={ENS_LINKS.investors} variant="lime">
              Join investor programme
            </EnsButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
