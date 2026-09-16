"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { SponsorVideo } from "./SponsorVideo";
import { CtaButton } from "./CtaButton";
import { sponsorVideos } from "./backgrounds";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The big typographic break before the form, over the speaker-on-stage clip.
 *
 * Motion language: the two lines rise in one after the other, then slide in opposite directions
 * for as long as the section is on screen; the scrim lifts towards the middle of the pass so the
 * footage brightens behind the words and darkens again on the way out. Then the ask. */
export function RoomBreak({ onStart }: { onStart: () => void }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineOneX = useTransform(scrollYProgress, [0, 1], ["-8%", "6%"]);
  const lineTwoX = useTransform(scrollYProgress, [0, 1], ["8%", "-6%"]);
  const mediaY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const scrim = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0.95, 0.6, 0.95]);

  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: "45%" },
          whileInView: { opacity: 1, y: "0%" },
          viewport: { once: true, amount: 0.6 },
          transition: { duration: 1, delay, ease: EASE },
        };

  return (
    <section ref={ref} className="sp-room" aria-labelledby="sp-room-title">
      <motion.div className="sp-room-media" style={reducedMotion ? undefined : { y: mediaY }} aria-hidden="true">
        <SponsorVideo video={sponsorVideos.room} />
      </motion.div>
      <motion.span className="sp-room-scrim" style={reducedMotion ? undefined : { opacity: scrim }} aria-hidden="true" />
      <span className="sp-room-vignette" aria-hidden="true" />

      <div className="sp-wrap sp-room-inner">
        <h2 id="sp-room-title" className="sp-room-title">
          <motion.span className="sp-room-line" style={reducedMotion ? undefined : { x: lineOneX }}>
            <motion.span className="sp-room-line-inner" {...rise(0)}>
              Bring the right people
            </motion.span>
          </motion.span>
          <motion.span className="sp-room-line sp-room-line-two" style={reducedMotion ? undefined : { x: lineTwoX }}>
            <motion.span className="sp-room-line-inner" {...rise(0.18)}>
              into the <em>room.</em>
            </motion.span>
          </motion.span>
        </h2>

        <motion.p
          className="sp-room-statement"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
        >
          Let&apos;s make your next event matter.
        </motion.p>

        <motion.div
          className="sp-room-action"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
        >
          <CtaButton onClick={onStart}>Start your submission</CtaButton>
        </motion.div>
      </div>
    </section>
  );
}
