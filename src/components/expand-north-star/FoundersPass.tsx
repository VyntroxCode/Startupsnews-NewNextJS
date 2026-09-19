"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { RevealWords } from "./RevealWords";
import { ensImages } from "./media";
import { EASE, useReducedMotion, useRise, useWideScreen } from "./hooks";

/** The photo wipes open from the right edge. The open state reaches 12% past every edge so the
 * layer's drop shadow isn't clipped away once the wipe finishes. */
const PASS_WIPE: Variants = {
  hidden: { clipPath: "inset(0% 0% 0% 100%)" },
  show: { clipPath: "inset(-12% -12% -12% -12%)", transition: { duration: 1.3, ease: EASE } },
};

/** "One day. One pod. Global exposure." — the Founder's Pass offer.
 *
 * The pink bar beside the title draws downwards, the copy follows, and the photo wipes open from
 * the right edge then drifts with scroll (desktop). Pink and violet washes drift behind. The
 * "Apply for Founder's Pass" button was removed on request (2026-09-16). */
export function FoundersPass() {
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const rise = useRise();
  const mediaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: mediaRef, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <section className="ens-pass" aria-labelledby="ens-pass-title">
      <span className="ens-blob ens-pass-blob-a" aria-hidden="true" />
      <span className="ens-blob ens-pass-blob-b" aria-hidden="true" />

      <div className="ens-wrap">
        <RevealWords id="ens-pass-title" className="ens-title" lines={[{ text: "One day. One pod. Global exposure." }]} />

        <div className="ens-pass-grid">
          <div className="ens-pass-copy">
            <h3 className="ens-pass-title">
              <motion.span
                className="ens-pass-bar"
                aria-hidden="true"
                initial={reducedMotion ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.8, ease: EASE }}
              />
              <motion.span className="ens-pass-title-text" {...rise(0.12, 18)}>
                The Founder’s Pass
              </motion.span>
            </h3>

            <motion.p {...rise(0.2)}>
              A limited-edition pass designed for founders ready to show up, be seen, and connect, without the
              commitment of a full stand.
            </motion.p>
            <motion.p {...rise(0.3)}>
              Launch your presence at Expand North Star with a dedicated startup pod for one day on the show
              floor. Meet investors, pitch your solution, generate leads and become part of a curated community
              of founders shaping the future. It’s the easiest way to step onto a global stage, fast, focused and
              founder-friendly.
            </motion.p>
          </div>

          {/* The wipe is watched on this unclipped box and played on the layer inside it: Chrome's
              IntersectionObserver counts an element's own clip-path, so a fully clipped element
              would never register as in view and the wipe would never start. */}
          <motion.div
            ref={mediaRef}
            className="ens-pass-media"
            initial={reducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
          >
            <motion.div className="ens-pass-media-clip" variants={PASS_WIPE}>
              <motion.div className="ens-pass-media-inner" style={wide && !reducedMotion ? { y: imageY } : undefined}>
                <Image
                  src={ensImages.foundersPass.src}
                  alt={ensImages.foundersPass.alt}
                  fill
                  // Wider than the frame on purpose: the photo is 2.17:1 in a ~1.7:1 frame that also
                  // bleeds 8% above and below for the scroll drift, so `cover` fills it by height and
                  // the image drawn is ~1.5x the frame's width. Asking for only the frame's width
                  // made the browser upscale a 540px source and the photo went soft.
                  sizes="(max-width: 959px) 140vw, 860px"
                  className="ens-pass-img"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
