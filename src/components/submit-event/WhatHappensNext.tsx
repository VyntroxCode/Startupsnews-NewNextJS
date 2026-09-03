"use client";

const STEPS = [
  {
    title: "You submit",
    body: "Fill in your event details and images — takes a couple of minutes.",
    badgeActive: "In progress",
    badgeDone: "Submitted",
  },
  {
    title: "We review",
    body: "Our team checks the listing and formats it for the site.",
    badgeActive: "Under review",
    badgeDone: "Reviewed",
  },
  {
    title: "It goes live",
    body: "Your event appears on the StartupNews.fyi Events page, and we email you once it's published.",
    badgeActive: "Publishing",
    badgeDone: "Live",
  },
];

interface WhatHappensNextProps {
  activeIndex: number;
  /**
   * How far through the ACTIVE stage the user is, 0–1. On the submit form this is the wizard's
   * own progress, so the line creeps forward with every step completed instead of sitting frozen
   * at "You submit" until the whole form is sent.
   */
  stageProgress?: number;
}

export function WhatHappensNext({ activeIndex, stageProgress = 0 }: WhatHappensNextProps) {
  const lastIndex = STEPS.length - 1;
  const within = Math.min(Math.max(stageProgress, 0), 1);
  // The track runs from the centre of the first dot to the centre of the last, so a stage's
  // position IS its share of the track: stage 0 at 0%, stage 1 at 50%, stage 2 at 100%. The fill
  // is the active stage's position plus however far along it is toward the next one.
  const fillPercent = Math.min(((activeIndex + within) / lastIndex) * 100, 100);

  return (
    <div className="whn-strip">
      <div className="ribbon">What happens next</div>
      <div className="whn-items">
        <div className="whn-track" aria-hidden="true">
          <div className="whn-track-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        {STEPS.map((s, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          const badge = state === "done" ? s.badgeDone : state === "active" ? s.badgeActive : "";
          return (
            <div className="whn-item" data-state={state} key={s.title}>
              <span className="step-dot"></span>
              <div className="step-title">
                {s.title}
                {badge ? <span className="step-badge">{badge}</span> : null}
              </div>
              <div className="step-body">{s.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
