"use client";

import "./sponsor-event.css";
import { useCallback, useEffect, useRef } from "react";
import { MotionConfig } from "motion/react";
import { SponsorHero } from "./SponsorHero";
import { EventReel } from "./EventReel";
import { EventStory } from "./EventStory";
import { WhyPartner } from "./WhyPartner";
import { EcosystemNetwork } from "./EcosystemNetwork";
import { EventShowcase } from "./EventShowcase";
import { SubmissionJourney } from "./SubmissionJourney";
import { EventAmplification } from "./EventAmplification";
import { RoomBreak } from "./RoomBreak";
import { SponsorFormSection } from "./SponsorFormSection";
import { useSponsorEventForm } from "./useSponsorEventForm";
import { useReducedMotion } from "./hooks";

/** Partner / Sponsor an Event — a cinematic partnership story, written for organisers and brands
 * who want StartupNews.fyi on board, that ends in the submission form.
 *
 * Running order and ground:
 *
 *   hero            video   headline word by word, curtain lift, floating reach cards, pointer glow
 *   reel            light   rounded video card resolving into focus
 *   story           white   Discover / Connect / Amplify beats, alternating sides
 *   why partner     light   four expanding panels (Community runs on its own clip)
 *   network         dark    scroll-built ecosystem graph with travelling particles — signature
 *   showcase        white   pinned horizontal gallery driven by vertical scroll (desktop)
 *   journey         white   scroll-filled timeline + an example card that updates per step
 *   amplification   light   channel cards scattering out of the event listing on scroll
 *   room break      video   huge counter-sliding type, then the one CTA left on the page
 *   form            light   the existing 3-step wizard with a progress indicator, then success
 *
 * Removed on request (2026-09-15): the hero's "Partner with StartupNews.fyi" eyebrow and its two
 * buttons, the reel's play/pause button and formats marquee, and the whole "How you can partner"
 * section (PartnershipOptions.tsx, its handshake clip and styles). No visible copy on the page uses
 * an em dash, and no heading or step carries a number.
 *
 * Every clip comes from backgrounds.ts and every still from eventImages.ts. `MotionConfig
 * reducedMotion="user"` backs up the per-component reduced-motion paths.
 *
 * The form controller is owned here so the room-break CTA can scroll to the form and so the
 * wizard's state survives everything above it re-rendering. It is the same `useSponsorEventForm`
 * as before — same fields, validators, S3 poster upload, Turnstile gate and POST to
 * /api/events/sponsor-event. */
export function SponsorEventPage({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
  const ctrl = useSponsorEventForm();
  const reducedMotion = useReducedMotion();
  const announced = useRef(false);

  const startSubmission = useCallback(() => {
    document
      .getElementById("sp-form")
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [reducedMotion]);

  // The success state replaces a tall wizard with a much shorter card, which could otherwise leave
  // the reader looking at whitespace where the form used to be.
  useEffect(() => {
    if (ctrl.submitted && !announced.current) {
      announced.current = true;
      document.getElementById("sp-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!ctrl.submitted) announced.current = false;
  }, [ctrl.submitted]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="sp-page">
        <SponsorHero />
        <EventReel />
        <EventStory />
        <WhyPartner />
        <EcosystemNetwork />
        <EventShowcase />
        <SubmissionJourney />
        <EventAmplification />
        <RoomBreak onStart={startSubmission} />
        <SponsorFormSection ctrl={ctrl} promotedCities={promotedCities} />
      </div>
    </MotionConfig>
  );
}
