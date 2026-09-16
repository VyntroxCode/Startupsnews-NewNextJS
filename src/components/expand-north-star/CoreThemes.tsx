"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { RevealWords } from "./RevealWords";
import { ensImages, type EnsImage } from "./media";
import { EASE, useReducedMotion, useRise, useWideScreen } from "./hooks";

const THEMES: { key: string; title: string; body: string; tone: "dark" | "lime" | "grey" | "pink"; image: EnsImage }[] = [
  {
    key: "founder-restructure",
    title: "Founder restructure",
    body: "From MVP to multi-market scale and Series A–C playbooks",
    tone: "dark",
    image: ensImages.themeFounder,
  },
  {
    key: "capital-stack",
    title: "The new capital stack",
    body: "Sovereign funds, family offices, venture debt & secondaries",
    tone: "lime",
    image: ensImages.themeCapital,
  },
  {
    key: "deeptech",
    title: "Commercial deeptech",
    body: "From labs to market-ready AI, climate, defence & frontier tech",
    tone: "grey",
    image: ensImages.themeDeeptech,
  },
  {
    key: "scaleup",
    title: "Scaleup advantage & emerging markets",
    body: "GCC, Africa, India, LATAM growth corridors",
    tone: "pink",
    image: ensImages.themeScaleup,
  },
];

/** How far each photo drifts inside its frame over the section's scroll — different per card, so
 * the four photos move at their own depth while the cards themselves stay level. */
const DRIFT = ["6%", "9%", "7%", "10%"];

function ThemeCard({
  theme,
  index,
  progress,
  parallax,
}: {
  theme: (typeof THEMES)[number];
  index: number;
  progress: MotionValue<number>;
  parallax: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const y = useTransform(progress, [0, 1], [`-${DRIFT[index]}`, DRIFT[index]]);

  return (
    <motion.li className={`ens-theme ens-theme-${theme.tone}`}>
      <motion.div
        className="ens-theme-card"
        initial={reducedMotion ? false : { opacity: 0, y: 90, rotate: index % 2 ? 2.5 : -2.5 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.05, delay: index * 0.12, ease: EASE }}
      >
        <h3 className="ens-theme-title">{theme.title}</h3>
        <motion.span
          className="ens-theme-rule"
          aria-hidden="true"
          initial={reducedMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.35 + index * 0.12, ease: EASE }}
        />
        <p className="ens-theme-body">{theme.body}</p>
        <div className="ens-theme-media">
          <motion.div className="ens-theme-media-inner" style={parallax ? { y } : undefined}>
            <Image
              src={theme.image.src}
              alt={theme.image.alt}
              fill
              sizes="(max-width: 559px) 92vw, (max-width: 959px) 46vw, 260px"
              className="ens-theme-img"
            />
          </motion.div>
        </div>
      </motion.div>
    </motion.li>
  );
}

/** "How Expand North Star creates real outcomes?" — the four 2026 core themes as tall colour
 * cards (black, lime, graphite, pink). They rise in with a slight untilt, their rules draw across,
 * and on desktop each drifts at its own rate while the section scrolls. */
export function CoreThemes() {
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const rise = useRise();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <section className="ens-themes" ref={ref} aria-labelledby="ens-themes-title">
      <span className="ens-blob ens-themes-blob-a" aria-hidden="true" />
      <span className="ens-blob ens-themes-blob-b" aria-hidden="true" />
      <span className="ens-blob ens-themes-blob-c" aria-hidden="true" />

      <div className="ens-wrap">
        <RevealWords
          id="ens-themes-title"
          className="ens-title"
          lines={[{ text: "How Expand North Star creates real outcomes?" }]}
        />
        <motion.p className="ens-subtitle ens-themes-sub" {...rise(0.15)}>
          2026 core themes
        </motion.p>

        <ul className="ens-themes-grid">
          {THEMES.map((theme, i) => (
            <ThemeCard
              key={theme.key}
              theme={theme}
              index={i}
              progress={scrollYProgress}
              parallax={wide && !reducedMotion}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
