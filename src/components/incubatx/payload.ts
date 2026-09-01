import { resolvedSector, type IncubatxDossierData } from "./types";
import type { IncubatxDossierInput } from "@/lib/validation/incubatx-dossier";

/**
 * Maps UI form state to the schema's expected input shape. The two aren't identical on
 * purpose: UI state has sentinel/uncommitted values the schema doesn't need to know about
 * (`hasRaised: null` for "not answered yet", `sectorChoice`/`sectorOther` split instead of one
 * `sector` string, `null` for an unset file instead of `undefined`, blank repeatable rows the
 * user hasn't filled in yet). Empty founder/LinkedIn rows are dropped here — "empty rows are
 * dropped before validation, not flagged" — not treated as validation failures.
 */
export function buildDossierPayload(data: IncubatxDossierData): IncubatxDossierInput {
  return {
    startupName: data.startupName,
    websiteUrl: data.websiteUrl,
    email: data.email,
    phoneCode: data.phoneCode,
    phoneCodeCustom: data.phoneCodeCustom,
    mobile: data.mobile,
    founders: data.founders.filter((f) => f.trim() !== ""),

    stage: data.stage as IncubatxDossierInput["stage"],
    sector: resolvedSector(data),
    linkedin: data.linkedin.filter((l) => l.trim() !== ""),
    description: data.description,

    marketOpportunity: data.marketOpportunity,
    businessModel: data.businessModel,
    monthlyRevenue: data.monthlyRevenue,
    annualRevenue: data.annualRevenue,
    customerCount: data.customerCount,

    revenueLastFy: data.revenueLastFy,
    hasRaised: data.hasRaised ?? undefined,
    totalFundingRaised: data.hasRaised ? data.totalFundingRaised : undefined,
    fullTimeCount: data.fullTimeCount,
    partTimeCount: data.partTimeCount,

    companyProfile: data.companyProfile ?? undefined,
    incorporationCert: data.incorporationCert ?? undefined,
    dpiitCert: data.dpiitCert ?? undefined,
    stateStartupCert: data.stateStartupCert ?? undefined,
    gstCert: data.gstCert ?? undefined,

    website_hp: data.website_hp,
    startedAt: data.startedAt,
  } as IncubatxDossierInput;
}
