import type { CustomSelectOption } from "@/components/ui/CustomSelect";

/** Starter business-sector/industry list — no canonical list exists elsewhere in this repo to
 * reuse (the only other "sector" field on the site, Contacts, is free text with no fixed
 * options). Seeds the searchable combobox; "Other" lets a founder type anything not listed. */
export const SECTOR_OPTIONS: CustomSelectOption[] = [
  { value: "Fintech", label: "Fintech" },
  { value: "SaaS", label: "SaaS" },
  { value: "Healthtech", label: "Healthtech" },
  { value: "Edtech", label: "Edtech" },
  { value: "Agritech", label: "Agritech" },
  { value: "D2C / E-commerce", label: "D2C / E-commerce" },
  { value: "Deeptech", label: "Deeptech" },
  { value: "AI / ML", label: "AI / ML" },
  { value: "Climate / Cleantech", label: "Climate / Cleantech" },
  { value: "Logistics & Supply Chain", label: "Logistics & Supply Chain" },
  { value: "Mobility / EV", label: "Mobility / EV" },
  { value: "Gaming", label: "Gaming" },
  { value: "Media & Entertainment", label: "Media & Entertainment" },
  { value: "Web3 / Blockchain", label: "Web3 / Blockchain" },
  { value: "Cybersecurity", label: "Cybersecurity" },
  { value: "Manufacturing / Industry 4.0", label: "Manufacturing / Industry 4.0" },
  { value: "Real Estate / Proptech", label: "Real Estate / Proptech" },
  { value: "HR Tech", label: "HR Tech" },
  { value: "Legal Tech", label: "Legal Tech" },
  { value: "Other", label: "Other (type your own)", alwaysShow: true },
];
