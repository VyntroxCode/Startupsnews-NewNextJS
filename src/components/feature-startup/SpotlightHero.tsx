"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  InstagramIcon,
  LinkedInIcon,
  NewsletterIcon,
  SiteIcon,
  WhatsAppIcon,
  XIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";
import { featureStartupBackgrounds } from "./backgrounds";
import { BackgroundVideo } from "./BackgroundVideo";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The floating cards ringing the central feature card. `x`/`y` are percentage positions inside
 * the stage (desktop only — under 900px CSS drops the absolute positioning and lays them out as a
 * chip row, see .fys-orbit-card in globals.css), `drift` is the vertical float distance and
 * `float` its period, varied per card so the ring never pulses in unison.
 *
 * Each card is centred on its `x` by a translate, so its half-width has to clear the feature card
 * behind it on BOTH sides: that card is 460px wide in a 1120px stage, i.e. it occupies 29.5%–70.5%,
 * and the widest chip ("StartupNews.fyi") is roughly 215px, i.e. ±9.6% of the stage. So the usable
 * band for a chip centre is about 11%–88% — further out and the chip hangs off the stage, further
 * in and it slides under the card, which just reads as a layout bug. The right-hand three sit a
 * little further out than the left: the stage keeps shrinking below its max-width down to 900px
 * while the chips hold their pixel width, and that is where the margin gets thin. */
const ORBIT = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, x: 12, y: 13, drift: -9, float: 5.4, delay: 0.35 },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon, x: 81, y: 9, drift: -7, float: 6.2, delay: 0.42 },
  { key: "x", label: "X / Twitter", Icon: XIcon, x: 87, y: 46, drift: -8, float: 4.8, delay: 0.49 },
  { key: "newsletter", label: "Newsletter", Icon: NewsletterIcon, x: 83, y: 82, drift: -6, float: 5.9, delay: 0.56 },
  { key: "whatsapp", label: "Communities", Icon: WhatsAppIcon, x: 15, y: 79, drift: -8, float: 6.6, delay: 0.63 },
  { key: "site", label: "StartupNews.fyi", Icon: SiteIcon, x: 12, y: 46, drift: -6, float: 5.1, delay: 0.7 },
] as const;

/** Icons shown inside the example feature card's "featured on" strip. */
const CARD_CHANNELS = [InstagramIcon, LinkedInIcon, XIcon, NewsletterIcon, SiteIcon];

/** Section 01 — the first viewport. A dark, glowing stage that states what the page is for and
 * shows (rather than describes) the idea: one startup card at the centre, the channels it can be
 * shaped for floating around it. The submission form is deliberately far below; this section only
 * has to earn the next scroll.
 *
 * Motion language here is *stagger + scale + float*, distinct from every section under it: the
 * headline, sub and card enter on one staggered timeline, then the orbit cards settle into a slow,
 * tiny, permanent drift. A scroll-linked parallax lifts the whole composition and fades it as the
 * next section arrives so the hero dissolves into the page rather than cutting.
 *
 * The "Feature My Startup" / "See How It Works" buttons that sat under the lede were removed on
 * request, along with the `onFeature`/`onHowItWorks` props they called and the whole `.fys-btn`
 * family in globals.css, which nothing else used. The hero no longer links anywhere: the reader
 * reaches the form by scrolling the page, which is the order the sections were written in. The
 * 0.24 slot they held in the entrance ladder is simply left out — the gap between the lede at 0.16
 * and the card at 0.3 is too short to read as a pause. */
