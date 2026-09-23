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
  /** Date as [number, ordinal suffix, rest], e.g. ["6", "th", "Dec 2026"]. */
  date: [string, string, string];
  /** Who hosts that day, shown under the title — only Day 1 (Dubai Konnect) has one. */
  host?: string;
  /** Card title — may hold one "\n" (see ENS_DAY) for a forced second line. */
  title: string;
  /** Bullet points; `text` is the description after the bold lead, absent where the programme
   * lists the point on its own. */
  points: { lead: string; text?: string }[];
  /** Where the day happens, as a small tag under the points — only where the programme names one. */
  venue?: string;
  /** The programme's own strapline for the day, under the venue — only Day 1 has one. */
  tagline?: string;
  image: EnsImage;
}

/** The dates line under the section title: the delegation's first and last day (the "Itinerary" pill
 * before it was removed on request, 2026-09-18). */
const ITINERARY_DATES = "6 Dec 2026 – 11 Dec 2026";

/** Content from the six itinerary pages of the delegation programme PDF the team shared
 * ("Indian Startup Dubai Delegation"), re-dated to the December 2026 trip — the programme's day
 * order is unchanged, only the calendar dates moved. Wording is the PDF's, spelling tidied. */
/** "Expand North Star" over "Day N" — always two lines, no dash (on request, 2026-09-19). The newline is
 * honoured by `white-space: pre-line` on both the open title and the closed-card label. */
const ENS_DAY = (n: number, suffix?: string) => `Expand North Star\nDay\u00A0${n}${suffix ? ` ${suffix}` : ""}`;

/** The show-floor days (ENS Day 1 and Day 3) list the same five points; reworded on request
 * (2026-09-18) and cased for print (2026-09-19). */
const ENS_SHOW_DAY_POINTS = [
  { lead: "Participate as Exhibitor", text: "Showcase your products and services in an Exhibition Area." },
  { lead: "Participate as Delegate", text: "Join as a Delegate to explore and connect." },
  { lead: "Unmatched Networking", text: "Engage with Global Leaders, Investors, Mentors, and Founders." },
  { lead: "Massive Scale", text: "Over 2,050 Startups, 1,300 Investors, and more than a Lakh of Attendees." },
  { lead: "Top Tech Fest", text: "Experience the world's largest and most prominent Tech Event." },
];

/** One point, one source: shared by Day 3, Day 4 and Day 5 (2026-09-19) so all three read
 * identically rather than three copies that could quietly drift apart. */
const EXCLUSIVE_AFTER_PARTY_POINT = {
  lead: "Exclusive After Party",
  text: "End the day at the North Star After Party, exclusive to Exhibitors.",
};

/** Day 3 and Day 4 show the same four points (on request, 2026-09-19 — Day 4 originally listed the
 * show-floor points Day 2 lists, ending in the after party; now it matches Day 3 exactly instead). */
const ENS_NETWORKING_DAY_POINTS = [
  { lead: "Day-Long Networking", text: "Build meaningful, valuable connections to grow your business." },
  { lead: "Side Events", text: "Scores of Casual Startups/Tech Meetups to Connect with Global Founders and Investors." },
  { lead: "Additional Opportunities", text: "Network and collaborate in a relaxed, engaging setting." },
  EXCLUSIVE_AFTER_PARTY_POINT,
];

