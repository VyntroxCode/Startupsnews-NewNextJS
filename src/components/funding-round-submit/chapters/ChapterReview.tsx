"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { ChapterHeader } from "../ChapterHeader";
import { ArrowRightIcon, PencilIcon } from "../icons";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";

/** One line of the summary. `fieldId` is the id of the input this row came from, so Edit can put
 * the cursor in that exact field instead of dropping the reader at the top of the chapter and
 * leaving them to find it — which is what a single "Edit" per chapter did when there were two
 * field chapters. `required` drives the difference between "you still have to fill this in" and
 * "you chose not to", which the old flat list could not express: it showed both as grey text. */
interface ReviewRow {
  label: string;
  value: string;
  fieldId: string;
  required: boolean;
  hint: string;
}

export function ChapterReview({
  ctrl,
  onEdit,
  onSubmit,
}: {
  ctrl: LeadFormController;
  onEdit: (chapterId: string) => void;
  onSubmit: () => void;
}) {
  const { data, submitting, submitError } = ctrl;

  const rows: ReviewRow[] = [
    { label: "Company", value: data.companyName, fieldId: "fr-company", required: true, hint: "The company raising the round" },
    { label: "Founder", value: data.name, fieldId: "fr-name", required: true, hint: "Who we'll be in touch with" },
    { label: "Phone / WhatsApp", value: data.phone, fieldId: "fr-phone", required: true, hint: "For the follow-up conversation" },
    { label: "Official email", value: data.email, fieldId: "fr-email", required: true, hint: "Where our reply lands" },
    { label: "Website", value: data.website, fieldId: "fr-website", required: false, hint: "Optional" },
    { label: "Country / City", value: data.countryCity, fieldId: "fr-country-city", required: false, hint: "Optional" },
  ];

  const missingRequired = rows.filter((row) => row.required && !row.value.trim()).length;

  /** Scroll back to the fields, then put the cursor in the one that was clicked. The focus is
   * deferred because focusing mid-smooth-scroll cancels the scroll in Chrome — the field ends up
   * focused with the page still halfway there. */
  const editField = useCallback(
    (fieldId: string) => {
      onEdit("details");
      window.setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      }, 650);
    },
    [onEdit]
  );

  return (
    <section id="fr-chapter-review" data-fr-chapter="review" className="fr-chapter">
      <div className="fr-container">
        <ChapterHeader
          eyebrow="Review"
          title="Ready to share your milestone?"
          lede="A quick look before it goes to our editorial desk. Anything off? Jump back and fix it. Nothing here is final until you submit."
        />
        <div className="fr-chapter-fields">
          <div className="fr-review-card">
            <div className="fr-review-card-head">
              <p className="fr-review-card-title">Your submission</p>
              <p
                className={"fr-review-status" + (missingRequired ? " is-incomplete" : " is-complete")}
              >
                {missingRequired
                  ? `${missingRequired} required ${missingRequired === 1 ? "field" : "fields"} still empty`
                  : "All required fields complete"}
              </p>
            </div>

            <dl className="fr-review-grid">
              {rows.map((row) => {
                const filled = !!row.value.trim();
                const state = filled ? "is-filled" : row.required ? "is-missing" : "is-optional";
                return (
                  <div className={`fr-review-item ${state}`} key={row.label}>
                    <dt className="fr-review-label">
                      {row.label}
                      {row.required && <span className="fr-review-req" aria-hidden="true">*</span>}
                    </dt>
                    <dd className="fr-review-value">
                      {filled ? row.value : row.required ? "Still needed" : "Not provided"}
                    </dd>
                    <p className="fr-review-hint">{row.hint}</p>
                    <button
                      type="button"
                      className="fr-review-edit"
                      onClick={() => editField(row.fieldId)}
                    >
                      <PencilIcon width={13} height={13} />
                      <span>{filled ? "Edit" : "Add"}</span>
                      <span className="fr-sr-only"> {row.label}</span>
                    </button>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="fr-review-actions">
            <Button variant="primary" onClick={onSubmit} busy={submitting} busyLabel="Submitting…">
              Submit Funding Round
              <ArrowRightIcon width={15} height={15} />
            </Button>
            {submitError ? (
              <p className="fr-submit-error" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
