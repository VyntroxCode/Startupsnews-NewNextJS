"use client";

import { motion, type Variants } from "motion/react";
import { EASE, useReducedMotion } from "./hooks";

const TAGS = { h1: motion.h1, h2: motion.h2, h3: motion.h3 } as const;

export interface RevealLine {
  text: string;
  className?: string;
}

/** Each word rises out of its own mask with a slight tilt, one after another. */
const wordVariants: Variants = {
  hidden: { y: "112%", rotate: 5 },
  show: (delay: number) => ({ y: "0%", rotate: 0, transition: { duration: 0.95, delay, ease: EASE } }),
};

/** A heading whose words slide up out of a mask, line by line.
 *
 * `immediate` plays on load (the hero title, already on screen); otherwise it plays the first time
 * the heading is half in view. The full text is the heading's accessible name, so assistive tech
 * reads one sentence rather than a word per span. */
export function RevealWords({
  as = "h2",
  lines,
  className,
  id,
  delay = 0,
  immediate = false,
}: {
  as?: keyof typeof TAGS;
  lines: RevealLine[];
  className?: string;
  id?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const Tag = TAGS[as];
  const words = lines.map((line) => line.text.split(" "));
  const lineStart = words.map((_, li) => words.slice(0, li).reduce((n, w) => n + w.length, 0));

  return (
    <Tag
      id={id}
      className={className}
      aria-label={lines.map((line) => line.text).join(" ")}
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion || immediate ? "show" : undefined}
      whileInView={!reducedMotion && !immediate ? "show" : undefined}
      viewport={{ once: true, amount: 0.5 }}
    >
      {lines.map((line, li) => (
        <span className={"ens-line" + (line.className ? ` ${line.className}` : "")} key={li} aria-hidden="true">
          {words[li].map((word, wi) => (
            <span key={wi}>
              <span className="ens-word-mask">
                <motion.span className="ens-word" variants={wordVariants} custom={delay + (lineStart[li] + wi) * 0.055}>
                  {word}
                </motion.span>
              </span>{" "}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
