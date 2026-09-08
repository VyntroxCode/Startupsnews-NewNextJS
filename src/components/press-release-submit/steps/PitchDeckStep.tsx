"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { validatePdfFile } from "@/components/lead-forms/shared/validation";
import { fieldGroupVariants, fieldItemVariants } from "../stepAnimations";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PitchDeckStep({ ctrl }: { ctrl: LeadFormController }) {
  const { data, errors, submitting } = ctrl;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File | null) {
    ctrl.setField("pdfFile", file);
    const error = validatePdfFile({ ...data, pdfFile: file });
    ctrl.blurValidate("pdfFile", () => error);
  }

  return (
    <motion.div className="pr-step" data-step="3" variants={fieldGroupVariants} initial="hidden" animate="show">
      <motion.div className={"field pr-upload-field" + (errors.pdfFile ? " has-error" : "")} variants={fieldItemVariants}>
        <label>Upload your press kit (PDF) *</label>
        <div
          className={"pr-upload-zone" + (dragging ? " drag" : "") + (errors.pdfFile ? " has-error" : "")}
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
          <p className="pr-upload-title">
            {data.pdfFile ? "Choose a different file" : "Click or drag your press kit PDF here"}
          </p>
          <p className="pr-upload-hint">
            Press release text, funding announcement, or supporting details — PDF, max 10MB.
          </p>
        </div>
        {data.pdfFile && (
          <div className="pr-upload-file">
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
      </motion.div>

      <motion.div className="wizard-nav" variants={fieldItemVariants}>
        <Button variant="ghost" onClick={ctrl.goBack} disabled={submitting}>
          Back
        </Button>
        <Button variant="primary" onClick={ctrl.submit} busy={submitting} busyLabel="Submitting…">
          Submit for Review
        </Button>
      </motion.div>
    </motion.div>
  );
}
