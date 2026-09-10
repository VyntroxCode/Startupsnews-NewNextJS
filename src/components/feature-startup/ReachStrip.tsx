"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useCountUp, useReducedMotion } from "./hooks";

/** Audience figures, taken verbatim from the numbers this business already publishes on
 * /advertise-with-us (src/app/advertise-with-us/page.tsx `STATS`) — the same source the sibling
 * Funding Round page quotes. Nothing here is estimated or invented for this page; if the media
 * desk revises those figures, this list is updated from that one place and the link below lets a
 * reader check them.
 *
 * `x`/`y` scatter each card across the field (percentages of the field box, desktop only — under
 * 900px CSS drops the absolute positioning for a plain 2×2 grid). `drift` is that card's own
 * closed loop: it wanders right, down, back left and home over `seconds`, and since no two cards
 * share a path, a duration or a phase, they never drift in formation. The scatter positions are
 * spaced so that even at full drift no two cards can touch. */
const REACH = [
  {
    target: 10,
    suffix: "M+",
    label: "Monthly impressions",
    x: 11,
    y: 27,
    drift: { x: [0, 24, 8, -16, 0], y: [0, -18, 14, -7, 0] },
    seconds: 17,
    delay: 0,
  },
  {
    target: 15,
    suffix: "M+",
    label: "Instagram organic reach",
    x: 39,
    y: 72,
    drift: { x: [0, -20, 11, 22, 0], y: [0, 15, -13, 7, 0] },
    seconds: 21,
    delay: 0.6,
  },
  {
    target: 445,
    suffix: "K+",
    label: "Instagram followers",
    x: 63,
    y: 24,
    drift: { x: [0, 18, -22, 9, 0], y: [0, 13, -11, 16, 0] },
    seconds: 19,
    delay: 0.3,
  },
  {
    target: 24,
    suffix: "",
    label: "Countries reached",
    x: 89,
    y: 69,
    drift: { x: [0, -16, 20, -9, 0], y: [0, -13, 16, -9, 0] },
    seconds: 23,
    delay: 0.9,
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

/** One drifting stat. The entrance and the drift live on two nested elements on purpose: a
 * `whileInView` entrance and an infinite `animate` loop cannot share an element without the
 * gesture state clobbering the loop, so the outer one fades/scales in on scroll and the inner one
 * owns the endless wander. */
function ReachStat({ stat, index }: { stat: (typeof REACH)[number]; index: number }) {
  const reducedMotion = useReducedMotion();
  const { ref, value } = useCountUp(stat.target, { durationMs: 1500 });

  return (
    <li
      className="fys-reach-slot"
      style={{ "--fys-reach-x": `${stat.x}%`, "--fys-reach-y": `${stat.y}%` } as React.CSSProperties}
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, delay: index * 0.1, ease: EASE }}
      >
        <motion.div
          className="fys-reach-drift"
          // Copied out of the `as const` table, which Motion's keyframe type won't take readonly.
          animate={reducedMotion ? {} : { x: [...stat.drift.x], y: [...stat.drift.y] }}
          transition={
            reducedMotion
              ? undefined
              : {
                  duration: stat.seconds,
                  delay: stat.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.28, 0.55, 0.8, 1],
                }
          }
        >
          <div className="fys-reach-card">
            <span className="fys-reach-value" ref={ref}>
              {value}
              <em>{stat.suffix}</em>
            </span>
            <span className="fys-reach-label">{stat.label}</span>
          </div>
        </motion.div>
      </motion.div>
    </li>
  );
}

/** Section 02 — social proof, as a loose field of drifting cards rather than a stat bar. It sits
 * just under the hero's fade to white and carries the hero's floating language a little further
 * down the page before the layout settles into the ordered sections below. Motion language:
 * counters plus a slow independent wander, and nothing else. */
export function ReachStrip() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fys-reach" aria-label="StartupNews.fyi audience reach">
      <motion.p
        className="fys-reach-kicker"
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
      >
        The audience your story lands in front of
      </motion.p>

      <ul className="fys-reach-field">
        {REACH.map((stat, i) => (
          <ReachStat key={stat.label} stat={stat} index={i} />
        ))}
      </ul>

      <p className="fys-reach-source">
        Audience figures as published on our <Link href="/advertise-with-us">Advertise With Us</Link>{" "}
        page.
      </p>
    </section>
  );
}
