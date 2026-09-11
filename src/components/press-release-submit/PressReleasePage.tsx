"use client";

import { useEffect, useRef } from "react";
import { useLeadForm } from "@/components/lead-forms/shared/useLeadForm";
import { PressHero } from "./PressHero";
import { EditorialTicker } from "./EditorialTicker";
import { StoryPrinciples } from "./StoryPrinciples";
import { EditorialDesk } from "./EditorialDesk";
import { EditorialProcess } from "./EditorialProcess";
import { NewsroomMoment } from "./NewsroomMoment";
import { PressSubmissionForm } from "./PressSubmissionForm";
import { ClosingQuote } from "./ClosingQuote";

/** Submit Your Press Release — an editorial press-desk experience that teaches the reader what
 * makes a submission worth an editor's time, and only then asks for one.
 *
 * Running order (each section owns a different motion language on purpose, so the page never
 * settles into one repeated fade-up):
 *
 *   hero        2.5s opening choreography — masked headline, clip-path photo reveal, marker draw
 *   ticker      slow right→left marquee
 *   standards   principles alternating left and right, each assembled part by part, the
 *               photograph in each row travelling in from the edge it sits on
 *   moment      full-bleed cinematic pause, image zooming against a shifting veil
 *   the desk    layered paper cards settling into a stack
 *   process     scroll-linked timeline rail
 *   form        the three-step submission, then the confirmation
 *   closing     a full stop before the site footer
 *
 * Nine sections have been removed at the client's request since the redesign landed: an editorial
 * "brief" argument, a numbered index of what the desk accepts, the pinned five-chapter scroll
 * story that was the page's signature interaction, a "before you submit" checklist, and then the
 * materials, policy, example, discovery and pre-form CTA sections in one pass. Each removal used
 * to mean renumbering everything below it to close the gap; the RUNNING-ORDER NUMBERING itself is
 * gone now, which is why the list above is unnumbered and why nothing has to be renumbered again.
 *
 * The moment was moved ABOVE the desk on request. It reads better there than it did between the
 * policy and example sections it used to separate: the standards section ends on the fifth of five
 * questions, and a full-bleed pause is a better thing to land on after that than another block of
 * cards — it now sets up the desk rather than interrupting a run of text sections.
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
/** The country-code select opens on India, as /list-your-event's and the other two lead forms do —
 * an unset code reads as one more thing to fill in. */
const PRESS_RELEASE_INITIAL = { phoneCode: "+91" };

export function PressReleasePage({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
  const ctrl = useLeadForm("press-release", [[1], [2], []], PRESS_RELEASE_INITIAL);
  const submittedRef = useRef(false);

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
    <div className="pr-page">
      <PressHero />
      <EditorialTicker />
      <StoryPrinciples />
      <NewsroomMoment />
      <EditorialDesk />
      <EditorialProcess />
      <PressSubmissionForm ctrl={ctrl} promotedCities={promotedCities} />
      <ClosingQuote />
    </div>
  );
}
