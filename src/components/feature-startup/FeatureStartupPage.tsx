"use client";

import { useEffect, useRef } from "react";
import { SpotlightHero } from "./SpotlightHero";
import { ReachStrip } from "./ReachStrip";
import { SpotlightStory } from "./SpotlightStory";
import { PlatformEcosystem } from "./PlatformEcosystem";
import { ProcessTimeline } from "./ProcessTimeline";
import { FeatureShowcase } from "./FeatureShowcase";
import { WhyStartupNews } from "./WhyStartupNews";
import { FormSection } from "./FormSection";
import { useFeatureStartupForm } from "./useFeatureStartupForm";

/** Feature Your Startup — a scrolling story that ends in the submission form, rather than a form
 * with copy stacked under it.
 *
 * Running order (each section owns its own motion language on purpose, so the page never settles
 * into one repeated fade-up):
 *
 *   hero              dark stage, staggered entrance + slow orbit float
 *   reach strip       real published audience figures, count-up on the hero/light seam
 *   discover          word-by-word masked headline reveal
 *   ecosystem         dark again — SVG connectors drawing out to the real channels
 *   process           scroll-linked timeline rail
 *   feature           clip-path cover reveal + pointer tilt on a mock feature page
 *   credibility       alternating lateral rows against a sticky statement
 *   submit            the existing two-step wizard, unchanged, then the success state
 *
 * (Removed on request: the "exposure" benefits grid and the pink CTA panel that used to sit
 * between credibility and the form, and then the hero's own "Feature My Startup" / "See How It
 * Works" buttons. The section labels no longer carry numbers either — see SectionLabel — so
 * nothing here has to be renumbered when a section moves. With the hero buttons gone the page has
 * no in-page jump left at all: every section is reached by scrolling, which is why this component
 * no longer owns a `scrollTo` helper. The one remaining programmatic scroll is the success state
 * below, which is a response to submitting rather than a shortcut.)
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
      <PlatformEcosystem />
      <ProcessTimeline />
      <FeatureShowcase />
      <WhyStartupNews />
      <FormSection ctrl={ctrl} promotedCities={promotedCities} />
    </div>
  );
}
