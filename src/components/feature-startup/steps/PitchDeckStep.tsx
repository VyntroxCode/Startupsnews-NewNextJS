"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { FeatureStartupFormController } from "../useFeatureStartupForm";
import { validatePdfFile } from "../validation";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PitchDeckStep({ ctrl }: { ctrl: FeatureStartupFormController }) {
  const { data, errors, submitting } = ctrl;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File | null) {
    ctrl.setField("pdfFile", file);
    // A file the user just picked (or removed) is worth validating immediately, even before blur —
    // unlike a half-typed text field, there's no "still typing" state to avoid nagging during.
    const error = validatePdfFile({ ...data, pdfFile: file });
    ctrl.blurValidate("pdfFile", () => error);
  }

  return (
    <div className="fys-step" data-step="3">
      <div className={"field fys-upload-field" + (errors.pdfFile ? " has-error" : "")}>
        <label>Upload your pitch deck (PDF) *</label>
        <div
          className={"fys-upload-zone" + (dragging ? " drag" : "") + (errors.pdfFile ? " has-error" : "")}
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
          <p className="fys-upload-title">
            {data.pdfFile ? "Choose a different file" : "Click or drag your PDF here"}
          </p>
          <p className="fys-upload-hint">
            Share your deck, one-pager, or full startup details — PDF, max 10MB.
          </p>
        </div>
        {data.pdfFile && (
          <div className="fys-upload-file">
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
          Submit Your Startup
        </Button>
      </div>
    </div>
  );
}
