"use client";

import { useCallback, useEffect, useRef } from "react";
import { PartnerHero } from "./PartnerHero";
import { EventEcosystem } from "./EventEcosystem";
import { EventScrollStory } from "./EventScrollStory";
import { EventAudience } from "./EventAudience";
import { EventJourney } from "./EventJourney";
import { PartnershipQualities } from "./PartnershipQualities";
import { EventEnergy } from "./EventEnergy";
import { SponsorFormSection } from "./SponsorFormSection";
import { useSponsorEventForm } from "./useSponsorEventForm";

/** Partner / Sponsor an Event — a long-form partnership story that ends in the submission form,
 * rather than a form with three benefit cards above it.
 *
 * Running order. Each section owns its own motion language on purpose, so the page never settles
 * into a single repeated reveal, and the backgrounds run dark → light → dark in three acts (the
 * setup, the offer, the ask) instead of alternating section by section:
 *
 *   hero          dark    masked line reveal + floating example ticket + background video
 *   ecosystem     light   SVG graph drawing itself, then a scroll-driven highlight
 *   story         light   self-advancing carousel, photographs sliding in from alternate sides
 *   audience      light   photo cards, staggered entrance, open on hover
 *   energy        image   full-bleed zoom with counter-drifting type
 *   qualities     light   a checklist ticking itself off
 *   journey       light   scroll-linked horizontal progress rail
 *   form          light   the existing wizard, untouched
 *   success               the event joining the network
 *
 * (Energy and journey swapped places on request — the photograph used to sit just before the form.
 * Partnership, discovery, showcase, benefits, process and cta were all removed in earlier passes.)
 *
 * Every photograph on the page comes from eventImages.ts and nowhere else, so swapping the
 * placeholder set for real StartupNews.fyi event photography is a one-file edit.
 *
 * The form controller is owned here so the page can scroll to the form and so the wizard's state
 * survives everything above it re-rendering. It is the same `useSponsorEventForm` as before the
 * redesign — same fields, same validators, same S3 poster upload, same Turnstile gate, same POST
 * to /api/events/sponsor-event. This redesign is the experience around that, never the mechanics. */
export function SponsorEventPage({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
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
    <div className="sp-page">
      <PartnerHero onExplore={() => scrollTo("sp-story-start")} />
      <div id="sp-story-start">
        <EventEcosystem />
      </div>
      <EventScrollStory />
      <EventAudience />
      {/* Energy and Journey swapped places on request: the full-bleed photograph now breaks the
          page straight after the audience cards, and the journey leads into the form. */}
      <EventEnergy />
      <PartnershipQualities />
      <EventJourney />
      <SponsorFormSection ctrl={ctrl} promotedCities={promotedCities} />
    </div>
  );
}
