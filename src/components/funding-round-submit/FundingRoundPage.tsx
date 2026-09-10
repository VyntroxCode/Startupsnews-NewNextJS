"use client";

import { useCallback, useEffect, useState } from "react";
import { Playfair_Display } from "next/font/google";
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
import { FundingMilestone } from "./FundingMilestone";
import { FundingProgressRail } from "./FundingProgressRail";
import { ChapterCompanyFounder } from "./chapters/ChapterCompanyFounder";
import { ChapterContact } from "./chapters/ChapterContact";
import { ChapterReview } from "./chapters/ChapterReview";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { FundingTrust } from "./FundingTrust";
import { FundingClosing } from "./FundingClosing";
import { CHAPTERS } from "./chapters";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--fr-font-serif",
  display: "swap",
});

/** Which chapter a given field's error should send the reader back to, for the Review chapter's
 * "submit jumps to the first problem" behavior (section 21/22 of the redesign brief). */
const FIELD_VALIDATORS: Array<{ field: keyof LeadFormData; chapterId: string; validate: (d: LeadFormData) => string }> = [
  { field: "companyName", chapterId: "company", validate: validateCompanyName },
  { field: "name", chapterId: "company", validate: validateName },
  { field: "phone", chapterId: "company", validate: validatePhone },
  { field: "email", chapterId: "contact", validate: validateEmail },
  { field: "website", chapterId: "contact", validate: validateWebsite },
];

const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

/** Live-updating (not fire-once) IntersectionObserver tracking which chapter section is currently
 * in view, for the sticky progress rail — distinct from the one-shot `whileInView` reveals every
 * section's own entrance animation uses. Keyed on `submitted`: the chapter DOM is unmounted while
 * the success state shows and freshly remounted after "Submit Another Round" resets it, so the
 * observer must re-attach to the new elements rather than keep watching the detached originals. */
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
        if (visible.length) {
          setActive(visible[0].target.id.replace("fr-chapter-", ""));
        }
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [submitted]);

  return active;
}

/** Cinematic editorial redesign of Submit Your Funding Round — one continuous scrolling
 * composition (hero → milestone statement → sticky-rail chapters → trust → closing CTA) instead
 * of the earlier click-gated fanned-card wizard. Every chapter's fields are mounted at once (not
 * hidden behind Next/Back), so the shared `useLeadForm` controller is used here purely as a flat
 * data/error store — `setField` / `updateAndMaybeValidate` / `blurValidate` / `submit` / `reset` —
 * rather than through its step-gated `goNext`/`currentStep` API, which this page's flat layout has
 * no use for. `submit()` itself still runs the exact same fake-delay-then-success flow as before;
 * `handleSubmit` below just validates every field up front (same validator functions, same field
 * names) rather than one step's worth at a time, since there's no step to gate on anymore. */
export function FundingRoundPage() {
  const ctrl = useLeadForm("funding-round");
  const activeChapter = useActiveChapter(ctrl.submitted);

  const scrollToChapter = useCallback((id: string) => {
    document.getElementById(`fr-chapter-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
    <div className={`fr-page ${playfairDisplay.variable}`}>
      <FundingHero onStart={() => scrollToChapter("company")} />
      <FundingMilestone />

      {ctrl.submitted ? (
        <SubmissionSuccess ctrl={ctrl} />
      ) : (
        <section className="fr-experience">
          <div className="fr-container fr-experience-inner">
            <FundingProgressRail activeId={activeChapter} submitted={ctrl.submitted} onSelect={scrollToChapter} />
            <div className="fr-chapters">
              <ChapterCompanyFounder ctrl={ctrl} onContinue={() => scrollToChapter("contact")} />
              <ChapterContact ctrl={ctrl} onContinue={() => scrollToChapter("review")} />
              <ChapterReview ctrl={ctrl} onEdit={scrollToChapter} onSubmit={handleSubmit} />
            </div>
          </div>
        </section>
      )}

      <FundingTrust />
      <FundingClosing onStart={() => scrollToChapter("company")} submitted={ctrl.submitted} />
    </div>
  );
}
