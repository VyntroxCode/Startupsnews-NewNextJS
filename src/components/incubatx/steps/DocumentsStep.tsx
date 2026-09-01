"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { IncubatxFileUpload } from "../IncubatxFileUpload";
import { fieldVariants } from "../motionVariants";
import type { DocumentField, IncubatxFileRef } from "../types";
import type { IncubatxDossierFormController } from "../useIncubatxDossierForm";

const DOCS: { field: DocumentField; label: string; required: boolean }[] = [
  { field: "companyProfile", label: "Company Profile", required: false },
  { field: "incorporationCert", label: "Certificate of Incorporation", required: false },
  { field: "dpiitCert", label: "DPIIT Certificate", required: true },
  { field: "stateStartupCert", label: "State Startup Certificate", required: false },
  { field: "gstCert", label: "GST Certificate", required: false },
];

export function DocumentsStep({ ctrl }: { ctrl: IncubatxDossierFormController }) {
  const { data, errors, draftId } = ctrl;

  return (
    <div className="ix-step" data-step="5">
      <div className="ix-step-head">
        <h2>Documents</h2>
        <p>DPIIT is required — the rest speed up filing but aren&apos;t blockers today.</p>
      </div>

      <div className="ix-doc-checklist">
        {DOCS.map((doc) => {
          const value = data[doc.field] as IncubatxFileRef | null;
          const error = errors[doc.field];
          return (
            <motion.div variants={fieldVariants} className={"ix-doc-row" + (error ? " has-error" : "")} key={doc.field} id={`field-${doc.field}`}>
              <div className="ix-doc-row-head">
                <span className="ix-doc-name">{doc.label}</span>
                <span className={"ix-doc-tag" + (doc.required ? " required" : "")}>
                  {doc.required ? "required" : "optional — speeds up filing"}
                </span>
              </div>
              <IncubatxFileUpload
                field={doc.field}
                draftId={draftId}
                value={value}
                error={error}
                onChange={(v) => {
                  ctrl.setField(doc.field, v);
                  ctrl.setFieldError(doc.field, "");
                }}
                onError={(msg) => ctrl.setFieldError(doc.field, msg)}
              />
              <div className={"field-error" + (error ? " visible" : "")} aria-live="polite">{error}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack}>Back</Button>
        <Button variant="primary" onClick={ctrl.goNext}>Review</Button>
      </div>
    </div>
  );
}
