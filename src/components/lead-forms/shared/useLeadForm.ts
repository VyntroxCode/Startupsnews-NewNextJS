"use client";

import { useEffect, useRef, useState } from "react";
import { composeCountryCity, composePhone } from "./compose";
import { createInitialLeadFormData, type LeadFormData, type FieldErrors, type LeadFormSource } from "./types";
import { stepHasErrors, validateStep } from "./validation";

/** Which canonical field-validation step(s) (1-5, per validation.ts's STEP_VALIDATOR_MAP) map to
 * each *visual* page of the wizard. Defaults to one canonical step per visual page — the original
 * 3-page behavior, which no caller relies on any more (Funding Round is now a flat chaptered
 * scroll that never calls goNext). Feature Your Startup groups two canonical steps into a single
 * first page ([[1, 2], [3]]) to run a 2-page wizard; Submit Your Press Release passes
 * [[1, 4], [5], []] — email (step 4) on its first page, website (step 5) on its second, an empty
 * Review page — having dropped its PDF step (canonical step 3) entirely. */
const DEFAULT_STEP_GROUPS: number[][] = [[1], [2], [3]];

/** Used only by pages that pass no `onSubmit` — "submit" fakes a brief in-flight moment so the
 * button's busy state feels real, then flips to the page's confirmation UI. All three current
 * callers pass a real `onSubmit` that saves to the database (see useFeatureStartupForm,
 * useFundingRoundForm and PressReleasePage's submitPressRelease), so this is only a fallback. */
const FAKE_SUBMIT_DELAY_MS = 900;

/** Saves a validated submission. Throw to keep the form on screen — the thrown message is shown
 * to the reader as `submitError`. */
export type LeadFormSubmitHandler = (data: LeadFormData) => Promise<void>;

/** Structured inputs whose edits have to be folded back into a canonical field — see LeadFormData.
 * Kept as one map so a new sub-field cannot be added to the shape and forgotten here. */
const DERIVED_FROM: Record<string, keyof LeadFormData> = {
  phoneCode: "phone",
  phoneCodeCustom: "phone",
  phoneNumber: "phone",
  country: "countryCity",
  countryOther: "countryCity",
  city: "countryCity",
  cityOther: "countryCity",
};

/** Recomposes `phone` / `countryCity` from whichever structured field just changed.
 *
 * This is done here rather than in the step components on purpose: a form that stored the parts in
 * one place and the assembled string in another would eventually be edited on one side only, and
 * the bug (a submission carrying a stale phone number) would be silent. One writer, no drift. */
function withDerived(next: LeadFormData, key: string): LeadFormData {
  const target = DERIVED_FROM[key];
  if (!target) return next;
  if (target === "phone") return { ...next, phone: composePhone(next) };
  return { ...next, countryCity: composeCountryCity(next) };
}

/** One step/field/validation engine shared by every lead-capture page on the site (Feature Your
 * Startup, Submit Your Funding Round, Submit Your Press Release). Each page supplies its own
 * visual design (layout, CSS, images/animation) around this controller — only the mechanics are
 * shared, not the UI. `source` is stamped on the controller so a future submission payload always
 * knows which page it was collected on. `stepGroups` lets a page combine multiple canonical
 * validation steps into fewer visual pages without touching the other callers' behavior. */
export function useLeadForm(
  source: LeadFormSource,
  stepGroups: number[][] = DEFAULT_STEP_GROUPS,
  initialData?: Partial<LeadFormData>,
  onSubmit?: LeadFormSubmitHandler
) {
  // The lazy initializer runs on the first render only, so it reads the prop directly — the ref
  // exists purely so `reset` (an event handler, long after that render) can land on the same
  // starting values the form opened on even if the caller passed a fresh object literal since.
  const [data, setData] = useState<LeadFormData>(() => createInitialLeadFormData(initialData));
  const initialRef = useRef(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  // +1 moving forward, -1 moving back — read by each page's own step-transition animation.
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const totalSteps = stepGroups.length;

  function validateVisualStep(step: number): Record<string, string> {
    const canonicalSteps = stepGroups[step - 1] || [];
    const stepErrors: Record<string, string> = {};
    for (const canonicalStep of canonicalSteps) Object.assign(stepErrors, validateStep(canonicalStep, data));
    return stepErrors;
  }

  function setField<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setData((prev) => withDerived({ ...prev, [key]: value }, key as string));
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
    setData((prev) => withDerived({ ...prev, [key]: value }, key as string));
    if (errors[errorField]) pendingRevalidation.current.set(errorField, validator);
  }

  function blurValidate(errorField: string, validator: (d: LeadFormData) => string) {
    setErrors((prev) => ({ ...prev, [errorField]: validator(data) }));
  }

  function goNext() {
    const stepErrors = validateVisualStep(currentStep);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    if (currentStep < totalSteps) {
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

  /** Jumps straight to an earlier visual step — for a review page's per-row "Edit" links, which
   * need to land on step 1 from step 3 in one action (calling `goBack` twice in a handler cannot:
   * both calls read the same stale `currentStep` and land on 2). Backwards only, so forward
   * movement always goes through `goNext` and its validation can never be skipped. */
  function goToStep(step: number) {
    if (step < 1 || step >= currentStep) return;
    setDirection(-1);
    setCurrentStep(step);
  }

  function submit() {
    const stepErrors = validateVisualStep(currentStep);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    if (submitting) return;
    setSubmitError("");
    setSubmitting(true);
    if (!onSubmit) {
      window.setTimeout(() => {
        setSubmitting(false);
        setSubmitted(true);
      }, FAKE_SUBMIT_DELAY_MS);
      return;
    }
    const snapshot = data;
    void (async () => {
      try {
        await onSubmit(snapshot);
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function reset() {
    setData(createInitialLeadFormData(initialRef.current));
    setErrors({});
    setCurrentStep(1);
    setDirection(1);
    setSubmitting(false);
    setSubmitted(false);
    setSubmitError("");
  }

  return {
    source,
    data,
    errors,
    currentStep,
    totalSteps,
    direction,
    submitting,
    submitted,
    submitError,
    setField,
    updateAndMaybeValidate,
    blurValidate,
    goNext,
    goBack,
    goToStep,
    submit,
    reset,
  };
}

export type LeadFormController = ReturnType<typeof useLeadForm>;
