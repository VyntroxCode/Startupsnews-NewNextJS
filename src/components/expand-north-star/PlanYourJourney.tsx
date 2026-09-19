"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { JourneyForm } from "./JourneyForm";
import { JourneySuccess } from "./JourneySuccess";
import { RevealWords } from "./RevealWords";
import { EASE, useReducedMotion, useRise, useWideScreen } from "./hooks";
import { useJourneyForm } from "./useJourneyForm";

/** Slow-moving decoration for a light ground: a blurred pink orb, a fainter violet one, a dashed
 * ring, a thin curved line and three small dots. Everything is very low contrast and sits behind
 * the card — it exists to keep the section from reading as a blank white panel, not to be looked
 * at. All of it is transform/opacity only; CSS drives the loops (see the `.ens-journey-*` rules,
 * stopped wholesale by the reduced-motion block at the foot of the stylesheet) and scroll only
 * shifts two layers, on a desktop-width screen with motion allowed. */
function JourneyDecor({ slow, fast }: { slow?: MotionValue<string>; fast?: MotionValue<string> }) {
  return (
    <>
      <span className="ens-blob ens-journey-blob-a" aria-hidden="true" />
      <span className="ens-blob ens-journey-blob-b" aria-hidden="true" />
      <motion.span className="ens-journey-ring" aria-hidden="true" style={slow ? { y: slow } : undefined} />
      <svg className="ens-journey-curve" viewBox="0 0 600 220" fill="none" aria-hidden="true">
        <path d="M0 186C118 186 176 22 300 22s182 164 300 164" stroke="url(#ens-journey-curve-grad)" strokeWidth="1.2" />
        <defs>
          <linearGradient id="ens-journey-curve-grad" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E4157C" stopOpacity="0" />
            <stop offset="0.5" stopColor="#E4157C" stopOpacity="0.32" />
            <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <motion.span className="ens-journey-dot is-a" aria-hidden="true" style={fast ? { y: fast } : undefined} />
      <motion.span className="ens-journey-dot is-b" aria-hidden="true" style={slow ? { y: slow } : undefined} />
      <span className="ens-journey-dot is-c" aria-hidden="true" />
    </>
  );
}

/** "Ready to experience Expand North Star?" — the page's closing section, and the only place on it
 * that asks the reader for anything.
 *
 * The running order of the reveal is the reading order: eyebrow, then the headline's words out of
 * their masks, then the paragraph, then the card lifting into place, then the six fields 80ms
 * apart, then the button.
 *
 * The ground is deliberately LIGHT — warm off-white, charcoal type, a white card, pink kept to
 * accents: a form is the one place on this page a reader has to work, and it should read as paper,
 * not as a console. The partners logos sit directly above on the tint this one opens on, after the
 * participation-fee section fades into it, so the three read as one closing passage.
 *
 * The fields themselves are the site's own shared controls (see JourneyForm) — `promotedCities`
 * is the City dropdown's list of cities that have earned a slot, fetched server-side by the route
 * exactly as /feature-your-startup and /list-your-event fetch it, so the list is complete on first
 * paint with no endpoint and no loading state.
 *
 * Submission goes to /api/expand-north-star/travel-enquiry, which files it in the admin Sales
 * Tracker alongside every other lead the site collects. */
export function PlanYourJourney({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
  const form = useJourneyForm();
  const reducedMotion = useReducedMotion();
  const wide = useWideScreen();
  const rise = useRise();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const slow = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const fast = useTransform(scrollYProgress, [0, 1], ["22%", "-22%"]);
  const parallax = wide && !reducedMotion;

  return (
    <section id="ens-participate" className="ens-journey" aria-labelledby="ens-journey-title" ref={sectionRef}>
      <JourneyDecor slow={parallax ? slow : undefined} fast={parallax ? fast : undefined} />

      <div className="ens-wrap">
        <RevealWords
          id="ens-journey-title"
          className="ens-title is-oneline ens-journey-title"
          delay={0.1}
          inline
          lines={[{ text: "Ready to experience" }, { text: "Expand North Star?", className: "ens-journey-accent" }]}
        />

        <motion.p className="ens-lede ens-journey-lede" {...rise(0.3)}>
          Share a Few Details to Kick Start the Process
        </motion.p>

        <div className="ens-journey-stage">
          <motion.div
            className="ens-journey-panel"
            layout
            transition={{ duration: 0.5, ease: EASE }}
            initial={reducedMotion ? false : { opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
          >
            <AnimatePresence mode="wait">
              {form.submitted ? (
                <JourneySuccess key="success" name={form.data.name} />
              ) : (
                <JourneyForm key="form" form={form} promotedCities={promotedCities} />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
