"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { CalendarIcon, PinIcon } from "./icons";
import { useReducedMotion } from "./hooks";
import type { SponsorEventFormController } from "./useSponsorEventForm";

const EASE = [0.22, 1, 0.36, 1] as const;

/** A few slow motes rising behind the check — deterministic so server and client agree. */
const MOTES = Array.from({ length: 14 }, (_, i) => ({
  left: 6 + ((i * 37) % 88),
  size: 3 + (i % 3),
  delay: 0.9 + (i % 7) * 0.28,
  duration: 4.2 + (i % 5) * 0.6,
  drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6),
}));

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** The confirmation. Rendered only once `ctrl.submitted` is true, which only happens after the real
 * POST to /api/events/sponsor-event has returned success (see useSponsorEventForm's `submit()`).
 * Nothing here is optimistic.
 *
 * Motion language: the check springs into the centre and draws itself, a few elegant motes drift
 * up behind it (no confetti), then the copy and the submitted event's own card rise into place. */
export function SubmissionSuccess({ ctrl }: { ctrl: SponsorEventFormController }) {
  const { data } = ctrl;
  const reducedMotion = useReducedMotion();
  const date = formatDate(data.date);

  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <div className="sp-success" role="status" aria-live="polite">
      <div className="sp-success-stage" aria-hidden="true">
        {!reducedMotion && (
          <div className="sp-success-motes">
            {MOTES.map((mote, i) => (
              <motion.span
                key={i}
                className="sp-success-mote"
                style={{ left: `${mote.left}%`, width: mote.size, height: mote.size }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: [0, 0.9, 0], y: [30, -110], x: [0, mote.drift] }}
                transition={{ duration: mote.duration, delay: mote.delay, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </div>
        )}
        <motion.span
          className="sp-success-halo"
          initial={reducedMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: EASE }}
        />
        <motion.span
          className="sp-success-check"
          initial={reducedMotion ? false : { scale: 0.3, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
        >
          <svg viewBox="0 0 52 52">
            <motion.path
              d="M15 26.5 22.5 34 37 19"
              fill="none"
              stroke="currentColor"
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
            />
          </svg>
        </motion.span>
      </div>

      <motion.p className="sp-success-stamp" {...rise(0.6)}>
        Submission received
      </motion.p>
      <motion.h2 className="sp-success-title" {...rise(0.7)}>
        You&apos;re on the map.
      </motion.h2>
      <motion.p className="sp-success-body" {...rise(0.8)}>
        Your event submission has been received. Our team will review the details and follow up with
        you at {data.contactEmail || "the email you shared"}.
      </motion.p>

      <motion.div className="sp-success-card" {...rise(0.95)}>
        <div
          className="sp-success-poster"
          style={data.posterUrl ? { backgroundImage: `url('${data.posterUrl}')` } : undefined}
        >
          {!data.posterUrl && <span>Event</span>}
        </div>
        <div className="sp-success-card-body">
          <p className="sp-success-card-kicker">StartupNews.fyi · Event partner</p>
          <p className="sp-success-card-title">{data.title || "Your event"}</p>
          <p className="sp-success-card-meta">
            {data.location && (
              <span>
                <PinIcon />
                {data.location}
              </span>
            )}
            {date && (
              <span>
                <CalendarIcon />
                {date}
              </span>
            )}
          </p>
        </div>
      </motion.div>

      <motion.div className="sp-success-actions" {...rise(1.1)}>
        <Button variant="ghost" onClick={ctrl.reset}>
          Submit another event
        </Button>
        {/* The homepage link is fine: the rule is only that the submission pages never link to EACH
            OTHER. */}
        <Link href="/" className="sp-success-link">
          Back to StartupNews.fyi
        </Link>
      </motion.div>
    </div>
  );
}
