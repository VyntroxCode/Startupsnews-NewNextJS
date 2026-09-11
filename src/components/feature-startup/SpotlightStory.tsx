"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import { useReducedMotion } from "./hooks";

const HEADLINE = ["Your", "startup", "deserves", "the", "spotlight."];

/** Who a feature is actually read by. Kept to groups this publication genuinely writes for — no
 * promise that any particular one of them will act. */
const AUDIENCE = ["Founders", "Investors", "Media", "Builders", "Customers", "The startup community"];

/** Section 03 — the "why should I care" beat. Motion language here is *typographic*: the headline
 * reveals word by word from behind a clip mask (nothing else on the page uses this), then the
 * audience words snap in on a fast stagger underneath. Everything is one `whileInView` group so
 * the two halves read as a single sentence being spoken. */
export function SpotlightStory() {
  const reducedMotion = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleInView = useInView(titleRef, { once: true, amount: 0.4 });
  const revealed = titleInView || !!reducedMotion;
  return (
    <section className="fys-story" aria-labelledby="fys-story-title">
      <SectionLabel>Discover</SectionLabel>

      {/* Driven by a class + CSS transition rather than a Motion keyframe: Motion writes nothing
          for a percentage-transform target of `0%` on these inline spans, and the mask reveal
          needs a percentage (the offset has to equal the line height at every breakpoint). */}
      <h2
        id="fys-story-title"
        ref={titleRef}
        className={"fys-story-title" + (revealed ? " is-revealed" : "")}
      >
        {HEADLINE.map((word, i) => (
          <span
            key={word}
            /* Last word italic, so this headline lands the same way the hero's does. */
            className={"fys-word" + (i === HEADLINE.length - 1 ? " fys-word-accent" : "")}
          >
            <span className="fys-word-inner" style={{ transitionDelay: `${i * 75}ms` }}>
              {word}
            </span>
          </span>
        ))}
      </h2>

      <motion.p
        className="fys-story-lede"
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.55, delay: 0.35 }}
      >
        Building something ambitious takes more than launching a product. It takes visibility,
        credibility, and the right people finding out you exist. A feature on StartupNews.fyi puts
        what you&apos;re building in front of the readers who care about exactly that.
      </motion.p>

      <ul className="fys-audience" aria-label="Who reads StartupNews.fyi">
        {AUDIENCE.map((word, i) => (
          <motion.li
            key={word}
            className="fys-audience-item"
            initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