const DAYS: DelegationDay[] = [
  {
    key: "launchpad",
    day: "Day 1",
    date: ["6", "th", "Dec 2026"],
    host: "Dubai Konnect",
    title: "Launchpad Middle-East",
    points: [
      { lead: "Partner Presentation" },
      { lead: "Investor Introduction" },
      { lead: "Startup Introduction" },
      { lead: "One-on-One Session" },
      { lead: "Networking Followed by Dinner" },
    ],
    venue: "Venue: In5 Tech",
    tagline: "Investment, Business & Networking",
    image: ensImages.dayLaunchpad,
  },
  {
    key: "ens-day-1",
    day: "Day 2",
    date: ["7", "th", "Dec 2026"],
    title: ENS_DAY(1),
    points: ENS_SHOW_DAY_POINTS,
    image: ensImages.dayEnsOne,
  },
  {
    key: "ens-day-2",
    day: "Day 3",
    date: ["8", "th", "Dec 2026"],
    title: ENS_DAY(2),
    points: ENS_NETWORKING_DAY_POINTS,
    image: ensImages.dayEnsTwo,
  },
  {
    key: "ens-day-3",
    day: "Day 4",
    date: ["9", "th", "Dec 2026"],
    title: ENS_DAY(3),
    // Same four points as Day 3, not the show-floor list Day 2 uses (on request, 2026-09-19).
    points: ENS_NETWORKING_DAY_POINTS,
    image: ensImages.dayEnsThree,
  },
  {
    key: "ens-day-4",
    day: "Day 5",
    date: ["10", "th", "Dec 2026"],
    title: ENS_DAY(4, "and After Party"),
    points: [
      { lead: "Day-Long Networking", text: "Build meaningful, valuable connections to grow your business." },
      EXCLUSIVE_AFTER_PARTY_POINT,
      { lead: "Additional Opportunities", text: "Network and collaborate in a relaxed, engaging setting." },
    ],
    image: ensImages.dayEnsFour,
  },
  {
    key: "departure",
    day: "Day 6",
    date: ["11", "th", "Dec 2026"],
    title: "Checkout, Follow-Up, Roam Around Dubai, Fly Back to Base",
    points: [
      { lead: "Morning Hustle", text: "Begin the day with follow-up meetings, wrapping up key discussions." },
      { lead: "Explore Dubai", text: "Spend the day roaming around and soaking in Dubai's stunning skyline and vibrant atmosphere." },
      { lead: "Prepare to Depart", text: "Conclude the day and head to the airport for your late-evening flight." },
      { lead: "Fly Back Home", text: "Follow-Ups, Meetings, Back to Base." },
    ],
    image: ensImages.dayDeparture,
  },
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
 * Open: the photo shrinks into a ringed circle in the top-left corner and the date, pink title, host
 * line (Day 1 only) and points rise in one after another.
 *
 * Opens on mouse hover, on keyboard focus (Tab), and on tap for touch — tap again or tap elsewhere
 * to close. The last pointer type is remembered so a mouse click doesn't undo its own hover. */
function DayCard({ day, index }: { day: DelegationDay; index: number }) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const pointerType = useRef("mouse");
  // Reveal order: date 0, title 1, then the host line (Day 1 only) before the points.
  const base = day.host ? 3 : 2;

  return (
    <motion.li
      className="ens-days-item"
      initial={reducedMotion ? false : { opacity: 0, y: 64 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, delay: (index % 3) * 0.12, ease: EASE }}
    >
      <article
        className={"ens-day" + (open ? " is-open" : "")}
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
            // Wider than the card on purpose: the card is portrait (~0.72:1) and the photos are
            // landscape (~1.5:1), so `cover` fills it by height and draws the photo ~2x the card's
            // width. Asking for only the card's width made the browser upscale a 380px source.
            sizes="(max-width: 599px) 190vw, (max-width: 1023px) 95vw, 780px"
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
              <span className="ens-day-date-day">{day.day}</span>
              <span className="ens-day-date-when">
                {day.date[0]}
                <sup>{day.date[1]}</sup> {day.date[2]}
              </span>
            </p>
          </div>
          <h3 className="ens-day-title ens-day-reveal" style={{ "--i": 1 } as React.CSSProperties}>
            {day.title}
          </h3>
          {day.host && (
            <p className="ens-day-host ens-day-reveal" style={{ "--i": 2 } as React.CSSProperties}>
              {day.host}
            </p>
          )}
          <ul className="ens-day-points">
            {day.points.map((point, i) => (
              <li key={point.lead} className="ens-day-reveal" style={{ "--i": i + base } as React.CSSProperties}>
                {point.text ? (
                  <>
                    <strong>{point.lead}:</strong> {point.text}
                  </>
                ) : (
                  <strong>{point.lead}</strong>
                )}
              </li>
            ))}
          </ul>
          {(day.venue || day.tagline) && (
            <div className="ens-day-foot ens-day-reveal" style={{ "--i": day.points.length + base } as React.CSSProperties}>
              {day.venue && <span className="ens-day-venue">{day.venue}</span>}
              {day.tagline && <span className="ens-day-tagline">{day.tagline}</span>}
            </div>
          )}
        </div>
      </article>
    </motion.li>
  );
}

/** The delegation programme: the section title, an "Itinerary" heading carrying the trip's first
 * and last dates (no label), then six day cards, three per row, on a dark ground. */
export function DelegationDays() {
  const reducedMotion = useReducedMotion();
  return (
    <section id="ens-days" className="ens-days" aria-labelledby="ens-days-title">
      <span className="ens-blob ens-days-blob" aria-hidden="true" />
      <div className="ens-wrap">
        <RevealWords id="ens-days-title" className="ens-title" lines={[{ text: "Startup Delegation to Dubai" }]} />
        <motion.p
          className="ens-days-itinerary"
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
        >
          <span className="ens-days-itinerary-dates">{ITINERARY_DATES}</span>
        </motion.p>
        <ul className="ens-days-grid">
          {DAYS.map((day, i) => (
            <DayCard key={day.key} day={day} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
