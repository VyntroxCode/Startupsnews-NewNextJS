"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { BackgroundVideo } from "@/components/feature-startup/BackgroundVideo";
import { sponsorEventBackgrounds } from "./backgrounds";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

const HEADLINE = ["Bring Your Event", "To The Startup", "Ecosystem."];

/** The audience chips floating around the example event card. */
const CROWD = ["Founders", "Investors", "Builders", "Communities"];

/** 01 — the first viewport. Full-bleed event footage, the headline revealed line by line from
 * behind its own mask, and an example event card floating over the clip.
 *
 * Motion language: *masked line reveal + staggered entrance*, then a slow parallax as the reader
 * scrolls out. Nothing here repeats lower down the page.
 *
 * The card is explicitly labelled an example — it is a layout demonstration, not a real
 * StartupNews.fyi event, and nothing on it should be readable as one. */
/** The "Partner with us" eyebrow and the two CTA buttons under the lede were removed on request,
 * and `onPartner` with them — nothing in the hero jumps to the form any more. `onExplore` stays:
 * it is what the "Scroll To Explore" cue at the bottom of the hero calls, and that was not part of
 * the removal. */
export function PartnerHero({ onExplore }: { onExplore: () => void }) {
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
        {/* The still that used to sit here was replaced by footage on request — same treatment as
            /feature-your-startup, same component, so the two heroes behave identically. `preload`
            is "auto" because this one is on screen at load. */}
        <BackgroundVideo
          video={sponsorEventBackgrounds.hero}
          className="sp-hero-video"
          scrimClassName="sp-hero-scrim"
          preload="auto"
        />
        <span className="sp-hero-glow" />
      </div>

      <motion.div
        className="sp-hero-inner"
        style={reducedMotion ? undefined : { y: contentY, opacity: contentFade }}
      >
        <div className="sp-hero-copy">
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
                <span className="sp-ticket-value">Your Date</span>
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
        <span className="sp-scroll-cue-text">Scroll To Explore</span>
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
