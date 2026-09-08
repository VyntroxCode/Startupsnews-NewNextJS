"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validatePdfFile } from "@/components/lead-forms/shared/validation";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FundingDeckStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors, submitting } = ctrl;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File | null) {
    ctrl.setField("pdfFile", file);
    const error = validatePdfFile({ ...data, pdfFile: file });
    ctrl.blurValidate("pdfFile", () => error);
  }

  return (
    <div className="fr-step" data-step="3">
      <div className={"field fr-upload-field" + (errors.pdfFile ? " has-error" : "")}>
        <label>Upload your funding deck (PDF) *</label>
        <div
          className={"fr-upload-zone" + (dragging ? " drag" : "") + (errors.pdfFile ? " has-error" : "")}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0] || null;
            if (file) handleFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
          <p className="fr-upload-title">
            {data.pdfFile ? "Choose a different file" : "Click or drag your funding deck PDF here"}
          </p>
          <p className="fr-upload-hint">
            Round size, stage, investors, or full details — PDF, max 10MB.
          </p>
        </div>
        {data.pdfFile && (
          <div className="fr-upload-file">
            <span>
              {data.pdfFile.name} · {formatBytes(data.pdfFile.size)}
            </span>
            <button type="button" aria-label="Remove file" onClick={() => handleFile(null)}>
              &times;
            </button>
          </div>
        )}
        <div className={"field-error" + (errors.pdfFile ? " visible" : "")} aria-live="polite">
          {errors.pdfFile}
        </div>
      </div>

      <div className="wizard-nav">
        <Button variant="ghost" onClick={ctrl.goBack} disabled={submitting}>
          Back
        </Button>
        <Button variant="primary" onClick={ctrl.submit} busy={submitting} busyLabel="Submitting…">
          Submit Funding Round
        </Button>
      </div>
    </div>
  );
}
