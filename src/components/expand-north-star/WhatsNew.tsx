"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { RevealWords } from "./RevealWords";
import { ensImages, type EnsImage } from "./media";
import { EASE, useReducedMotion } from "./hooks";

const FEATURES: { key: string; title: string; kicker: string; body: string; image: EnsImage }[] = [
  {
    key: "backers-pitch",
    title: "ENS26 Backers Pitch",
    kicker: "No founders. No fluff. Just backers pitching deals.",
    body: "Backed startups presented by investors, triggering instant interest signals and curated follow-up meetings in the dealroom.",
    image: ensImages.backersPitch,
  },
  {
    key: "founders-academy",
    title: "ENS Founders Academy",
    kicker: "The world’s largest founder learning platform",
    body: "A 3-day academy at Expand North Star connecting founders with investors, operators and unicorn builders through five specialised labs spanning the entire startup journey, from idea to exit.",
    image: ensImages.foundersAcademy,
  },
  {
    key: "ns-play",
    title: "NS Play",
    kicker: "Innovation meets lifestyle",
    body: "This new feature brings together founders building AR/VR hardware, smart health devices and lifestyle tech designed to scale.",
    image: ensImages.nsPlay,
  },
  {
    key: "digihealth",
    title: "DigiHealth–Biotech",
    kicker: "Redefining the future of human health",
    body: "From AI-driven diagnostics to genomics and next-generation therapeutics, this feature accelerates the world’s most advanced health innovations toward real-world impact.",
    image: ensImages.digiHealth,
  },
];

/** "What's new in 2026" — four white cards on a soft grey ground. Each rises in turn while its
 * photo settles from a slight zoom; on hover the card lifts and the photo pushes in. */
export function WhatsNew() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="ens-new" aria-labelledby="ens-new-title">
      <div className="ens-wrap">
        <RevealWords
          id="ens-new-title"
          className="ens-title"
          lines={[{ text: "What’s new in 2026" }, { text: "New features. New scale." }]}
        />

        <ul className="ens-new-grid">
          {FEATURES.map((feature, i) => (
            <motion.li
              key={feature.key}
              className="ens-new-card"
              initial={reducedMotion ? false : { opacity: 0, y: 64 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.95, delay: i * 0.12, ease: EASE }}
            >
              <div className="ens-new-media">
                <motion.div
                  className="ens-new-media-inner"
                  initial={reducedMotion ? false : { scale: 1.2 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 1.6, delay: i * 0.12, ease: EASE }}
                >
                  <Image
                    src={feature.image.src}
                    alt={feature.image.alt}
                    fill
                    sizes="(max-width: 559px) 92vw, (max-width: 959px) 46vw, 280px"
                    className="ens-new-img"
                  />
                </motion.div>
              </div>
              <div className="ens-new-text">
                <h3 className="ens-new-title">{feature.title}</h3>
                <p className="ens-new-kicker">{feature.kicker}</p>
                <p className="ens-new-body">{feature.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
