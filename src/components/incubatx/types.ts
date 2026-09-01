export interface IncubatxFileRef {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export type DocumentField = "companyProfile" | "incorporationCert" | "dpiitCert" | "stateStartupCert" | "gstCert";

export const STAGES = ["Idea", "Prototype", "MVP", "Early Revenue", "Growth Stage"] as const;
export type Stage = (typeof STAGES)[number];

/** Client-side form state for the IncubatX dossier. Field names match the brief's Q1-Q20
 * mapping. `sectorChoice`/`sectorOther` and `phoneCode`/`phoneCodeCustom` are UI-only splits of
 * a single logical field (sector, mobile) — same pattern as /submit-event's country/city
 * "Other (add manually)" fields — collapsed into one value at submit time. */
export interface IncubatxDossierData {
  startupName: string;
  websiteUrl: string;
  email: string;
  phoneCode: string;
  phoneCodeCustom: string;
  mobile: string;
  founders: string[];

  stage: Stage | "";
  sectorChoice: string;
  sectorOther: string;
  linkedin: string[];
  description: string;

  marketOpportunity: string;
  businessModel: string;
  monthlyRevenue: string;
  annualRevenue: string;
  customerCount: string;

  revenueLastFy: string;
  hasRaised: boolean | null;
  totalFundingRaised: string;
  fullTimeCount: string;
  partTimeCount: string;

  companyProfile: IncubatxFileRef | null;
  incorporationCert: IncubatxFileRef | null;
  dpiitCert: IncubatxFileRef | null;
  stateStartupCert: IncubatxFileRef | null;
  gstCert: IncubatxFileRef | null;

  /** Honeypot — must stay empty. Real users never see or fill this field. */
  website_hp: string;
  /** Timestamp (ms) the form first mounted — submit is rejected if this is too recent. */
  startedAt: number;
}

export type FieldErrors = Record<string, string>;

export function createInitialDossierData(): IncubatxDossierData {
  return {
    startupName: "",
    websiteUrl: "",
    email: "",
    phoneCode: "+91",
    phoneCodeCustom: "",
    mobile: "",
    founders: [""],

    stage: "",
    sectorChoice: "",
    sectorOther: "",
    linkedin: [""],
    description: "",

    marketOpportunity: "",
    businessModel: "",
    monthlyRevenue: "",
    annualRevenue: "",
    customerCount: "",

    revenueLastFy: "",
    hasRaised: null,
    totalFundingRaised: "",
    fullTimeCount: "",
    partTimeCount: "",

    companyProfile: null,
    incorporationCert: null,
    dpiitCert: null,
    stateStartupCert: null,
    gstCert: null,

    website_hp: "",
    startedAt: Date.now(),
  };
}

/** The sector actually being reported — "Other" resolves to whatever the founder typed. */
export function resolvedSector(data: IncubatxDossierData): string {
  return data.sectorChoice === "Other" ? data.sectorOther.trim() : data.sectorChoice;
}

export const TOTAL_STEPS = 5;

export const STEP_LABELS = ["Identity", "Positioning", "Market & Model", "Financials & Team", "Documents"];
