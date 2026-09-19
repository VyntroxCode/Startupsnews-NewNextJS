"use client";

import { useEffect, useRef, useState } from "react";
import { composeCountryCity, composePhone, resolveCity, resolveCountry } from "@/components/lead-forms/shared/compose";
import {
  FIELD_FOCUS_TARGET,
  firstInvalidField,
  JOURNEY_VALIDATORS,
  validateAll,
  type JourneyErrors,
  type JourneyField,
  type JourneyFormData,
} from "./journeyValidation";
import { PARTICIPATION_OTHERS } from "@/modules/ens-travel-enquiries/domain/participation";
import { FOUND_US_OTHERS } from "@/modules/ens-travel-enquiries/domain/sources";

/** The dial code opens on India, exactly as /list-your-event and /feature-your-startup do: this
 * page's audience is majority Indian, and an unset code reads as one more thing to fill in. */
const INITIAL: JourneyFormData = {
  name: "",
  email: "",
  phone: "",
  phoneCode: "+91",
  phoneCodeCustom: "",
  phoneNumber: "",
  countryCity: "",
  country: "",
  countryOther: "",
  city: "",
  cityOther: "",
  participation: "",
  requirement: "",
  referredBy: "",
  foundUs: "",
  foundUsDetail: "",
};

/** Structured inputs whose edits have to be folded back into a canonical field — the same map, for
 * the same reason, as `useLeadForm`'s `DERIVED_FROM`: one writer, so the stored parts and the
 * assembled string can never drift apart. */
const DERIVED_FROM: Record<string, "phone" | "countryCity"> = {
  phoneCode: "phone",
  phoneCodeCustom: "phone",
  phoneNumber: "phone",
  country: "countryCity",
  countryOther: "countryCity",
  city: "countryCity",
  cityOther: "countryCity",
};

function withDerived(next: JourneyFormData, keys: string[]): JourneyFormData {
  for (const key of keys) {
    const target = DERIVED_FROM[key];
    if (target === "phone") next.phone = composePhone(next);
    else if (target === "countryCity") next.countryCity = composeCountryCity(next);
  }
  return next;
}

/** Posts a validated enquiry. Throwing keeps the form on screen with the thrown message shown
 * below the button — the same contract as the site's other lead forms (see
 * useFeatureStartupForm's submitFeatureStartup). Country and city are sent already resolved (the
 * picked value, or what was typed under "Other"), so nothing downstream has to know the sentinel. */
async function postEnquiry(data: JourneyFormData): Promise<void> {
  const res = await fetch("/api/expand-north-star/travel-enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name.trim(),
      email: data.email.trim(),
      contact: data.phone,
      city: resolveCity(data),
      country: resolveCountry(data),
      participation: data.participation,
      // Only meaningful under "Others"; the API ignores it for any other option.
      requirement: data.participation === PARTICIPATION_OTHERS ? data.requirement.trim() : "",
      referredBy: data.referredBy,
      foundUs: data.foundUs,
      // Likewise only meaningful under "Others".
      foundUsDetail: data.foundUs === FOUND_US_OTHERS ? data.foundUsDetail.trim() : "",
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(
      (json && typeof json.error === "string" && json.error) ||
        "We couldn't send your details. Please try again."
    );
  }
}

/** State, validation and submission for the "Plan your journey" form.
 *
 * Deliberately not built on `useLeadForm` itself: that engine is a multi-step wizard over a fixed
 * field set (company name, website, pitch deck) this six-field, single-screen travel enquiry does
 * not share. What it *does* share is everything that matters — the same collection components, the
 * same composers, the same phone rules — so the two cannot drift. The mechanics below mirror it:
 * canonical composed values, validate on blur, re-validate a field already showing an error as
 * soon as it is fixed, one in-flight guard against double submission. */
export function useJourneyForm() {
  const [data, setData] = useState<JourneyFormData>(INITIAL);
  const [errors, setErrors] = useState<JourneyErrors>({});
  /** Fields the visitor has actually finished with. Nothing is allowed to show a message before
   * its field has been left once or Register has been pressed — a form that greets a first-time
   * reader with "Please select your city" has told them off for nothing.
   *
   * This is separate from `errors` because a message can be *computed* long before it should be
   * *shown*: `CountryCityFields` resets City whenever Country changes, and the shared CustomSelect
   * treats a click anywhere outside it as a blur — so City in particular can be validated while
   * the visitor is still working two fields away. */
  const [touched, setTouched] = useState<Partial<Record<JourneyField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Error messages queued by an edit, recomputed once the matching `data` commit has landed —
  // validating against a locally-built snapshot instead would judge the value as it was before
  // the change (see useLeadForm's pendingRevalidation for the same problem).
  const pendingRevalidation = useRef(new Set<JourneyField>());

  useEffect(() => {
    if (pendingRevalidation.current.size === 0) return;
    const pending = Array.from(pendingRevalidation.current);
    pendingRevalidation.current.clear();
    setErrors((prev) => {
      const next = { ...prev };
      for (const field of pending) next[field] = JOURNEY_VALIDATORS[field](data);
      return next;
    });
  }, [data]);

  /** Applies an edit and, for each named field already holding an error, queues a re-check so the
   * message clears the moment the fix lands rather than waiting for another blur. More than one
   * field when an edit changes what another field needs — picking a package other than "Others"
   * means the requirement box no longer needs filling. */
  function update(patch: Partial<JourneyFormData>, errorFields?: JourneyField | JourneyField[]) {
    setData((prev) => withDerived({ ...prev, ...patch }, Object.keys(patch)));
    for (const field of ([] as JourneyField[]).concat(errorFields ?? [])) {
      if (errors[field]) pendingRevalidation.current.add(field);
    }
  }

  /** Re-checks a field on the way out of it.
   *
   * `markTouched` is false for the two dropdowns. A text box that has been entered and left empty
   * has been answered — with nothing — and saying so is useful. A dropdown that was merely opened
   * and closed has not been answered at all, and the shared CustomSelect counts a click anywhere
   * on the page as leaving it, so treating that as an answer is how Country and City ended up
   * scolding a reader who was still working. They wait for Register instead; the check still runs,
   * so once a message is on screen it clears the moment a value is picked. */
  function blurValidate(field: JourneyField, markTouched = true) {
    if (markTouched) setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: JOURNEY_VALIDATORS[field](data) }));
  }

  /** The message to render under a field, or undefined while it must stay quiet. */
  function showError(field: JourneyField): string | undefined {
    return submitAttempted || touched[field] ? errors[field] || undefined : undefined;
  }

  function submit() {
    if (submitting) return;
    setSubmitAttempted(true);
    const all = validateAll(data);
    setErrors(all);
    const invalid = firstInvalidField(all);
    if (invalid) {
      document.querySelector<HTMLElement>(FIELD_FOCUS_TARGET[invalid])?.focus();
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    const snapshot = data;
    void (async () => {
      try {
        await postEnquiry(snapshot);
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  }

  return { data, submitting, submitted, submitError, update, blurValidate, showError, submit };
}

export type JourneyFormController = ReturnType<typeof useJourneyForm>;
