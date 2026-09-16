"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { RevealWords } from "./RevealWords";
import { ensImages, type EnsImage } from "./media";
import { EASE, useReducedMotion } from "./hooks";

interface DelegationDay {
  key: string;
  /** Short label on the photo, e.g. "Day 2". */
  day: string;
  /** Date as [number, ordinal suffix, rest], e.g. ["11", "th", "February 2026"]; null while unknown. */
  date: [string, string, string] | null;
  title: string;
  points: { lead: string; text: string }[];
  image: EnsImage;
}

/** Content from the delegation programme PDF the team shared (Indian Startup Delegation to Dubai,
 * Feb'26). Only Day 2 and Day 3 have been supplied so far; the other four slots say so plainly
 * rather than inventing a programme — replace them here when their pages arrive. */
const DAYS: DelegationDay[] = [
  {
    key: "step-day-1",
    day: "Day 2",
    date: ["11", "th", "February 2026"],
    title: "STEP Dubai - Day 1",
    points: [
      { lead: "Exhibitor Space (POD)", text: "Showcase your products and services in a dedicated space." },
      { lead: "Delegate Participation", text: "Join as a delegate to explore and connect." },
      { lead: "Unmatched Networking", text: "Engage with global leaders, investors, mentors, and founders." },
      { lead: "Massive Scale", text: "Over 400 startups, 100's of investors, and 8,000+ attendees." },
      { lead: "Top Tech Fest", text: "Experience the most prominent tech event." },
    ],
    image: ensImages.dayStepOne,
  },
  {
    key: "step-day-2",
    day: "Day 3",
    date: ["12", "th", "February 2026"],
    title: "STEP Dubai - Day 2",
    points: [
      { lead: "Day-Long Networking", text: "Build meaningful, valuable connections to grow your business." },
      { lead: "Evening Side Events", text: "Evening casual startup/tech meetups to connect with global founders and investors." },
      { lead: "Additional Opportunities", text: "Network and collaborate in a relaxed, engaging setting." },
    ],
    image: ensImages.dayStepTwo,
  },
  ...[ensImages.daySoonA, ensImages.daySoonB, ensImages.daySoonC, ensImages.daySoonD].map((image, i) => ({
    key: `coming-soon-${i}`,
    day: "Coming soon",
    date: null,
    title: "To be announced",
    points: [],
    image,
  })),
];

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** One programme day.
 *
 * Closed: the photo fills the card with the day and title over a dark fade and a pink "+".
 * Open: the photo shrinks into a ringed circle in the top-left corner and the date, pink title and
 * points rise in one after another.
 *
 * Opens on mouse hover, on keyboard focus (Tab), and on tap for touch — tap again or tap elsewhere
 * to close. The last pointer type is remembered so a mouse click doesn't undo its own hover. */
function DayCard({ day, index }: { day: DelegationDay; index: number }) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const pointerType = useRef("mouse");

  return (
    <motion.li
      className="ens-days-item"
      initial={reducedMotion ? false : { opacity: 0, y: 64 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, delay: (index % 3) * 0.12, ease: EASE }}
    >
      <article
        className={"ens-day" + (open ? " is-open" : "") + (day.date ? "" : " is-soon")}
        tabIndex={0}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onClick={() => {
          if (pointerType.current !== "mouse") setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className="ens-day-ring" aria-hidden="true" />
        <div className="ens-day-media">
          <Image
            src={day.image.src}
            alt={day.image.alt}
            fill
            sizes="(max-width: 599px) 92vw, (max-width: 1023px) 46vw, 380px"
            className="ens-day-img"
          />
        </div>

        <div className="ens-day-label" aria-hidden="true">
          <span>
            <span className="ens-day-label-day">{day.day}</span>
            <span className="ens-day-label-title">{day.title}</span>
          </span>
          <span className="ens-day-plus">
            <PlusIcon />
          </span>
        </div>

        <div className="ens-day-body">
          <div className="ens-day-head ens-day-reveal" style={{ "--i": 0 } as React.CSSProperties}>
            <p className="ens-day-date">
              {day.date ? (
                <>
                  {day.day}, {day.date[0]}
                  <sup>{day.date[1]}</sup> {day.date[2]}
                </>
              ) : (
                day.day
              )}
            </p>
          </div>
          <h3 className="ens-day-title ens-day-reveal" style={{ "--i": 1 } as React.CSSProperties}>
            {day.title}
          </h3>
          {day.points.length > 0 ? (
            <ul className="ens-day-points">
              {day.points.map((point, i) => (
                <li key={point.lead} className="ens-day-reveal" style={{ "--i": i + 2 } as React.CSSProperties}>
                  <strong>{point.lead}:</strong> {point.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ens-day-soon ens-day-reveal" style={{ "--i": 2 } as React.CSSProperties}>
              Details for this part of the programme will be shared soon.
            </p>
          )}
        </div>
      </article>
    </motion.li>
  );
}

/** The delegation programme as six day cards, three per row, on a dark ground. */
export function DelegationDays() {
  return (
    <section className="ens-days" aria-labelledby="ens-days-title">
      <span className="ens-blob ens-days-blob" aria-hidden="true" />
      <div className="ens-wrap">
        <RevealWords id="ens-days-title" className="ens-title" lines={[{ text: "Indian Startup Delegation to Dubai" }]} />
        <ul className="ens-days-grid">
          {DAYS.map((day, i) => (
            <DayCard key={day.key} day={day} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
