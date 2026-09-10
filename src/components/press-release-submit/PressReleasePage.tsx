"use client";

import { useCallback, useEffect, useRef } from "react";
import { DM_Serif_Display } from "next/font/google";
import { useLeadForm } from "@/components/lead-forms/shared/useLeadForm";
import { PressHero } from "./PressHero";
import { EditorialTicker } from "./EditorialTicker";
import { PressStoryScroll } from "./PressStoryScroll";
import { StoryPrinciples } from "./StoryPrinciples";
import { EditorialDesk } from "./EditorialDesk";
import { BeforeYouSubmit } from "./BeforeYouSubmit";
import { PressKitSection } from "./PressKitSection";
import { EditorialProcess } from "./EditorialProcess";
import { EditorialPolicy } from "./EditorialPolicy";
import { NewsroomMoment } from "./NewsroomMoment";
import { StoryTransformation } from "./StoryTransformation";
import { DiscoverySurfaces } from "./DiscoverySurfaces";
import { PressCTA } from "./PressCTA";
import { PressSubmissionForm } from "./PressSubmissionForm";
import { ClosingQuote } from "./ClosingQuote";

/** Used only for the page's editorial headlines — never for body copy, labels or the form. Already
 * a dependency of this page before the redesign, so no new font is being introduced. */
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--pr-font-serif",
  display: "swap",
});

/** Submit Your Press Release — an editorial press-desk experience that teaches the reader what
 * makes a submission worth an editor's time, and only then asks for one.
 *
 * Running order (each section owns a different motion language on purpose, so the page never
 * settles into one repeated fade-up):
 *
 *   hero            2.5s opening choreography — masked headline, clip-path photo reveal, marker draw
 *   ticker          slow right→left marquee
 *   01 the story    THE signature: a pinned five-chapter scroll story, images cross-dissolving
 *   02 standards    one principle at a time, assembled part by part
 *   03 the desk     layered paper cards settling into a stack
 *   04 preparation  checkmarks drawing themselves
 *   05 materials    descending stack of press-kit layers beside a parallaxing photo
 *   06 process      scroll-linked timeline rail
 *   07 policy       "reviewed, not automatically published" — the credibility section
 *   08 moment       full-bleed cinematic pause, image zooming against a shifting veil
 *   09 example      one announcement written twice, the second dealt out row by row
 *   10 discovery    six small cards for where a story can travel
 *   11 cta          white editorial card on gray
 *   12 form         the three-step submission, then the confirmation
 *   —  closing      a full stop before the site footer
 *
 * The ticker now runs straight into the scroll story: the two sections that used to sit between
 * them — an editorial "brief" argument and a numbered index of what the desk accepts — were
 * removed, and everything below was renumbered to close the gap.
 *
 * The visual system is deliberately NOT the dark cinematic scroll of Funding Round or the dark
 * stage of Feature Your Startup: editorial gray ground, white paper surfaces, near-black type, and
 * the site's brand pink (#E62E69) used only as an accent — markers, rules, active states, the
 * CTA. See the SUBMIT YOUR PRESS RELEASE block in globals.css for the tokens.
 *
 * The form is the same front-end-only `useLeadForm("press-release")` controller as before, with
 * the same six fields and the same validators. `[[1], [2], []]` splits them across The Story and
 * The Source and gives the Review step an empty validation group of its own — Review adds no
 * fields, it reads back what the first two collected (see ReviewStep, which re-runs every
 * validator on submit anyway). There is no PDF field anywhere on this page. */
export function PressReleasePage() {
  const ctrl = useLeadForm("press-release", [[1], [2], []]);
  const submittedRef = useRef(false);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // The confirmation is much shorter than the form card it replaces, which can leave the reader
  // looking at whitespace where the fields were; bring it into view instead.
  useEffect(() => {
    if (ctrl.submitted && !submittedRef.current) {
      submittedRef.current = true;
      document.getElementById("pr-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (!ctrl.submitted) submittedRef.current = false;
  }, [ctrl.submitted]);

  return (
    <div className={`pr-page ${dmSerifDisplay.variable}`}>
      <PressHero onStart={() => scrollTo("pr-form")} onHowItWorks={() => scrollTo("pr-process")} />
      <EditorialTicker />
      <PressStoryScroll />
      <StoryPrinciples />
      <EditorialDesk />
      <BeforeYouSubmit />
      <PressKitSection />
      <EditorialProcess />
      <EditorialPolicy />
      <NewsroomMoment />
      <StoryTransformation />
      <DiscoverySurfaces />
      <PressCTA onStart={() => scrollTo("pr-form")} onHowItWorks={() => scrollTo("pr-process")} />
      <PressSubmissionForm ctrl={ctrl} />
      <ClosingQuote />
    </div>
  );
}
