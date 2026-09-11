/** Which public page a submission was collected on. Carried on every lead form's controller from
 * the start (even though nothing is wired to a backend yet) so that whenever these forms do get
 * saved somewhere, each row already knows which page it came from without any later rework. */
export type LeadFormSource = "feature-startup" | "funding-round" | "press-release";

/** The fields every lead form on the site collects (Feature Your Startup, Submit Your Funding
 * Round, Submit Your Press Release) — the same set the shared Google Form used to collect, split
 * only by page copy/design now, not by field set.
 *
 * `phone` and `countryCity` are the CANONICAL values: one phone string, one location string, which
 * is what a submission payload would carry and what the review screens read. The structured fields
 * under them (`phoneCode`/`phoneNumber`, `country`/`city` and their "Other" free-text partners) are
 * how a page may choose to *collect* those two values — Feature Your Startup uses the site's
 * country-code phone control and the Country/City dropdowns from /list-your-event, while the other
 * two pages still take a single typed string in each. Both are kept in step by `useLeadForm`, which
 * recomposes the canonical value on every structured edit, so nothing downstream has to know or
 * care which way a given page asked. A page that never touches the structured fields leaves them
 * empty and behaves exactly as it did before they existed. */
export interface LeadFormData {
  name: string;
  companyName: string;
  /** Canonical phone string, e.g. "+91 9876543210". Composed from the three fields below on any
   * page that collects a country code; typed directly on the pages that don't. */
  phone: string;
  phoneCode: string;
  /** Free-text dial code, used only while `phoneCode` is "other". */
  phoneCodeCustom: string;
  phoneNumber: string;
  email: string;
  website: string;
  /** Canonical location string, e.g. "India, Bengaluru". Composed from the four fields below on any
   * page that collects them separately; typed directly on the pages that don't. */
  countryCity: string;
  country: string;
  /** Free-text country, used only while `country` is the "Other (add manually)" sentinel. */
  countryOther: string;
  city: string;
  /** Free-text city, used only while `city` is the "Other (add manually)" sentinel. */
  cityOther: string;
  pdfFile: File | null;
}

export type FieldErrors = Record<string, string>;

/** `overrides` seeds a page's own starting values — Feature Your Startup opens its country-code
 * select on "+91" the same way /list-your-event does, rather than on an empty "Select…" the reader
 * has to notice. Left empty, every field starts blank, which is the behavior the other two pages
 * have always had. */
export function createInitialLeadFormData(overrides?: Partial<LeadFormData>): LeadFormData {
  return {
    name: "",
    companyName: "",
    phone: "",
    phoneCode: "",
    phoneCodeCustom: "",
    phoneNumber: "",
    email: "",
    website: "",
    countryCity: "",
    country: "",
    countryOther: "",
    city: "",
    cityOther: "",
    pdfFile: null,
    ...overrides,
  };
}
