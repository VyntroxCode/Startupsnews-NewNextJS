"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { SponsorVideo } from "./SponsorVideo";
import { sponsorVideos } from "./backgrounds";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The "inside the room" beat straight after the hero: a large rounded video card.
 *
 * Motion language: the card resolves into focus as it arrives (scale 0.94 → 1, blur → sharp,
 * corners tightening); on hover the footage pushes in and the shade deepens. The clip is muted and
 * decorative — it plays only while on screen, and never under reduced motion.
 *
 * The play/pause button and the scrolling marquee of event formats under the card were removed on
 * request (2026-09-15). */
export function EventReel() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="sp-reel" aria-labelledby="sp-reel-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="Inside the room"
          id="sp-reel-title"
          title={
            <>
              Sponsors don&apos;t buy a venue. <em>They buy the room.</em>
            </>
          }
          lede="The right partner doesn't just add a logo to your stage. It fills the seats with founders, investors and operators who came for a reason, and keeps them talking after they leave."
        />

        <motion.div
          className="sp-reel-frame"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, filter: "blur(12px)", borderRadius: 48 }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)", borderRadius: 28 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          <SponsorVideo video={sponsorVideos.reel} />
          <span className="sp-reel-shade" aria-hidden="true" />
          <span className="sp-reel-tag">
            <i aria-hidden="true" />
            On stage
          </span>
          <div className="sp-reel-caption">
            <p className="sp-reel-caption-kicker">What partners step into</p>
            <p className="sp-reel-caption-title">Keynotes. Panels. Demo days. Founder dinners.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
