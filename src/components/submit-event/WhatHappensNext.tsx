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
}

export function WhatHappensNext({ activeIndex }: WhatHappensNextProps) {
  return (
    <div className="rail-box">
      <div className="ribbon">What happens next</div>
      <div className="steps-list">
        {STEPS.map((s, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          const badge = state === "done" ? s.badgeDone : state === "active" ? s.badgeActive : "";
          return (
            <div className="steps-item" data-state={state} key={s.title}>
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
