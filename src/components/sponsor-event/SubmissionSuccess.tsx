"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { useReducedMotion } from "./hooks";
import type { SponsorEventFormController } from "./useSponsorEventForm";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Nodes the submitted event connects out to as the confirmation settles. Percentages of the
 * 100x100 viewBox; the centre sits at (50, 46). */
const SATELLITES = [
  { x: 15, y: 20 },
  { x: 85, y: 20 },
  { x: 6, y: 62 },
  { x: 94, y: 62 },
  { x: 32, y: 88 },
  { x: 68, y: 88 },
];
const CENTER = { x: 50, y: 46 };

function formatDate(value: string): string {
  if (!value) return "Your date";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** 15 — the confirmation. Rendered only once `ctrl.submitted` is true, which only happens after
 * the real POST to /api/events/sponsor-event has actually returned success (see
 * useSponsorEventForm's `submit()`). Nothing here is optimistic.
 *
 * Motion language: *the event joining the network*. The submitted event's own card rises first,
 * a check mark draws itself over it, then six connectors expand outward to satellite nodes with a
 * few slow particles drifting behind them — the page's opening ecosystem graph, closing. */
export function SubmissionSuccess({ ctrl }: { ctrl: SponsorEventFormController }) {
  const { data } = ctrl;
  const reducedMotion = useReducedMotion();

  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: EASE },
        };

  return (
    <div className="sp-success" role="status" aria-live="polite">
      <div className="sp-success-stage">
        <svg className="sp-success-net" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {SATELLITES.map((s, i) => (
            <motion.line
              key={i}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={s.x}
              y2={s.y}
              className="sp-success-net-line"
              vectorEffect="non-scaling-stroke"
              initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 + i * 0.08, ease: EASE }}
            />
          ))}
          {SATELLITES.map((s, i) => (
            <motion.circle
              key={`n${i}`}
              cx={s.x}
              cy={s.y}
              r={1.6}
              className="sp-success-net-node"
              initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.4 + i * 0.08 }}
            />
          ))}
        </svg>

        {!reducedMotion && (
          <div className="sp-success-motes" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={i}
                className="sp-success-mote"
                style={{ left: `${8 + i * 11}%` }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 0.7, 0], y: [-6, -54] }}
                transition={{ duration: 5 + (i % 4), delay: 1.6 + i * 0.35, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </div>
        )}

        <motion.div
          className="sp-success-card"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div
            className="sp-success-poster"
            style={data.posterUrl ? { backgroundImage: `url('${data.posterUrl}')` } : undefined}
          >
            {!data.posterUrl && <span>EVENT</span>}
          </div>
          <div className="sp-success-card-body">
            <p className="sp-success-card-kicker">StartupNews.fyi · Event</p>
            <p className="sp-success-card-title">{data.title || "Your event"}</p>
            <p className="sp-success-card-meta">
              {data.location || "Your location"} · {formatDate(data.date)}
            </p>
          </div>

          <motion.span
            className="sp-success-check"
            initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
          >
            <svg viewBox="0 0 52 52" aria-hidden="true">
              <motion.path
                d="M15 26.5 22.5 34 37 19"
                fill="none"
                stroke="currentColor"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.65, ease: "easeOut" }}
              />
            </svg>
          </motion.span>
        </motion.div>
      </div>

      <motion.p className="sp-success-stamp" {...rise(0.85)}>
        Submission received
      </motion.p>
      <motion.h2 className="sp-success-title" {...rise(0.95)}>
        Your event is now in review.
      </motion.h2>
      <motion.p className="sp-success-body" {...rise(1.05)}>
        Thanks for sharing {data.title ? `“${data.title}”` : "your event"}. Our team will review the
        details and take the next appropriate step — we&apos;ll be in touch at{" "}
        {data.contactEmail || "the email you shared"}.
      </motion.p>
      <motion.div className="sp-success-actions" {...rise(1.15)}>
        <Button variant="ghost" onClick={ctrl.reset}>
          Submit another event
        </Button>
      </motion.div>
    </div>
  );
}
