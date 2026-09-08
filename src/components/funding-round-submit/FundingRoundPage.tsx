"use client";

import { useLeadForm } from "@/components/lead-forms/shared/useLeadForm";
import { FundingIntro } from "./FundingIntro";
import { WhySubmit } from "./WhySubmit";
import { ProcessTimeline } from "./ProcessTimeline";
import { HeroFan } from "./HeroFan";
import { StepFormCard } from "./StepFormCard";

/** A full landing page ahead of the "fanned card stepper" form (gradient hero with a floating
 * rocket icon, flanked by tilted "done"/"locked" step cards, real fields in a plain upright card
 * below). Structurally borrows Advertise With Us's shape — a word-mask hero, a benefits section,
 * a process section, then the conversion point — but each section uses its own animation
 * technique (word-reveal mask + marquee, cursor-tilt cards, a self-drawing SVG line) rather than
 * that page's IntersectionObserver fade/slide-in and manual count-up. Still the third distinct
 * design in this site's 3-page lead-capture set (split-screen photo panel on Feature Your
 * Startup, newsroom masthead + inset photo on Press Release). */
export function FundingRoundPage() {
  const ctrl = useLeadForm("funding-round");
  return (
    <div className="fr-page">
      <FundingIntro />
      <div className="fr-page-wrap">
        <WhySubmit />
        <ProcessTimeline />
        <div id="fr-form" className="fr-form-anchor">
          <HeroFan currentStep={ctrl.currentStep} />
          <StepFormCard ctrl={ctrl} />
        </div>
      </div>
    </div>
  );
}
