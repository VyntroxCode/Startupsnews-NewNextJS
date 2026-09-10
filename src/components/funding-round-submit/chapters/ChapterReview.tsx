"use client";

import { Button } from "@/components/ui/Button";
import { ChapterHeader } from "../ChapterHeader";
import { ArrowRightIcon } from "../icons";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";

export function ChapterReview({
  ctrl,
  onEdit,
  onSubmit,
}: {
  ctrl: LeadFormController;
  onEdit: (chapterId: string) => void;
  onSubmit: () => void;
}) {
  const { data, submitting } = ctrl;

  const rows: Array<{ label: string; value: string; empty?: boolean; chapterId: string }> = [
    { label: "Company", value: data.companyName || "Not entered yet", empty: !data.companyName, chapterId: "company" },
    { label: "Founder", value: data.name || "Not entered yet", empty: !data.name, chapterId: "company" },
    { label: "Phone", value: data.phone || "Not entered yet", empty: !data.phone, chapterId: "company" },
    { label: "Email", value: data.email || "Not entered yet", empty: !data.email, chapterId: "contact" },
    { label: "Website", value: data.website || "Not provided", empty: !data.website, chapterId: "contact" },
    { label: "Location", value: data.countryCity || "Not provided", empty: !data.countryCity, chapterId: "contact" },
  ];

  return (
    <section id="fr-chapter-review" data-fr-chapter="review" className="fr-chapter">
      <div className="fr-container">
        <ChapterHeader
          n="03"
          eyebrow="Review"
          title="Ready to share your milestone?"
          lede="A quick look before it goes to our editorial desk. Anything off? Jump back and fix it — nothing here is final until you submit."
        />
        <div className="fr-chapter-fields">
          <dl className="fr-review-grid">
            {rows.map((row) => (
              <div className="fr-review-row" key={row.label}>
                <dt className="fr-review-label">{row.label}</dt>
                <dd className={"fr-review-value" + (row.empty ? " fr-empty" : "")}>
                  {row.value}
                  {" "}
                  <button type="button" className="fr-review-edit" onClick={() => onEdit(row.chapterId)}>
                    Edit
                  </button>
                </dd>
              </div>
            ))}
          </dl>

          <div className="fr-review-actions">
            <Button variant="primary" onClick={onSubmit} busy={submitting} busyLabel="Submitting…">
              Submit Funding Round
              <ArrowRightIcon width={15} height={15} />
            </Button>
          </div>
          <p className="fr-review-note">
            Missing something required? Submitting will jump you straight back to the first field
            that needs attention.
          </p>
        </div>
      </div>
    </section>
  );
}
