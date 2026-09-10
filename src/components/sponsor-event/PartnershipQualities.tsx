"use client";

import { motion } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";
import { CheckIcon } from "./icons";

/** What the team is actually looking at when it reads a submission. Being straight about this is
 * more useful to an organiser than a list of tiers — and it is honest about the fact that not
 * every submission leads to a partnership. */
const QUALITIES = [
  { title: "A clear purpose", body: "A real reason for people to give up an evening or a day." },
  { title: "A relevant audience", body: "A defined group who genuinely benefit from being there." },
  { title: "A strong story", body: "Something to say about why this event matters now." },
  { title: "Good timing", body: "Enough runway to build awareness before the date arrives." },
  { title: "A quality experience", body: "Thought put into the room, the format and the people in it." },
  { title: "A meaningful outcome", body: "Something attendees leave with that they didn't arrive with." },
] as const;

/** 10 — what we look for. Motion language: *a checklist ticking itself off*, each row sliding in
 * and its check mark drawing a beat later. The only place on the page where a stroke draws itself
 * outside the success state. */
export function PartnershipQualities() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="sp-qualities" aria-labelledby="sp-qualities-title">
      <div className="sp-wrap sp-qualities-inner">
        <div className="sp-qualities-aside">
          <SectionHead
            index="10"
            kicker="What we look for"
            align="left"
            title={<span id="sp-qualities-title">What makes a great event partnership?</span>}
            lede="Not every submission becomes one, and we'd rather say so up front. These are the things our team weighs when reading through what you send."
          />
        </div>

        <ul className="sp-quality-list">
          {QUALITIES.map((quality, i) => (
            <motion.li
              key={quality.title}
              className="sp-quality"
              initial={reducedMotion ? false : { opacity: 0, x: 26 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                className="sp-quality-check"
                initial={reducedMotion ? false : { scale: 0.4, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.4, delay: i * 0.08 + 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <CheckIcon />
              </motion.span>
              <div>
                <h3>{quality.title}</h3>
                <p>{quality.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
