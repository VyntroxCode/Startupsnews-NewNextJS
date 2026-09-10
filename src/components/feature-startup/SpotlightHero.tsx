"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  InstagramIcon,
  LinkedInIcon,
  NewsletterIcon,
  SiteIcon,
  WhatsAppIcon,
  XIcon,
} from "./icons";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The floating cards ringing the central feature card. `x`/`y` are percentage positions inside
 * the stage (desktop only — under 900px CSS drops the absolute positioning and lays them out as a
 * chip row, see .fys-orbit-card in globals.css), `drift` is the vertical float distance and
 * `float` its period, varied per card so the ring never pulses in unison.
 *
 * Each card is centred on its `x` by a translate, so its half-width has to clear the feature card
 * behind it: that card is 340px wide in an 880px stage, i.e. it occupies 31%–69%. Anything past
 * roughly 76% (or short of 24%) keeps a whole chip outside it — the ring is meant to frame the
 * card, and a chip sliding under it just reads as a layout bug. */
const ORBIT = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, x: 8, y: 14, drift: -9, float: 5.4, delay: 0.35 },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon, x: 80, y: 9, drift: -7, float: 6.2, delay: 0.42 },
  { key: "x", label: "X / Twitter", Icon: XIcon, x: 89, y: 46, drift: -8, float: 4.8, delay: 0.49 },
  { key: "newsletter", label: "Newsletter", Icon: NewsletterIcon, x: 82, y: 81, drift: -6, float: 5.9, delay: 0.56 },
  { key: "whatsapp", label: "Communities", Icon: WhatsAppIcon, x: 13, y: 77, drift: -8, float: 6.6, delay: 0.63 },
  { key: "site", label: "StartupNews.fyi", Icon: SiteIcon, x: 7, y: 46, drift: -6, float: 5.1, delay: 0.7 },
] as const;

/** Icons shown inside the example feature card's "featured on" strip. */
const CARD_CHANNELS = [InstagramIcon, LinkedInIcon, XIcon, NewsletterIcon, SiteIcon];

/** Section 01 — the first viewport. A dark, glowing stage that states what the page is for and
 * shows (rather than describes) the idea: one startup card at the centre, the channels it can be
 * shaped for floating around it. The submission form is deliberately far below; this section only
 * has to earn the next scroll.
 *
 * Motion language here is *stagger + scale + float*, distinct from every section under it: the
 * headline, sub, buttons and card enter on one staggered timeline, then the orbit cards settle
 * into a slow, tiny, permanent drift. A scroll-linked parallax lifts the whole composition and
 * fades it as the next section arrives so the hero dissolves into the page rather than cutting. */
export function SpotlightHero({ onFeature, onHowItWorks }: { onFeature: () => void; onHowItWorks: () => void }) {
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
        <motion.p className="fys-hero-eyebrow" {...enter(0)}>
          <span className="fys-hero-dot" aria-hidden="true" />
          StartupNews.fyi · Feature Your Startup
        </motion.p>

        <motion.h1 id="fys-hero-title" className="fys-hero-title" {...enter(0.06)}>
          Put Your Startup
          <br />
          in the <em>Spotlight.</em>
        </motion.h1>

        <motion.p className="fys-hero-sub" {...enter(0.16)}>
          Showcase your startup to founders, investors, builders, media, and the wider startup
          ecosystem through StartupNews.fyi.
        </motion.p>

        <motion.div className="fys-hero-actions" {...enter(0.24)}>
          <button type="button" className="fys-btn fys-btn-primary" onClick={onFeature}>
            Feature My Startup
            <ArrowRightIcon className="fys-btn-icon" />
          </button>
          <button type="button" className="fys-btn fys-btn-outline" onClick={onHowItWorks}>
            See How It Works
          </button>
        </motion.div>

        <div className="fys-stage">
          {/* Centre: an illustrative feature card, not a real published startup — see the caption.
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

        <p className="fys-stage-note">Example of how a feature can be presented — not a published post.</p>
      </motion.div>

      <motion.button
        type="button"
        className="fys-scroll-hint"
        onClick={onHowItWorks}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <span>Scroll to explore</span>
        <motion.span
          className="fys-scroll-arrow"
          animate={reducedMotion ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDownIcon />
        </motion.span>
      </motion.button>

      <div className="fys-hero-seam" aria-hidden="true" />
    </section>
  );
}
