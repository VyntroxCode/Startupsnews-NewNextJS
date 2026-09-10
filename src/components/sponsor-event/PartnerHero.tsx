"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ParallaxImage } from "./ParallaxImage";
import { eventImages } from "./eventImages";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

const HEADLINE = ["Bring your event", "to the startup", "ecosystem."];

/** The audience chips floating around the example event card. */
const CROWD = ["Founders", "Investors", "Builders", "Communities"];

/** 01 — the first viewport. A cinematic full-bleed event photograph, the headline revealed line by
 * line from behind its own mask, and an example event card floating over the image.
 *
 * Motion language: *masked line reveal + staggered entrance*, then a slow parallax as the reader
 * scrolls out. Nothing here repeats lower down the page.
 *
 * The card is explicitly labelled an example — it is a layout demonstration, not a real
 * StartupNews.fyi event, and nothing on it should be readable as one. */
export function PartnerHero({ onPartner, onExplore }: { onPartner: () => void; onExplore: () => void }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const contentFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const, animate: {} }
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        };

  return (
    <section className="sp-hero" ref={ref} aria-labelledby="sp-hero-title">
      <div className="sp-hero-bg" aria-hidden="true">
        <ParallaxImage image={eventImages.hero} strength={9} priority sizes="100vw" />
        <span className="sp-hero-scrim" />
        <span className="sp-hero-glow" />
      </div>

      <motion.div
        className="sp-hero-inner"
        style={reducedMotion ? undefined : { y: contentY, opacity: contentFade }}
      >
        <div className="sp-hero-copy">
          <motion.p className="sp-hero-eyebrow" {...rise(0.05)}>
            <span className="sp-hero-live" aria-hidden="true" />
            Partner with us
          </motion.p>

          <h1 id="sp-hero-title" className="sp-hero-title">
            {HEADLINE.map((line, i) => (
              <span className="sp-line" key={line}>
                <motion.span
                  className="sp-line-inner"
                  initial={reducedMotion ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.85, delay: 0.15 + i * 0.11, ease: EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p className="sp-hero-sub" {...rise(0.55)}>
            Partner with StartupNews.fyi to put your startup, technology, founder, investor or
            community event in front of a relevant and engaged startup audience.
          </motion.p>

          <motion.div className="sp-hero-ctas" {...rise(0.66)}>
            <button type="button" className="sp-btn sp-btn-primary" onClick={onPartner}>
              Partner With Us
              <span className="sp-btn-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="sp-btn sp-btn-ghost" onClick={onExplore}>
              Explore the Experience
            </button>
          </motion.div>
        </div>

        <div className="sp-hero-stage">
          <motion.div
            className="sp-ticket"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          >
            <div className="sp-ticket-top">
              <span className="sp-ticket-kind">Startup Event</span>
              <span className="sp-ticket-live">
                <i aria-hidden="true" />
                Live · Community
              </span>
            </div>
            <p className="sp-ticket-title">Your Event Name</p>
            <ul className="sp-ticket-tags">
              {CROWD.slice(0, 3).map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <div className="sp-ticket-rip" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="sp-ticket-meta">
              <div>
                <span className="sp-ticket-label">Where</span>
                <span className="sp-ticket-value">City · Country</span>
              </div>
              <div>
                <span className="sp-ticket-label">When</span>
                <span className="sp-ticket-value">Your date</span>
              </div>
            </div>
            <p className="sp-ticket-note">Example event — a layout preview, not a listing.</p>
          </motion.div>

          <ul className="sp-crowd" aria-hidden="true">
            {CROWD.map((who, i) => (
              <li
                key={who}
                className="sp-crowd-slot"
                style={{ "--sp-crowd-i": i } as React.CSSProperties}
              >
                <motion.span
                  className="sp-crowd-chip"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
                  animate={
                    reducedMotion
                      ? {}
                      : { opacity: 1, scale: 1, y: [0, i % 2 === 0 ? -8 : -6, 0] }
                  }
                  transition={
                    reducedMotion
                      ? undefined
                      : {
                          opacity: { duration: 0.5, delay: 0.9 + i * 0.09, ease: EASE },
                          scale: { duration: 0.5, delay: 0.9 + i * 0.09, ease: EASE },
                          y: { duration: 5 + i * 0.7, delay: 0.9 + i * 0.09, repeat: Infinity, ease: "easeInOut" },
                        }
                  }
                >
                  {who}
                </motion.span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      <motion.button
        type="button"
        className="sp-scroll-cue"
        onClick={onExplore}
        style={reducedMotion ? undefined : { opacity: contentFade }}
      >
        <span className="sp-scroll-cue-text">Scroll to explore</span>
        <span className="sp-scroll-cue-rail" aria-hidden="true">
          <motion.i
            animate={reducedMotion ? {} : { y: ["-100%", "320%"] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.button>
    </section>
  );
}
