"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView } from "motion/react";
import { EnsVideo } from "./EnsVideo";
import { RevealWords } from "./RevealWords";
import { ensVideos } from "./media";
import { useReducedMotion, useRise } from "./hooks";

/** 2025 edition figures, as published by the event. */
const STATS = [
  { value: 2050, suffix: "", label: "Exhibiting Startups from 96 Countries" },
  { value: 1300, suffix: "+", label: "Investors" },
  { value: 5340, suffix: "", label: "Pre-arranged Onsite Meetings" },
  { value: 400, suffix: "", label: "Speakers" },
  { value: 6500, suffix: "", label: "Founders" },
] as const;

const format = (n: number) => n.toLocaleString("en-US");

/** One figure that counts up from zero the first time it is on screen.
 *
 * The server renders the final number, so it reads correctly without JavaScript. After hydration
 * a figure still off screen is reset to 0 and counts up when reached; one already on screen at
 * load just stays put. The count is written straight to the DOM (no re-render per frame) into a
 * span hidden from assistive tech, which reads the final value from a visually hidden copy. */
function Stat({ stat, index }: { stat: (typeof STATS)[number]; index: number }) {
  const reducedMotion = useReducedMotion();
  const rise = useRise();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reset = useRef(false);
  const final = format(stat.value) + stat.suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion) {
      el.textContent = final;
      return;
    }
    if (!inView) {
      el.textContent = format(0) + stat.suffix;
      reset.current = true;
      return;
    }
    if (!reset.current) return;
    const controls = animate(0, stat.value, {
      duration: 2.2,
      delay: 0.15 + index * 0.12,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(Math.round(v)) + stat.suffix;
      },
    });
    return () => controls.stop();
  }, [inView, reducedMotion, final, stat, index]);

  return (
    <motion.li className="ens-stat" {...rise(index * 0.09)}>
      <span className="ens-stat-value">
        <span ref={ref} aria-hidden="true">
          {final}
        </span>
        <span className="ens-sr-only">{final}</span>
      </span>
      <span className="ens-stat-label">{stat.label}</span>
    </motion.li>
  );
}

/** "The world connects. The future scales" — the event in one paragraph, then last year's numbers
 * counting up, with a small spinning-earth clip beside the subheading and a warm orange flare
 * drifting at the right edge. */
export function ShowNumbers() {
  const rise = useRise();

  return (
    <section className="ens-numbers" aria-labelledby="ens-numbers-title">
      <span className="ens-blob ens-numbers-blob" aria-hidden="true" />
      <span className="ens-numbers-stars" aria-hidden="true" />

      <div className="ens-wrap">
        <RevealWords id="ens-numbers-title" className="ens-title" lines={[{ text: "The world connects. The future scales" }]} />

        <motion.p className="ens-lede" {...rise(0.2)}>
          North Star brings together founders, investors, and visionaries from every corner of the world. It
          bridges fragmented markets, accelerates access to global capital, and unlocks collaboration between
          startups, governments, and corporates to fuel real-world impact and economic growth.
        </motion.p>

        <motion.h3 className="ens-subtitle ens-numbers-sub" {...rise(0.1)}>
          <span className="ens-globe" aria-hidden="true">
            <EnsVideo video={ensVideos.globe} />
          </span>
          <strong>2025</strong>
          <span>Show numbers</span>
        </motion.h3>

        <ul className="ens-stats">
          {STATS.map((stat, i) => (
            <Stat key={stat.label} stat={stat} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
