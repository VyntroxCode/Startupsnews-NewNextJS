"use client";

import { useCallback, useEffect, useRef } from "react";
import { Space_Grotesk } from "next/font/google";
import { PartnerHero } from "./PartnerHero";
import { EventEcosystem } from "./EventEcosystem";
import { EventScrollStory } from "./EventScrollStory";
import { EventAudience } from "./EventAudience";
import { PartnershipOpportunities } from "./PartnershipOpportunities";
import { DiscoveryChannels } from "./DiscoveryChannels";
import { EventShowcase } from "./EventShowcase";
import { EventJourney } from "./EventJourney";
import { PartnershipBenefits } from "./PartnershipBenefits";
import { PartnershipQualities } from "./PartnershipQualities";
import { EventEnergy } from "./EventEnergy";
import { PartnershipProcess } from "./PartnershipProcess";
import { EventCTA } from "./EventCTA";
import { SponsorFormSection } from "./SponsorFormSection";
import { useSponsorEventForm } from "./useSponsorEventForm";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--sp-font-display",
  display: "swap",
});

/** Partner / Sponsor an Event — a long-form partnership story that ends in the submission form,
 * rather than a form with three benefit cards above it.
 *
 * Running order. Each section owns its own motion language on purpose, so the page never settles
 * into a single repeated reveal, and the backgrounds run dark → light → dark in three acts (the
 * setup, the offer, the ask) instead of alternating section by section:
 *
 *   01 hero          dark    masked line reveal + floating example ticket + parallax
 *   02 ecosystem     dark    SVG graph drawing itself, then a scroll-driven highlight
 *   03 story         dark    STICKY scroll-driven image swapping — the signature interaction
 *   04 audience      light   staggered cards that open on hover
 *   05 partnership   light   cards flipping up on rotateX
 *   06 discovery     dark    branching connectors + example post mock-ups
 *   07 showcase      light   curtain wipe off the photo + pointer tilt
 *   08 journey       light   scroll-linked horizontal progress rail
 *   09 benefits      dark    rows wiping in from the left
 *   10 qualities     dark    a checklist ticking itself off
 *   11 energy        image   full-bleed zoom with counter-drifting type
 *   12 process       dark    scroll-linked vertical rail with activating nodes
 *   13 cta           image   parallax photograph behind the ask
 *   14 form          dark    the existing four-step wizard, untouched
 *   15 success       dark    the event joining the network
 *
 * Every photograph on the page comes from eventImages.ts and nowhere else, so swapping the
 * placeholder set for real StartupNews.fyi event photography is a one-file edit.
 *
 * The form controller is owned here so the page can scroll to the form and so the wizard's state
 * survives everything above it re-rendering. It is the same `useSponsorEventForm` as before the
 * redesign — same fields, same validators, same S3 poster upload, same Turnstile gate, same POST
 * to /api/events/sponsor-event. This redesign is the experience around that, never the mechanics. */
export function SponsorEventPage() {
  const ctrl = useSponsorEventForm();
  const announced = useRef(false);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // The success state replaces a tall wizard with a much shorter card, which can otherwise leave
  // the reader looking at whitespace where the form used to be.
  useEffect(() => {
    if (ctrl.submitted && !announced.current) {
      announced.current = true;
      document.getElementById("sp-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (!ctrl.submitted) announced.current = false;
  }, [ctrl.submitted]);

  return (
    <div className={`sp-page ${spaceGrotesk.variable}`}>
      <PartnerHero onPartner={() => scrollTo("sp-form")} onExplore={() => scrollTo("sp-story-start")} />
      <div id="sp-story-start">
        <EventEcosystem />
      </div>
      <EventScrollStory />
      <EventAudience />
      <PartnershipOpportunities />
      <DiscoveryChannels />
      <EventShowcase />
      <EventJourney />
      <PartnershipBenefits />
      <PartnershipQualities />
      <EventEnergy />
      <PartnershipProcess />
      <EventCTA onStart={() => scrollTo("sp-form")} onBack={() => scrollTo("sp-story-start")} />
      <SponsorFormSection ctrl={ctrl} />
    </div>
  );
}
