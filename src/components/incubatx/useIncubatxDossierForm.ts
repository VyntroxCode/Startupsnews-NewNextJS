"use client";

import { useEffect, useState } from "react";
import { createInitialDossierData, TOTAL_STEPS, type FieldErrors, type IncubatxDossierData } from "./types";
import { buildDossierPayload } from "./payload";
import { stepSchemas, computeSoftWarnings } from "@/lib/validation/incubatx-dossier";

interface SubmissionResult {
  reference: string;
}

/** Which top-level fields each step owns — mirrors `stepSchemas`' shape one-to-one. */
const STEP_FIELDS: Record<number, string[]> = {
  1: ["startupName", "websiteUrl", "email", "mobile", "founders"],
  2: ["stage", "sector", "linkedin", "description"],
  3: ["marketOpportunity", "businessModel", "monthlyRevenue", "annualRevenue", "customerCount"],
  4: ["revenueLastFy", "hasRaised", "totalFundingRaised", "fullTimeCount", "partTimeCount"],
  5: ["dpiitCert", "companyProfile", "incorporationCert", "stateStartupCert", "gstCert"],
};

const FIELD_TO_STEP: Record<string, number> = {};
for (const [step, fields] of Object.entries(STEP_FIELDS)) {
  for (const f of fields) FIELD_TO_STEP[f] = Number(step);
}

/**
 * Validates one step's own schema against the full payload (zod ignores keys the schema
 * doesn't declare, so passing the whole payload rather than a hand-picked slice is fine and
 * simpler). Crucially this is why a still-blank LATER step's required fields can't suppress
 * THIS step's own cross-field checks — see stepSchemas' doc comment in the schema file.
 */
function runStepValidation(step: number, data: IncubatxDossierData): FieldErrors {
  const schema = stepSchemas[step];
  if (!schema) return {};
  const result = schema.safeParse(buildDossierPayload(data));
  const errors: FieldErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      if (!errors[field]) errors[field] = issue.message;
    }
  }
  return errors;
}

function runAllStepsValidation(data: IncubatxDossierData): FieldErrors {
  let all: FieldErrors = {};
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    all = { ...all, ...runStepValidation(step, data) };
  }
  return all;
}

export function useIncubatxDossierForm() {
  const [data, setData] = useState<IncubatxDossierData>(createInitialDossierData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  // +1/-1 — which way the step transition should slide, set explicitly by whichever nav
  // function moves the step (rather than derived from a ref comparison during render, which
  // React's rules disallow).
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState<SubmissionResult | null>(null);
  // S3 key prefix for document uploads, which happen incrementally during Step 5 — before the
  // real dossier `reference` exists (that's only generated server-side on final submit).
  const [draftId] = useState(() => crypto.randomUUID());

  // Re-validates only fields that are ALREADY showing an error, so a fix clears live as the
  // user types — untouched fields are never validated pre-emptively (blur/Continue do that).
  useEffect(() => {
    setErrors((prev) => {
      const touched = Object.keys(prev).filter((f) => prev[f]);
      if (touched.length === 0) return prev;
      const stepsToRecheck = new Set(touched.map((f) => FIELD_TO_STEP[f]).filter((s): s is number => s !== undefined));
      let fresh: FieldErrors = {};
      for (const step of stepsToRecheck) fresh = { ...fresh, ...runStepValidation(step, data) };
      let changed = false;
      const next = { ...prev };
      for (const f of touched) {
        const msg = fresh[f] || "";
        if (next[f] !== msg) {
          next[f] = msg;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

  const softWarnings = computeSoftWarnings({
    stage: data.stage,
    monthlyRevenue: data.monthlyRevenue,
    annualRevenue: data.annualRevenue,
  });

  function setField<K extends keyof IncubatxDossierData>(key: K, value: IncubatxDossierData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function setFields(patch: Partial<IncubatxDossierData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function setFieldError(field: string, message: string) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  /** Runs on blur — the only place an untouched field first gets validated. */
  function blurValidate(field: string) {
    const step = FIELD_TO_STEP[field];
    if (step === undefined) return;
    const fresh = runStepValidation(step, data);
    setErrors((prev) => ({ ...prev, [field]: fresh[field] || "" }));
  }

  function goNext() {
    setSubmitError("");
    const fresh = runStepValidation(currentStep, data);
    const fields = STEP_FIELDS[currentStep] || [];
    setErrors((prev) => {
      const next = { ...prev };
      for (const f of fields) next[f] = fresh[f] || "";
      return next;
    });
    if (fields.some((f) => fresh[f])) return;
    if (currentStep < TOTAL_STEPS + 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  }

  function goBack() {
    setSubmitError("");
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  }

  function goToStep(step: number) {
    setSubmitError("");
    setDirection(step >= currentStep ? 1 : -1);
    setCurrentStep(step);
  }

  async function submit() {
    setSubmitError("");
    const fresh = runAllStepsValidation(data);
    const stepsWithErrors = Object.entries(STEP_FIELDS)
      .filter(([, fields]) => fields.some((f) => fresh[f]))
      .map(([step]) => Number(step));

    if (stepsWithErrors.length > 0) {
      setErrors((prev) => ({ ...prev, ...fresh }));
      setSubmitError("Please fix the highlighted fields.");
      setCurrentStep(Math.min(...stepsWithErrors));
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildDossierPayload(data);
      const res = await fetch("/api/incubatx/dossier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        if (json?.fieldErrors && typeof json.fieldErrors === "object") {
          setErrors((prev) => ({ ...prev, ...json.fieldErrors }));
          const errStepsWithErrors = Object.entries(STEP_FIELDS)
            .filter(([, fields]) => fields.some((f) => json.fieldErrors[f]))
            .map(([step]) => Number(step));
          if (errStepsWithErrors.length > 0) setCurrentStep(Math.min(...errStepsWithErrors));
        }
        setSubmitError(json?.error || "Something went wrong submitting your dossier — please try again.");
        return;
      }
      setSubmitted({ reference: json.data.reference });
    } catch {
      setSubmitError("Could not submit right now — please try again in a moment, or email us your details directly.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setData(createInitialDossierData());
    setErrors({});
    setCurrentStep(1);
    setDirection(1);
    setSubmitError("");
    setSubmitted(null);
  }

  return {
    data,
    errors,
    softWarnings,
    currentStep,
    direction,
    submitting,
    submitError,
    submitted,
    draftId,
    setField,
    setFields,
    setFieldError,
    blurValidate,
    goNext,
    goBack,
    goToStep,
    submit,
    reset,
  };
}

export type IncubatxDossierFormController = ReturnType<typeof useIncubatxDossierForm>;
