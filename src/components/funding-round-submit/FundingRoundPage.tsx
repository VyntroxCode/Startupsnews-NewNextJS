"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLeadForm } from "@/components/lead-forms/shared/useLeadForm";
import {
  validateCompanyName,
  validateEmail,
  validateName,
  validatePhone,
  validateWebsite,
} from "@/components/lead-forms/shared/validation";
import type { LeadFormData } from "@/components/lead-forms/shared/types";
import { FundingHero } from "./FundingHero";
import { RoundMarquee } from "./RoundMarquee";
import { FundingStory } from "./FundingStory";
import { FundingJourney } from "./FundingJourney";
import { InvestorNetwork } from "./InvestorNetwork";
import { ProcessTimeline } from "./ProcessTimeline";
import { SectionHead } from "./SectionHead";
import { FundingProgressRail } from "./FundingProgressRail";
import { ChapterDetails } from "./chapters/ChapterDetails";
import { ChapterReview } from "./chapters/ChapterReview";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { FundingClosing } from "./FundingClosing";
import { CHAPTERS } from "./chapters";

/** Which chapter a given field's error should send the reader back to, for the Review chapter's
 * "submit jumps to the first problem" behavior. */
const FIELD_VALIDATORS: Array<{ field: keyof LeadFormData; chapterId: string; validate: (d: LeadFormData) => string }> = [
  { field: "companyName", chapterId: "details", validate: validateCompanyName },
  { field: "name", chapterId: "details", validate: validateName },
  { field: "phone", chapterId: "details", validate: validatePhone },
  { field: "email", chapterId: "details", validate: validateEmail },
  { field: "website", chapterId: "details", validate: validateWebsite },
];

const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

/** Live-updating (not fire-once) IntersectionObserver tracking which chapter is in view, for the
 * sticky progress rail. Keyed on `submitted`: the chapter DOM is unmounted while the success state
 * shows and freshly mounted again after "Submit another round" resets it, so the observer has to
 * re-attach to the new elements rather than keep watching the detached originals. */
function useActiveChapter(submitted: boolean): string {
  const [active, setActive] = useState(CHAPTER_IDS[0]);

  useEffect(() => {
    if (submitted) return;
    const elements = CHAPTER_IDS.map((id) => document.getElementById(`fr-chapter-${id}`)).filter(
      (el): el is HTMLElement => !!el
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id.replace("fr-chapter-", ""));
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [submitted]);

  return active;
}

/** Submit Your Funding Round — a scrolling funding-announcement story that ends in the submission
 * form, rather than a form with copy stacked above it.
 *
 * Running order (each section owns a different motion language on purpose, so the page never
 * settles into one repeated fade-up):
 *
 *   hero        load-time choreography — masked headline lines, card scale-in, counting amount,
 *               self-drawing graph, investors landing one at a time
 *   marquee     slow seam of round names, CSS-driven
 *   why         lateral card deal against a settling photograph
 *   journey     THE centrepiece: a pinned visual crossfading between five photographs as five
 *               steps of text scroll past it (opacity + scale + blur, never a hard cut)
 *   ecosystem   SVG connectors drawing out of a central node, capital markers travelling in
 *   process     scroll-linked timeline rail
 *   form        the two-chapter submission, then the confirmation
 *   closing     a full stop before the site footer
 *
 * Removed on request (log #719): the round-types ladder, the mock funding-story preview, the
 * numbers/"shape of a round" section, the discovery-surfaces grid and the pre-form CTA. Then, on a
 * later pass: the hero's two buttons and the whole "Why submit" benefits grid — and with it the
 * RUNNING-ORDER NUMBERING itself. Sections used to carry 01…06 and were renumbered whenever one
 * was cut; there is nothing left to renumber, which is why the list above is unnumbered.
 *
 * The visual system is deliberately NOT the near-black cinematic stage this page used to be, nor
 * the editorial grey of the press desk: white and soft neutral ground, near-black type, and one
 * accent carrying every graph, rule, node and active state — the site's pink (#E62E69), which
 * replaced the violet this page launched with so it reads as part of StartupNews.fyi rather than a
 * separate product. See the SUBMIT YOUR FUNDING ROUND block in globals.css for the tokens.
 *
 * WHAT THE FORM COLLECTS HAS NOT CHANGED, and could not: `useLeadForm("funding-round")` is a
 * front-end-only controller over six shared fields (company, name, phone, email, website,
 * country/city) with no backend behind it — `submit()` fakes a short delay and flips to the
 * confirmation. There is no funding-amount, round-stage or investor field anywhere in the data
 * model, so this redesign does not render one: every funding figure on the page is labelled as an
 * example, and the round's actual details are described as something the desk follows up for.
 * Adding real funding fields is a backend change first, a form change second. */
/** The country-code select opens on India, as /list-your-event's and Feature Your Startup's do —
 * an unset code reads as one more thing to fill in. */
const FUNDING_ROUND_INITIAL = { phoneCode: "+91" };

export function FundingRoundPage({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
  const ctrl = useLeadForm("funding-round", undefined, FUNDING_ROUND_INITIAL);
  const activeChapter = useActiveChapter(ctrl.submitted);
  const submittedRef = useRef(false);

  const scrollToChapter = useCallback((id: string) => {
    document.getElementById(`fr-chapter-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // The confirmation is much shorter than the form it replaces, which can leave the reader looking
  // at whitespace where the fields were; bring it into view instead.
  useEffect(() => {
    if (ctrl.submitted && !submittedRef.current) {
      submittedRef.current = true;
      document.getElementById("fr-confirm")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (!ctrl.submitted) submittedRef.current = false;
  }, [ctrl.submitted]);

  const handleSubmit = useCallback(() => {
    let firstInvalidChapter: string | null = null;
    for (const { field, chapterId, validate } of FIELD_VALIDATORS) {
      const message = validate(ctrl.data);
      ctrl.blurValidate(field, validate);
      if (message && !firstInvalidChapter) firstInvalidChapter = chapterId;
    }
    if (firstInvalidChapter) {
      scrollToChapter(firstInvalidChapter);
      return;
    }
    ctrl.submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl.data]);

  return (
    <div className="fr-page">
      <FundingHero />
      <RoundMarquee />
      <FundingStory />
      <FundingJourney />
      <InvestorNetwork />
      <ProcessTimeline />

      {ctrl.submitted ? (
        <SubmissionSuccess ctrl={ctrl} />
      ) : (
        <section className="fr-section fr-experience" id="fr-form" aria-labelledby="fr-form-title">
          <div className="fr-container">
            <SectionHead
              label="Submit"
              heading={
                <>
                  Tell us about <em>your round</em>.
                </>
              }
              headingId="fr-form-title"
              lede={
                <>
                  Six fields, read by a person. <em>Nothing here is published automatically, and
                  nothing is shared with investors.</em>
                </>
              }
            />
            <div className="fr-experience-inner">
              <FundingProgressRail activeId={activeChapter} submitted={ctrl.submitted} onSelect={scrollToChapter} />
              <div className="fr-chapters">
                <ChapterDetails
                  ctrl={ctrl}
                  onContinue={() => scrollToChapter("review")}
                  promotedCities={promotedCities}
                />
                <ChapterReview ctrl={ctrl} onEdit={scrollToChapter} onSubmit={handleSubmit} />
              </div>
            </div>
          </div>
        </section>
      )}

      <FundingClosing />
    </div>
  );
}
