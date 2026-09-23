"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView } from "motion/react";
import { RevealWords } from "./RevealWords";
import { scrollToSection, useReducedMotion, useRise } from "./hooks";

/** 2025 edition figures, as published by the event. */
const STATS = [
  { value: 2050, suffix: "", label: "Exhibiting Startups from 96 Countries" },
  { value: 1300, suffix: "+", label: "Investors" },
  { value: 5340, suffix: "+", label: "Pre-arranged Onsite Meetings" },
  { value: 400, suffix: "", label: "Speakers" },
  { value: 6500, suffix: "+", label: "Founders" },
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

/** "Where The World Connects and The Future Scales" — the event in one paragraph, then last year's
 * numbers counting up and a "Participate Now" button into the enquiry form, on a plain white ground. (The spinning-earth clip before "2025 Show numbers" and the
 * orange flare with its sparkles at the right edge were both removed on request, 2026-09-16.) */
export function ShowNumbers() {
  const rise = useRise();
  const reducedMotion = useReducedMotion();

  return (
    <section className="ens-numbers" aria-labelledby="ens-numbers-title">

      <div className="ens-wrap">
        {/* Two lines, the second stepped in to start at the middle of the first (see .ens-numbers-title). */}
        <RevealWords
          id="ens-numbers-title"
          className="ens-title ens-numbers-title"
          lines={[{ text: "Where The World Connects" }, { text: "and The Future Scales", className: "is-step" }]}
        />

        <motion.p className="ens-lede" {...rise(0.2)}>
          North Star brings together Founders, Investors, and Visionaries from every corner of the world. It
          bridges fragmented markets, accelerates access to Global Capital, and unlocks collaboration between
          Startups, Governments, and Corporates to fuel{" "}
          {/* Non-breaking hyphen (U+2011) so "Real-World" never splits across lines; the span keeps the
              whole closing phrase together on wide screens so it sits as the paragraph's last line. */}
          <span className="ens-lede-keep">Real‑World Impact and Economic Growth.</span>
        </motion.p>

        <motion.h3 className="ens-subtitle ens-numbers-sub" {...rise(0.1)}>
          <strong>2025</strong>
          <span>Show Numbers</span>
        </motion.h3>

        <ul className="ens-stats">
          {STATS.map((stat, i) => (
            <Stat key={stat.label} stat={stat} index={i} />
          ))}
        </ul>

        {/* Under the figures: to the day-by-day delegation programme, not the enquiry form (the
            event bar's own "Participate Now" button still goes there) — changed on request,
            2026-09-21. */}
        <motion.div className="ens-numbers-cta-wrap" {...rise(0.25)}>
          <a href="#ens-days" className="ens-numbers-cta" onClick={(e) => scrollToSection(e, "ens-days", reducedMotion)}>
            More Info
          </a>
        </motion.div>
      </div>
    </section>
  );
}
