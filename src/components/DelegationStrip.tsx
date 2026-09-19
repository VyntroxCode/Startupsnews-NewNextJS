"use client";

import Link from "next/link";
import "./delegation-strip.css";

/** How many copies of the line sit in each of the two identical groups — enough to overfill the
 * widest screen, so the running loop never shows a gap. */
const COPIES = 6;

function Sparkle() {
  return (
    <svg className="sn-ds-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c.7 6.3 5 10.9 12 12-7 1.1-11.3 5.7-12 12-.7-6.3-5-10.9-12-12C7 10.9 11.3 6.3 12 0z" />
    </svg>
  );
}

function Group() {
  return (
    <div className="sn-ds-group">
      {Array.from({ length: COPIES }, (_, i) => (
        <span className="sn-ds-item" key={i}>
          {/* One span around the whole line, so the item's flex gap sits only between the line and
              the sparkle — bare text, <sup> and text would each become a flex item instead. */}
          <span className="sn-ds-text">
            12<sup>th</sup>&nbsp;Startup Delegation to Dubai
            <span className="sn-ds-dot">•</span>
            <span className="sn-ds-date">
              6<sup>th</sup>&nbsp;–&nbsp;11<sup>th</sup>&nbsp;Dec 2026
            </span>
          </span>
          <Sparkle />
        </span>
      ))}
    </div>
  );
}

/**
 * The announcement strip at the very top of the home page: the 12th Indian Startup Delegation to
 * Dubai, running left to right, with a standing "Participate Now" button into /expand-north-star.
 *
 * Styled from the Expand North Star palette (magenta ground, lime CTA, heavy uppercase) so the
 * strip and the page it leads to read as one piece — see expand-north-star.css.
 *
 * The motion is pure CSS: the track holds two identical groups and slides from -50% (one whole
 * group left) to 0, so the seam is never visible. It pauses on hover and stands still under
 * reduced motion. Screen readers get the line once, from the visually hidden copy; the moving
 * copies are hidden from them. The button sits outside the moving track so it is always clickable.
 */
export function DelegationStrip() {
  return (
    <div className="sn-ds" role="region" aria-label="Delegation announcement">
      <p className="sn-ds-sr">
        12th Startup Delegation to Dubai, 6th – 11th December 2026.
      </p>
      <div className="sn-ds-viewport">
        <div className="sn-ds-track" aria-hidden="true">
          <Group />
          <Group />
        </div>
      </div>
      <Link href="/expand-north-star" className="sn-ds-cta">
        Participate Now
      </Link>
    </div>
  );
}
