"use client";

import { useEffect, useRef, useState } from "react";
import { createInitialLeadFormData, type LeadFormData, type FieldErrors, type LeadFormSource } from "./types";
import { stepHasErrors, validateStep } from "./validation";

export const LEAD_FORM_TOTAL_STEPS = 3;

/** Front-end only for now (see the Feature Your Startup plan doc) — "submit" has no network call
 * yet, it just fakes a brief in-flight moment so the button's busy state feels real, then flips to
 * each page's own confirmation UI. Wiring this to a real API + DB, tagged by `source`, is a later
 * round shared across all 3 pages. */
const FAKE_SUBMIT_DELAY_MS = 900;

/** One step/field/validation engine shared by every lead-capture page on the site (Feature Your
 * Startup, Submit Your Funding Round, Submit Your Press Release). Each page supplies its own
 * visual design (layout, CSS, images/animation) around this controller — only the mechanics are
 * shared, not the UI. `source` is stamped on the controller so a future submission payload always
 * knows which page it was collected on. */
export function useLeadForm(source: LeadFormSource) {
  const [data, setData] = useState<LeadFormData>(createInitialLeadFormData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  // +1 moving forward, -1 moving back — read by each page's own step-transition animation.
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setField<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  // Error messages queued by updateAndMaybeValidate, recomputed once the matching `data` commit
  // has landed (see submit-event's useSubmitEventForm.ts for why this needs to be an effect
  // rather than validating against a locally-built snapshot).
  const pendingRevalidation = useRef(new Map<string, (d: LeadFormData) => string>());

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
   * clear as soon as the fix lands instead of waiting for blur. */
  function updateAndMaybeValidate<K extends keyof LeadFormData>(
    key: K,
    value: LeadFormData[K],
    errorField: string,
    validator: (d: LeadFormData) => string
  ) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[errorField]) pendingRevalidation.current.set(errorField, validator);
  }

  function blurValidate(errorField: string, validator: (d: LeadFormData) => string) {
    setErrors((prev) => ({ ...prev, [errorField]: validator(data) }));
  }

  function goNext() {
    const stepErrors = validateStep(currentStep, data);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    if (currentStep < LEAD_FORM_TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  }

  function submit() {
    const stepErrors = validateStep(currentStep, data);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, FAKE_SUBMIT_DELAY_MS);
  }

  function reset() {
    setData(createInitialLeadFormData());
    setErrors({});
    setCurrentStep(1);
    setDirection(1);
    setSubmitting(false);
    setSubmitted(false);
  }

  return {
    source,
    data,
    errors,
    currentStep,
    direction,
    submitting,
    submitted,
    setField,
    updateAndMaybeValidate,
    blurValidate,
    goNext,
    goBack,
    submit,
    reset,
  };
}

export type LeadFormController = ReturnType<typeof useLeadForm>;
