"use client";

import { useEffect, useRef, useState } from "react";
import { createInitialFormData, type FieldErrors, type SubmitEventFormData } from "./types";
import { ONLINE_PARTNERSHIP_TYPE, resolveDefaultEndTime, slugify } from "./constants";
import { stepHasErrors, validateAllSteps, validateEndDate, validateEndTime, validateStartDate, validateStartTime, validateStep } from "./validation";
import { buildSubmitPayload } from "./payload";

export const TOTAL_STEPS = 5;

interface SubmissionResult {
  id: number;
}

export function useSubmitEventForm() {
  const [data, setData] = useState<SubmitEventFormData>(createInitialFormData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  // +1 when moving forward, -1 when going back. Only the step transition reads it, but it
  // has to live here because the rail lets you jump to an arbitrary step, so the direction
  // cannot be inferred from the button that was pressed.
  const [direction, setDirection] = useState(1);
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

  /**
   * Picking a start date fills the end date in with it, so a single-day event needs one date
   * instead of two and the field shows what will actually be submitted rather than staying blank.
   *
   * It keeps mirroring only while the organiser has not set an end date of their own: the moment
   * they type a different one, `endDate !== startDate` and later start-date edits leave it alone.
   * That check is why no extra "was this auto-filled?" flag is needed — an end date deliberately
   * set equal to the start date wants to follow it anyway, so the two cases behave identically.
   */
  function onStartDateChange(value: string) {
    setData((prev) => {
      // Still following the start date: nothing of the organiser's own to preserve.
      const mirrors = !prev.endDate || prev.endDate === prev.startDate;
      // An end date entered BEFORE the start date was picked — the order these two fields get
      // filled in is not ours to assume — can be left sitting before it, which no `min` on the
      // input can prevent because that end date was legal when it was chosen. Pull it forward
      // instead of leaving the form in a state that only complains on Next.
      const nowBeforeStart = !!value && !!prev.endDate && prev.endDate < value;
      return { ...prev, startDate: value, endDate: mirrors || nowBeforeStart ? value : prev.endDate };
    });
    if (errors.startDate) pendingRevalidation.current.set("startDate", validateStartDate);
    // The end date just moved relative to the start, so both end-field errors can be stale.
    if (errors.endDate) pendingRevalidation.current.set("endDate", validateEndDate);
    if (errors.endTime) pendingRevalidation.current.set("endTime", validateEndTime);
  }

  /** Picking a start time fills the end time in with the standard finish (11:00 PM) while none is
   * set, the same way the start date fills the end date — the value used to be applied invisibly
   * at submit time, so the field sat blank and the organiser never saw what would be stored.
   * resolveDefaultEndTime keeps it valid for an event that itself starts after 11:00 PM on its own
   * last day, where that default would fall before the start. */
  function onStartTimeChange(value: string) {
    setData((prev) => {
      const sameDay = !prev.endDate || prev.endDate === prev.startDate;
      return {
        ...prev,
        startTime: value,
        endTime: value && !prev.endTime ? resolveDefaultEndTime(value, sameDay) : prev.endTime,
      };
    });
    if (errors.startTime) pendingRevalidation.current.set("startTime", validateStartTime);
    // The start moved against a possibly just-filled end time, so its error can be stale.
    if (errors.endTime) pendingRevalidation.current.set("endTime", validateEndTime);
  }

  /** Editing the end date can clear or raise EITHER end-field error — a date pulled back to the
   * start day hands the check over to the time comparison — so both are recomputed together.
   * updateAndMaybeValidate only takes one error field, hence its own handler. */
  function onEndDateChange(value: string) {
    setField("endDate", value);
    // Validated on every change, not only once an error is already showing (the usual rule here):
    // a date picker has no partially-typed state to be nagged about, and this is the one field a
    // user can put in an invalid order by hand, so it should say so as soon as it happens.
    pendingRevalidation.current.set("endDate", validateEndDate);
    if (errors.endTime) pendingRevalidation.current.set("endTime", validateEndTime);
  }

  /** The slug is no longer a visible field — it is always derived from the title and passed along
   * with the submission as a suggestion for the editor who reviews the lead. */
  function onTitleChange(value: string) {
    setFields({ title: value, slug: slugify(value) });
  }

  /** Picking "Online (virtual)" locks Country and City and clears BOTH — an online event has no
   * country and no city, so nothing is stored for either rather than a stand-in value. The public
   * "Online" label is derived from the event type at render time (see ONLINE_LOCATION_LABEL), so
   * blanking them here costs the listing nothing. Switching back to a physical type leaves the two
   * fields empty and selectable again. */
  function onEventTypeChange(value: string) {
    const goingOnline = value === ONLINE_PARTNERSHIP_TYPE;
    const wasOnline = data.eventType === ONLINE_PARTNERSHIP_TYPE;
    if (goingOnline) {
      setFields({ eventType: value, country: "", countryOther: "", city: "", cityOther: "" });
      // The locked fields can no longer be corrected by hand, so any error already on screen for
      // them has to be cleared here — venue included, since it goes optional at the same moment.
      setErrors((prev) => ({ ...prev, country: "", city: "", venueAddress: "", venueMapLink: "" }));
      return;
    }
    if (wasOnline) {
      setFields({ eventType: value, country: "", countryOther: "", city: "", cityOther: "" });
      return;
    }
    setField("eventType", value);
  }

  function goNext() {
    setSubmitError("");
    const stepErrors = validateStep(currentStep, data);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    if (currentStep < TOTAL_STEPS) { setDirection(1); setCurrentStep(currentStep + 1); }
  }

  function goBack() {
    setSubmitError("");
    if (currentStep > 1) { setDirection(-1); setCurrentStep(currentStep - 1); }
  }

  function goToStep(step: number) {
    setSubmitError("");
    setDirection(step >= currentStep ? 1 : -1);
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
    direction,
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
    onStartDateChange,
    onStartTimeChange,
    onEndDateChange,
    onEventTypeChange,
    goNext,
    goBack,
    goToStep,
    submit,
    reset,
  };
}

export type SubmitEventFormController = ReturnType<typeof useSubmitEventForm>;
