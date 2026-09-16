"use client";

import { useLeadForm, type LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { resolveCity, resolveCountry } from "@/components/lead-forms/shared/compose";
import type { LeadFormData } from "@/components/lead-forms/shared/types";

/** The country-code select opens on India, as /list-your-event's and Feature Your Startup's do —
 * an unset code reads as one more thing to fill in. */
const FUNDING_ROUND_INITIAL = { phoneCode: "+91" };

/** Saves the submission to `funding_round_submissions`, which the admin Sales Tracker lists under
 * its "Submit Your Funding Round" KPI card. Country and city are sent separately and already
 * resolved (the picked value, or what was typed under "Other"), so the admin edit form can reopen
 * them in the same dropdowns. Throwing keeps the form on screen with the message shown. */
async function submitFundingRound(data: LeadFormData): Promise<void> {
  const res = await fetch("/api/submit-funding-round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name.trim(),
      companyName: data.companyName.trim(),
      phone: data.phone,
      email: data.email.trim(),
      website: data.website.trim(),
      country: resolveCountry(data),
      city: resolveCity(data),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error((json && typeof json.error === "string" && json.error) || "We couldn't submit your details. Please try again.");
  }
}

export function useFundingRoundForm() {
  return useLeadForm("funding-round", undefined, FUNDING_ROUND_INITIAL, submitFundingRound);
}

export type FundingRoundFormController = LeadFormController;
