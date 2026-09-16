"use client";

import { useEffect, useRef } from "react";
import { SpotlightHero } from "./SpotlightHero";
import { ReachStrip } from "./ReachStrip";
import { SpotlightStory } from "./SpotlightStory";
import { ProcessTimeline } from "./ProcessTimeline";
import { WhyStartupNews } from "./WhyStartupNews";
import { FormSection } from "./FormSection";
import { useFeatureStartupForm } from "./useFeatureStartupForm";

/** Feature Your Startup — a scrolling story that ends in the submission form, rather than a form
 * with copy stacked under it.
 *
 * Running order (each section owns its own motion language on purpose, so the page never settles
 * into one repeated fade-up):
 *
 *   hero              dark stage, staggered entrance, then the SVG connector graph over the
 *                     dotted-globe video (folded in from the old "ecosystem" section, see below)
 *   reach strip       real published audience figures, count-up on the hero/light seam
 *   discover          word-by-word masked headline reveal
 *   process           scroll-linked timeline rail
 *   credibility       alternating lateral rows against a sticky statement
 *   submit            the existing two-step wizard, unchanged, then the success state
 *
 * (Removed on request: the "exposure" benefits grid and the pink CTA panel that used to sit
 * between credibility and the form, and then the hero's own "Feature My Startup" / "See How It
 * Works" buttons. The section labels no longer carry numbers either — see SectionLabel — so
 * nothing here has to be renumbered when a section moves. With the hero buttons gone the page has
 * no in-page jump left at all: every section is reached by scrolling, which is why this component
 * no longer owns a `scrollTo` helper. The one remaining programmatic scroll is the success state
 * below, which is a response to submitting rather than a shortcut. The "feature" section — a mock
 * "Imagine your startup, featured" preview card — was removed on request too; its component,
 * FeatureShowcase.tsx, was deleted along with its .fys-showcase-* CSS since nothing else used it.
 * Then the standalone "ecosystem" section — its connector graph and dotted-globe background video —
 * was moved up into the hero on request, replacing the hero's own background clip; its component,
 * PlatformEcosystem.tsx, was deleted since the graph now appears only once, in the hero. See
 * SpotlightHero.tsx's doc comment for that move.)
 *
 * The form controller is owned here (not inside FormSection) so the page can scroll to the form
 * and so the wizard's state survives everything above it re-rendering. It is the same
 * `useFeatureStartupForm` / `useLeadForm` controller as before the redesign — same fields, same
 * validators, same step grouping, same submit path — none of which this page changes. */
export function FeatureStartupPage({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
  const ctrl = useFeatureStartupForm();
  const submittedRef = useRef(false);

  // The success state replaces a tall card with a much shorter one, which can leave the reader
  // staring at whitespace below it; bring the confirmation into view instead.
  useEffect(() => {
    if (ctrl.submitted && !submittedRef.current) {
      submittedRef.current = true;
      document.getElementById("fys-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (!ctrl.submitted) submittedRef.current = false;
  }, [ctrl.submitted]);

  return (
    <div className="fys-page">
      <SpotlightHero />
      <ReachStrip />
      <SpotlightStory />
      <ProcessTimeline />
      <WhyStartupNews />
      <FormSection ctrl={ctrl} promotedCities={promotedCities} />
    </div>
  );
}
