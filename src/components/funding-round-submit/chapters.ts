/** The 3 visual chapters of the redesigned Submit Your Funding Round experience. Deliberately
 * mapped onto the fields this page actually collects out of `useLeadForm`'s `LeadFormData` (name,
 * companyName, phone, email, website, countryCity) — not the richer "funding amount / round /
 * investors" field set an idealized brief might assume, since none of those exist in the backend
 * and this redesign was explicitly told not to invent fields it doesn't have. The shared `pdfFile`
 * field is deliberately NOT collected here: the funding-deck upload chapter was removed from this
 * page, so nothing on it asks for a PDF any more. `pdfFile` still exists on the shared type for
 * the other two lead forms (Feature Your Startup, Submit Your Press Release), which do upload one. */
export interface ChapterMeta {
  id: string;
  n: string;
  label: string;
}

export const CHAPTERS: ChapterMeta[] = [
  { id: "company", n: "01", label: "Company & Founder" },
  { id: "contact", n: "02", label: "Contact & Presence" },
  { id: "review", n: "03", label: "Review" },
];