export function SpotlightHero() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const enter = (delay: number) =>
    reducedMotion
      ? { initial: false as const, animate: {} }
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <section className="fys-hero" ref={sectionRef} aria-labelledby="fys-hero-title">
      <div className="fys-hero-bg" aria-hidden="true">
        {/* Footage first, scrim over it, then the glows and grid — so the brand light sources
            tint the picture rather than being flattened under it. */}
        <BackgroundVideo
          video={featureStartupBackgrounds.hero}
          className="fys-hero-photo"
          scrimClassName="fys-hero-scrim"
          preload="auto"
        />
        <motion.span
          className="fys-hero-glow fys-hero-glow-a"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.span
          className="fys-hero-glow fys-hero-glow-b"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
        />
        <span className="fys-hero-grain" />
        <span className="fys-hero-grid" />
      </div>

      <motion.div className="fys-hero-inner" style={reducedMotion ? undefined : { y: parallaxY, opacity: fade }}>
        <motion.h1 id="fys-hero-title" className="fys-hero-title" {...enter(0.06)}>
          Put Your Startup
          <br />
          in the{" "}
          {/* "Spotlight." travels in from the right — the one word on the page that gets its own
              move, which is the point of it. It STARTS inside the h1's own entrance (delay 0.2,
              against the line's 0.6s) and then keeps going for a beat after the line has settled:
              starting late would leave a visible hole where the word belongs, but finishing late
              is the whole effect. Slowed from 0.42s on request — 0.42 read as a snap rather than
              as travel.
              `x` in px rather than a percentage: a percentage of the em's own width would start
              the word from a different place at every headline reflow.
              Under reduced motion it simply appears with the rest of the line. */}
          <motion.em
            initial={reducedMotion ? false : { opacity: 0, x: 190 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.95, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Spotlight.
          </motion.em>
        </motion.h1>

        <motion.p className="fys-hero-sub" {...enter(0.16)}>
          Showcase your startup to founders, investors, builders, media, and the wider startup
          ecosystem through StartupNews.fyi.
        </motion.p>

        <div className="fys-stage">
          {/* Centre: an illustrative feature card, not a real published startup.
              The wrapper carries the centering transform so Motion's scale below can own
              `transform` outright — the two cannot share one element. */}
          <div className="fys-stage-center">
          <motion.div
            className="fys-stage-card"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          >
            <p className="fys-stage-card-kicker">Featured Startup</p>
            <div className="fys-stage-card-head">
              <span className="fys-stage-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.2c2.6 1.7 4.1 4.6 4.1 8 0 1.9-.5 3.6-1.4 5.1h-5.4c-.9-1.5-1.4-3.2-1.4-5.1 0-3.4 1.5-6.3 4.1-8z" />
                  <circle cx="12" cy="10.6" r="1.8" />
                  <path d="M9.6 19.4h4.8" />
                </svg>
              </span>
              <div>
                <p className="fys-stage-card-name">Your Startup</p>
                <p className="fys-stage-card-meta">Category · City · Founded</p>
              </div>
            </div>
            <p className="fys-stage-card-line">“Building the future of ————.”</p>
            <div className="fys-stage-card-foot">
              <span className="fys-stage-card-foot-label">Ready for</span>
              <span className="fys-stage-card-icons">
                {CARD_CHANNELS.map((Icon, i) => (
                  <motion.i
                    key={i}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: 0.62 + i * 0.06, ease: EASE }}
                  >
                    <Icon />
                  </motion.i>
                ))}
              </span>
            </div>
          </motion.div>
          </div>

          <ul className="fys-orbit">
            {ORBIT.map((item) => (
              <li
                key={item.key}
                className="fys-orbit-slot"
                style={{ "--fys-orbit-x": `${item.x}%`, "--fys-orbit-y": `${item.y}%` } as React.CSSProperties}
              >
                <motion.span
                  className="fys-orbit-card"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.82, y: 14 }}
                  animate={reducedMotion ? {} : { opacity: 1, scale: 1, y: [0, item.drift, 0] }}
                  transition={
                    reducedMotion
                      ? undefined
                      : {
                          opacity: { duration: 0.5, delay: item.delay, ease: EASE },
                          scale: { duration: 0.5, delay: item.delay, ease: EASE },
                          y: { duration: item.float, delay: item.delay, repeat: Infinity, ease: "easeInOut" },
                        }
                  }
                >
                  <item.Icon className="fys-orbit-icon" />
                  <span>{item.label}</span>
                </motion.span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      <div className="fys-hero-seam" aria-hidden="true" />
    </section>
  );
}
