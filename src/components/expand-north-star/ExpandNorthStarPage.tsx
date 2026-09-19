"use client";

import "./expand-north-star.css";
import { MotionConfig } from "motion/react";
import { EnsDelegationTitle } from "./EnsDelegationTitle";
import { EnsNav } from "./EnsNav";
import { EnsHero } from "./EnsHero";
import { ShowNumbers } from "./ShowNumbers";
import { EnsPartners } from "./EnsPartners";
import { WhatsNew } from "./WhatsNew";
import { FoundersPass } from "./FoundersPass";
import { CoreThemes } from "./CoreThemes";
import { DelegationDays } from "./DelegationDays";
import { ParticipationFee } from "./ParticipationFee";
import { PlanYourJourney } from "./PlanYourJourney";

/** Expand North Star 2026 — the event page, built from the reference screenshots and in the same
 * motion family as /feature-your-startup, /submit-funding-round and /sponsor-event.
 *
 * Running order and ground:
 *
 *   delegation     white      sticky, full-width "Startup Delegation to Dubai" band
 *   nav            pink wash  sticky logo lockup + gold "Launchpad Middle East", reading-progress line
 *   hero           pink wash  two-weight pink headline, rounded video card
 *   show numbers   white      paragraph + 2025 figures counting up
 *   what's new     soft grey  four feature cards
 *   founder's pass white      offer copy, photo wiping open
 *   core themes    white      four colour cards, photos drifting at different depths
 *   delegation     dark       six day cards: photo shrinks to a circle, programme text rises in
 *   participation  white→tint fee headline + delegation and pod/booth deliverables cards
 *   partners       tint       this event's referral partners — its own fixed logo set, not /our-partners'
 *   journey        tint→off-white  the closing travel enquiry form, revealing field by field
 *
 * More sections are added as further reference screenshots arrive. Every clip, still and link
 * comes from media.ts. `MotionConfig reducedMotion="user"` backs up each component's own
 * reduced-motion path. No heading or step carries a running number. */
export function ExpandNorthStarPage({
  fontClassName,
  promotedCities,
}: {
  fontClassName?: string;
  /** Cities that have earned a dropdown slot, for the closing form's City field. */
  promotedCities?: Record<string, string[]>;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={"ens-page" + (fontClassName ? ` ${fontClassName}` : "")}>
        <EnsDelegationTitle />
        <EnsNav />
        <EnsHero />
        <ShowNumbers />
        <WhatsNew />
        <FoundersPass />
        <CoreThemes />
        <DelegationDays />
        <ParticipationFee />
        <EnsPartners />
        <PlanYourJourney promotedCities={promotedCities} />
      </div>
    </MotionConfig>
  );
}
