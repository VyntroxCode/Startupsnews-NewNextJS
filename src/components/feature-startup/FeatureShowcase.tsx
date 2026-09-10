"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import { useCardTilt, useReducedMotion } from "./hooks";
import { ArrowRightIcon } from "./icons";

const META = [
  { label: "Category", value: "————" },
  { label: "Location", value: "————" },
  { label: "Founded", value: "————" },
  { label: "Website", value: "————" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Section 08 — "what would mine look like?". A single large editorial mock-up of a feature page.
 *
 * Everything inside it is placeholder by design: this site has no "featured startup" record to
 * read from, and dressing the mock in a real company's name or a real article would misrepresent
 * both that company and what a submission buys. The figcaption says as much.
 *
 * Motion language: *masked reveal + scale*. The card scales up from 0.94 while its cover image
 * un-clips from the bottom edge and the text blocks ladder in behind it — the only clip-path
 * reveal on the page — plus an optional ±2° pointer tilt on fine-pointer devices. */
export function FeatureShowcase() {
  const reducedMotion = useReducedMotion();
  const { tilt, onPointerMove, onPointerLeave } = useCardTilt(2);

  const line = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.5, delay, ease: EASE },
        };

  return (
    <section className="fys-showcase" aria-labelledby="fys-showcase-title">
      <SectionLabel index="05">Feature</SectionLabel>
      <motion.h2
        id="fys-showcase-title"
        className="fys-h2"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        Imagine your startup, featured.
      </motion.h2>

      <figure className="fys-showcase-figure">
        <motion.div
          className="fys-showcase-card"
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: EASE }}
          animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
          style={{ transformPerspective: 1200 }}
        >
          <div className="fys-showcase-chrome" aria-hidden="true">
            <span className="fys-showcase-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="fys-showcase-url">startupnews.fyi/your-startup</span>
          </div>

          <div className="fys-showcase-body">
            <div className="fys-showcase-copy">
              <motion.span className="fys-showcase-tag" {...line(0.15)}>
                Startup Feature
              </motion.span>
              <motion.h3 className="fys-showcase-headline" {...line(0.22)}>
                Building the future of ————.
              </motion.h3>
              <motion.p className="fys-showcase-byline" {...line(0.29)}>
                StartupNews.fyi Editorial · Your Startup
              </motion.p>
              <motion.p className="fys-showcase-lede" {...line(0.36)}>
                A short, readable write-up of what you&apos;re building, who it&apos;s for, how far
                along you are, and what comes next — in your words, edited by our desk.
              </motion.p>
              <motion.dl className="fys-showcase-meta" {...line(0.43)}>
                {META.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </motion.dl>
              <motion.span className="fys-showcase-fakebtn" aria-hidden="true" {...line(0.5)}>
                Explore startup
                <ArrowRightIcon />
              </motion.span>
            </div>

            {/* Masked reveal, done with a curtain rather than an animated clip-path: Motion writes
                nothing at all for a clipPath-only keyframe here, and a scaleY curtain is both
                reliable and cheaper to composite. */}
            <div className="fys-showcase-cover">
              <Image
                src="/images/feature-your-startup/step-details.jpg"
                alt=""
                fill
                sizes="(min-width: 1000px) 380px, 90vw"
                className="fys-showcase-cover-img"
              />
              <span className="fys-showcase-cover-badge">Featured</span>
              {!reducedMotion && (
                <motion.span
                  className="fys-showcase-curtain"
                  aria-hidden="true"
                  initial={{ scaleY: 1 }}
                  whileInView={{ scaleY: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.85, delay: 0.2, ease: EASE }}
                />
              )}
            </div>
          </div>
        </motion.div>

        <figcaption className="fys-showcase-caption">
          Preview layout with placeholder content — your own feature is written with you.
        </figcaption>
      </figure>
    </section>
  );
}
