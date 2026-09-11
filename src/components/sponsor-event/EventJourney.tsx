"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";

/** The life of an event, in three acts. Describes the shape of the work rather than promising any
 * particular activity — what actually happens around a given event is agreed with the organiser. */
const PHASES = [
  {
    phase: "Before",
    tint: "a",
    beats: [
      { title: "Plan", body: "Work out what the event is really for, and who it needs in the room." },
      { title: "Announce", body: "Put it somewhere the right people will actually run into it." },
      { title: "Build Awareness", body: "Give the story enough runway to reach people before the date." },
    ],
  },
  {
    phase: "During",
    tint: "b",
    beats: [
      { title: "Connect", body: "The introductions people came for, made easier to make." },
      { title: "Engage", body: "Sessions, conversations and moments worth being there for." },
      { title: "Gather", body: "The community in one room, which is the whole point." },
    ],
  },
  {
    phase: "After",
    tint: "c",
    beats: [
      { title: "Amplify", body: "What happened, told properly, for the people who weren't there." },
      { title: "Share", body: "Give attendees something worth passing on." },
      { title: "Keep Going", body: "The conversations that outlive the day are the real outcome." },
    ],
  },
] as const;

/** 08 — the event's own arc. Motion language: *a progress line that fills with scroll*, with the
 * three phase columns and their beats landing behind it. The line is scroll-linked through a
 * spring rather than animated once on entry, so scrolling back up rewinds it. */
export function EventJourney() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 80%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section className="sp-journey" aria-labelledby="sp-journey-title">
      <div className="sp-wrap">
        <SectionHead
          kicker="Journey"
          tone="light"
          title={<span id="sp-journey-title">Visibility Starts Before The Doors Open.</span>}
          lede="An event isn't one day. It's the run-up, the room itself, and everything that carries on afterwards."
        />

        <div className="sp-journey-track" ref={trackRef}>
          <div className="sp-journey-rail" aria-hidden="true">
            <motion.span
              className="sp-journey-rail-fill"
              style={reducedMotion ? { scaleX: 1 } : { scaleX: fill }}
            />
          </div>

          <div className="sp-journey-cols">
            {PHASES.map((phase, pi) => (
              <div className="sp-journey-col" key={phase.phase} data-tint={phase.tint}>
                <motion.p
                  className="sp-journey-phase"
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: pi * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="sp-journey-dot" aria-hidden="true" />
                  {phase.phase}
                </motion.p>
                <ul className="sp-journey-beats">
                  {phase.beats.map((beat, bi) => (
                    <motion.li
                      key={beat.title}
                      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.45, delay: pi * 0.12 + bi * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3>{beat.title}</h3>
                      <p>{beat.body}</p>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
