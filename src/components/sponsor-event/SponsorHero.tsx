"use client";

import { Fragment, useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { SponsorVideo } from "./SponsorVideo";
import { sponsorVideos } from "./backgrounds";
import { useFinePointer, useReducedMotion, useWideScreen } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

const HEADLINE = [["Sponsor", "events"], ["that", "move", "the"], ["startup", "ecosystem."]] as const;
/** Index of each line's first word in the whole headline, for the word-by-word stagger. */
const LINE_START = [0, 2, 5];

/** Reach figures, verbatim from what this business already publishes on /advertise-with-us
 * (src/app/advertise-with-us/page.tsx `STATS`). Nothing here is estimated for this page.
 * `x`/`y` place each card inside the stats column (desktop only); `lift` is how far it rises over
 * the hero's scroll, different per card so the four separate into depth; `float` is its own idle
 * bob period so no two move in step. */
const STATS = [
  { value: "10M+", label: "Monthly impressions", x: 4, y: 0, lift: -60, float: 6.5 },
  { value: "22K+", label: "Community members", x: 46, y: 23, lift: -130, float: 8 },
  { value: "250+", label: "Global media partners", x: 0, y: 50, lift: -34, float: 7.2 },
  { value: "24+", label: "Countries reached", x: 42, y: 75, lift: -100, float: 9 },
] as const;

function HeroStat({
  stat,
  index,
  progress,
  parallax,
}: {
  stat: (typeof STATS)[number];
  index: number;
  progress: MotionValue<number>;
  parallax: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const lift = useTransform(progress, [0, 1], [0, stat.lift]);
  return (
    <motion.li
      className="sp-hero-stat"
      style={{ left: `${stat.x}%`, top: `${stat.y}%`, y: parallax ? lift : undefined }}
    >
      {/* Entrance and idle float on two elements: an infinite loop and a one-shot entrance can't
          share one without the loop being clobbered. */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 26, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 1.55 + index * 0.12, ease: EASE }}
      >
        <motion.div
          className="sp-hero-stat-card"
          animate={reducedMotion ? undefined : { y: [0, index % 2 ? -9 : -12, 0] }}
          transition={
            reducedMotion
              ? undefined
              : { duration: stat.float, repeat: Infinity, ease: "easeInOut", delay: 2.4 + index * 0.3 }
          }
        >
          <span className="sp-hero-stat-value">{stat.value}</span>
          <span className="sp-hero-stat-label">{stat.label}</span>
        </motion.div>
      </motion.div>
    </motion.li>
  );
}

/** The first viewport — a short cinematic opening that settles into the hero, not a loading
 * screen: everything is server-rendered and readable the moment motion finishes.
 *
 *   ~0.5s  the headline arrives word by word, each word lifting out of a blur
 *   ~0.9s  the dark curtain lifts off the crowd footage while it slowly de-zooms
 *   ~1.3s  "Reach the right founders." follows, softer
 *   ~1.5s  the lede, then the four reach cards float in at different depths
 *
 * The "Partner with StartupNews.fyi" eyebrow and the two buttons under the lede ("Start your
 * submission" / "Explore partnership benefits") were removed on request (2026-09-15), so the hero
 * no longer links anywhere; the room-break CTA further down is the page's jump to the form.
 *
 * On scroll the footage drifts down, the copy lifts and fades, and each reach card rises at its
 * own rate. A soft pink light follows the pointer on fine-pointer devices. */
export function SponsorHero() {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const wide = useWideScreen();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const contentFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const parallax = wide && !reducedMotion;

  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease: EASE },
        };

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!finePointer || reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--sp-mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--sp-my", `${event.clientY - rect.top}px`);
  }

  return (
    <section className="sp-hero" ref={ref} aria-labelledby="sp-hero-title" onPointerMove={onPointerMove}>
      <motion.div className="sp-hero-media" style={reducedMotion ? undefined : { y: mediaY }} aria-hidden="true">
        <motion.div
          className="sp-hero-media-zoom"
          initial={reducedMotion ? false : { scale: 1.16 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.8, ease: EASE }}
        >
          <SponsorVideo video={sponsorVideos.hero} eager className="sp-hero-video" />
        </motion.div>
      </motion.div>
      <span className="sp-hero-scrim" aria-hidden="true" />
      <span className="sp-hero-glow sp-hero-glow-a" aria-hidden="true" />
      <span className="sp-hero-glow sp-hero-glow-b" aria-hidden="true" />
      <span className="sp-hero-cursor" aria-hidden="true" />
      <motion.span
        className="sp-hero-curtain"
        aria-hidden="true"
        initial={reducedMotion ? false : { opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.6, delay: 0.9, ease: "easeOut" }}
      />

      <motion.div className="sp-hero-inner" style={reducedMotion ? undefined : { y: contentY, opacity: contentFade }}>
        <div className="sp-hero-copy">
          <h1 id="sp-hero-title" className="sp-hero-title">
            {HEADLINE.map((line, li) => (
              <span className="sp-hero-line" key={line.join("-")}>
                {line.map((word, wi) => {
                  const accent = li === HEADLINE.length - 1 && wi === line.length - 1;
                  return (
                    <Fragment key={word}>
                      <motion.span
                        className={"sp-hero-word" + (accent ? " is-accent" : "")}
                        initial={reducedMotion ? false : { opacity: 0, y: "0.45em", filter: "blur(14px)", scale: 1.06 }}
                        animate={{ opacity: 1, y: "0em", filter: "blur(0px)", scale: 1 }}
                        transition={{ duration: 1, delay: 0.5 + (LINE_START[li] + wi) * 0.075, ease: EASE }}
                      >
                        {word}
                      </motion.span>{" "}
                    </Fragment>
                  );
                })}
              </span>
            ))}
          </h1>

          <motion.p className="sp-hero-accent" {...rise(1.3)}>
            Reach the right <em>founders.</em>
          </motion.p>

          <motion.p className="sp-hero-lede" {...rise(1.5)}>
            Bring StartupNews.fyi on board as your sponsor or media partner, and put your event in
            front of the founders, investors and operators who read us to find out what&apos;s next.
          </motion.p>
        </div>

        <ul className="sp-hero-stats" aria-label="StartupNews.fyi reach">
          {STATS.map((stat, i) => (
            <HeroStat key={stat.label} stat={stat} index={i} progress={scrollYProgress} parallax={parallax} />
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
