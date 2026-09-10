"use client";

import { useCallback, useEffect, useRef } from "react";
import { SpotlightHero } from "./SpotlightHero";
import { ReachStrip } from "./ReachStrip";
import { SpotlightStory } from "./SpotlightStory";
import { WhatYouGet } from "./WhatYouGet";
import { PlatformEcosystem } from "./PlatformEcosystem";
import { ProcessTimeline } from "./ProcessTimeline";
import { FeatureShowcase } from "./FeatureShowcase";
import { WhyStartupNews } from "./WhyStartupNews";
import { SpotlightCta } from "./SpotlightCta";
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
 *   01 discover       word-by-word masked headline reveal
 *   02 exposure       benefit card stagger + hover
 *   03 ecosystem      dark again — SVG connectors drawing out to the real channels
 *   04 process        scroll-linked timeline rail
 *   05 feature        clip-path cover reveal + pointer tilt on a mock feature page
 *   06 credibility    alternating lateral rows against a sticky statement
 *   —  cta            pink gradient panel, drifting glow
 *   07 submit         the existing two-step wizard, unchanged, then the success state
 *
 * The form controller is owned here (not inside FormSection) so the page can scroll to the form
 * and so the wizard's state survives everything above it re-rendering. It is the same
 * `useFeatureStartupForm` / `useLeadForm` controller as before the redesign — same fields, same
 * validators, same step grouping, same submit path — none of which this page changes. */
export function FeatureStartupPage() {
  const ctrl = useFeatureStartupForm();
  const submittedRef = useRef(false);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
      <SpotlightHero onFeature={() => scrollTo("fys-form")} onHowItWorks={() => scrollTo("fys-process")} />
      <ReachStrip />
      <SpotlightStory />
      <WhatYouGet />
      <PlatformEcosystem />
      <ProcessTimeline />
      <FeatureShowcase />
      <WhyStartupNews />
      <SpotlightCta onFeature={() => scrollTo("fys-form")} />
      <FormSection ctrl={ctrl} />
    </div>
  );
}
