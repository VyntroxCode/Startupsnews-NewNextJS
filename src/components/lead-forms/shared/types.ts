/** Which public page a submission was collected on. Carried on every lead form's controller from
 * the start (even though nothing is wired to a backend yet) so that whenever these forms do get
 * saved somewhere, each row already knows which page it came from without any later rework. */
export type LeadFormSource = "feature-startup" | "funding-round" | "press-release";

/** The 7 fields every lead form on the site collects (Feature Your Startup, Submit Your Funding
 * Round, Submit Your Press Release) — the same set the shared Google Form used to collect, split
 * only by page copy/design now, not by field set. */
export interface LeadFormData {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  website: string;
  countryCity: string;
  pdfFile: File | null;
}

export type FieldErrors = Record<string, string>;

export function createInitialLeadFormData(): LeadFormData {
  return {
    name: "",
    companyName: "",
    phone: "",
    email: "",
    website: "",
    countryCity: "",
    pdfFile: null,
  };
}
