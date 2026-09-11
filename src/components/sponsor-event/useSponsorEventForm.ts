"use client";

import { useEffect, useRef, useState } from "react";
import { slugify, OTHER_CITY_VALUE, OTHER_COUNTRY_VALUE } from "@/components/submit-event/constants";
import { createInitialFormData, type FieldErrors, type SponsorEventFormData } from "./types";
import { stepHasErrors, validateAllSteps, validateStep } from "./validation";

export const TOTAL_STEPS = 3;

/** Structured inputs whose edits have to be folded back into a canonical field on
 * SponsorEventFormData — `location` (what the API validates and emails) and `phone`.
 *
 * Done here rather than in the step components on purpose: a form that stored the parts in one
 * place and the assembled string in another would eventually be edited on one side only, and the
 * bug — a submission emailing a stale location — would be silent. One writer, no drift. */
const DERIVED_FROM: Record<string, "location" | "phone"> = {
  country: "location",
  countryOther: "location",
  city: "location",
  cityOther: "location",
  phoneCode: "phone",
  phoneCodeCustom: "phone",
  phoneNumber: "phone",
};

function composeLocation(d: SponsorEventFormData): string {
  const country = d.country === OTHER_COUNTRY_VALUE ? d.countryOther.trim() : d.country;
  const city = d.city === OTHER_CITY_VALUE ? d.cityOther.trim() : d.city;
  // City first: the API emails this straight through, and "Bengaluru, India" is how a venue reads.
  return [city, country].filter(Boolean).join(", ");
}

function composePhone(d: SponsorEventFormData): string {
  const digits = d.phoneNumber.replace(/\D/g, "");
  if (!digits) return "";
  const code = d.phoneCode === "other" ? d.phoneCodeCustom.trim() : d.phoneCode;
  return code ? `${code} ${digits}` : digits;
}

function withDerived(next: SponsorEventFormData, key: string): SponsorEventFormData {
  const target = DERIVED_FROM[key];
  if (!target) return next;
  return target === "phone"
    ? { ...next, phone: composePhone(next) }
    : { ...next, location: composeLocation(next) };
}

export function useSponsorEventForm() {
  const [data, setData] = useState<SponsorEventFormData>(createInitialFormData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  // +1 moving forward, -1 moving back — read by the step-transition animation.
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // The slug field auto-follows the title until the visitor edits it by hand — same idea as
  // /list-your-event, except here the slug stays a visible, editable field (the Google Form this
  // page replaces asked for it directly), so it needs its own "has the user touched this yet?"
  // flag rather than being derived silently on every keystroke.
  const slugTouched = useRef(false);

  function setField<K extends keyof SponsorEventFormData>(key: K, value: SponsorEventFormData[K]) {
    setData((prev) => withDerived({ ...prev, [key]: value }, key as string));
  }

  const pendingRevalidation = useRef(new Map<string, (d: SponsorEventFormData) => string>());

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

  function updateAndMaybeValidate<K extends keyof SponsorEventFormData>(
    key: K,
    value: SponsorEventFormData[K],
    errorField: string,
    validator: (d: SponsorEventFormData) => string
  ) {
    setData((prev) => withDerived({ ...prev, [key]: value }, key as string));
    if (errors[errorField]) pendingRevalidation.current.set(errorField, validator);
  }

  function blurValidate(errorField: string, validator: (d: SponsorEventFormData) => string) {
    setErrors((prev) => ({ ...prev, [errorField]: validator(data) }));
  }

  function onTitleChange(value: string) {
    setData((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched.current ? prev.slug : slugify(value),
    }));
    if (errors.title) pendingRevalidation.current.set("title", (d) => (d.title.trim() ? "" : "Please enter the event title."));
  }

  function onSlugChange(value: string) {
    slugTouched.current = true;
    setField("slug", value);
    if (errors.slug) pendingRevalidation.current.set("slug", (d) => (d.slug.trim() ? "" : "Please enter a slug."));
  }

  function goNext() {
    setSubmitError("");
    const stepErrors = validateStep(currentStep, data);
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    if (stepHasErrors(stepErrors)) return;
    if (currentStep < TOTAL_STEPS) {
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

  async function submit() {
    setSubmitError("");
    const { errors: allErrors, firstInvalidStep } = validateAllSteps(data);
    setErrors((prev) => ({ ...prev, ...allErrors }));
    if (firstInvalidStep !== null) {
      setSubmitError("Please fix the highlighted fields.");
      setCurrentStep(firstInvalidStep);
      return;
    }
    if (!turnstileToken) {
      setSubmitError("Please complete the CAPTCHA verification.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/sponsor-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setSubmitError(json?.error || "Something went wrong submitting your request — please try again.");
        return;
      }
      setSubmitted(true);
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
    setDirection(1);
    setSubmitting(false);
    setSubmitError("");
    setSubmitted(false);
    setTurnstileToken(null);
    slugTouched.current = false;
  }

  return {
    data,
    errors,
    currentStep,
    direction,
    submitting,
    submitError,
    submitted,
    turnstileToken,
    setTurnstileToken,
    setField,
    updateAndMaybeValidate,
    blurValidate,
    onTitleChange,
    onSlugChange,
    goNext,
    goBack,
    submit,
    reset,
  };
}

export type SponsorEventFormController = ReturnType<typeof useSponsorEventForm>;
