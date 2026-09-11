"use client";

import { useReducedMotion } from "./hooks";

const ROUNDS = [
  "Pre-Seed",
  "Seed",
  "Pre-Series A",
  "Series A",
  "Series B",
  "Series C+",
  "Venture Debt",
  "Strategic Investment",
  "Private Equity",
  "Grant / Government",
  "Bridge",
  "Angel",
];

/** The seam between the hero and the page — a slow marquee of round names, so the first thing
 * under the fold is the vocabulary of the thing being talked about.
 *
 * The track is rendered twice and translated by exactly half its width in CSS, which is what makes
 * the loop seamless; the duplicate is `aria-hidden` so a screen reader hears the list once. CSS
 * animation rather than Motion on purpose: it runs forever, and handing an infinite loop to the
 * compositor via a stylesheet keeps it off the main thread and lets the page's global
 * reduced-motion rule stop it without this component knowing anything about it. */
export function RoundMarquee() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={"fr-marquee" + (reducedMotion ? " is-static" : "")} aria-label="Funding round types">
      <div className="fr-marquee-track">
        {[0, 1].map((copy) => (
          <ul className="fr-marquee-list" key={copy} aria-hidden={copy === 1 ? "true" : undefined}>
            {ROUNDS.map((round) => (
              <li key={round} className="fr-marquee-item">
                <span className="fr-marquee-dot" aria-hidden="true" />
                {round}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
