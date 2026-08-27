"use client";

import { useEffect, useRef, useState } from "react";
import { createInitialFormData, type FieldErrors, type SubmitEventFormData } from "./types";
import { slugify } from "./constants";
import { stepHasErrors, validateAllSteps, validateStep } from "./validation";
import { buildSubmitPayload } from "./payload";

export const TOTAL_STEPS = 5;

interface SubmissionResult {
  id: number;
}

export function useSubmitEventForm() {
  const [data, setData] = useState<SubmitEventFormData>(createInitialFormData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState<SubmissionResult | null>(null);

  function setField<K extends keyof SubmitEventFormData>(key: K, value: SubmitEventFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function setFields(patch: Partial<SubmitEventFormData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function setFieldError(field: string, message: string) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function clearFieldError(field: string) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  }

  // Error messages queued by updateAndMaybeValidate, recomputed once the matching `data` commit
  // has landed. Deferring to an effect is what lets that function write with a functional updater
  // (see below) — it no longer needs to build a `next` snapshot of its own to hand the validator,
  // and the validator now sees every field a single handler changed, not just its own.
  const pendingRevalidation = useRef(new Map<string, (d: SubmitEventFormData) => string>());

  useEffect(() => {
    if (pendingRevalidation.current.size === 0) return;
    const pending = Array.from(pendingRevalidation.current.entries());
    pendingRevalidation.current.clear();
    setErrors((prev) => {
      const next = { ...prev };
      for (const [field, validator] of pending) next[field] = validator(data);
      return next;
    });
  }, [data]);

  /** Updates a field and, only if that field is already showing an error, re-validates so it can
   * clear. The data write MUST stay a functional update: one handler can fire several setters in
   * the same tick — picking a country also resets countryOther, city and cityOther — and a
   * snapshot-based `setData({ ...data, ... })` rebuilds state from the pre-click render every
   * time, so the last call silently threw away the country and city the earlier calls had just
   * set. That's what made the Country dropdown look like it wasn't registering a selection. */
  function updateAndMaybeValidate<K extends keyof SubmitEventFormData>(
    key: K,
    value: SubmitEventFormData[K],
    errorField: string,
    validator: (d: SubmitEventFormData) => string
  ) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[errorField]) pendingRevalidation.current.set(errorField, validator);
  }

  function blurValidate(errorField: string, validator: (d: SubmitEventFormData) => string) {
    setErrors((prev) => ({ ...prev, [errorField]: validator(data) }));
  }

  function onTitleChange(value: string) {
    if (data.slugManuallyEdited) {
      setField("title", value);
    } else {
      setFields({ title: value, slug: slugify(value) });
    }
  }

  function onSlugChange(value: string) {
    setFields({ slug: value, slugManuallyEdited: true });
  }

  function goNext() {
    setSubmitError("");
    const stepErrors = validateStep(currentStep, data);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    if (currentStep < TOTAL_STEPS) setCurrentStep(currentStep + 1);
  }

  function goBack() {
    setSubmitError("");
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  function goToStep(step: number) {
    setSubmitError("");
    setCurrentStep(step);
  }

  async function submit() {
    setSubmitError("");
    const { errors: allErrors, firstInvalidStep } = validateAllSteps(data);
    setErrors((prev) => ({ ...prev, ...allErrors }));
    if (firstInvalidStep !== null) {
      setSubmitError("Please fix the highlighted fields.");
      setCurrentStep(firstInvalidStep);
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildSubmitPayload(data);
      const res = await fetch("/api/events/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setSubmitError(json?.error || "Something went wrong submitting your event — please try again.");
        return;
      }
      setSubmitted({ id: json.data.id });
    } catch {
      setSubmitError("Could not submit right now — please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setData(createInitialFormData());
    setErrors({});
    setCurrentStep(1);
    setSubmitError("");
    setSubmitted(null);
  }

  return {
    data,
    errors,
    currentStep,
    submitting,
    submitError,
    submitted,
    setField,
    setFields,
    setFieldError,
    clearFieldError,
    updateAndMaybeValidate,
    blurValidate,
    onTitleChange,
    onSlugChange,
    goNext,
    goBack,
    goToStep,
    submit,
    reset,
  };
}

export type SubmitEventFormController = ReturnType<typeof useSubmitEventForm>;
