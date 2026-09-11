/** The 2 chapters of the Submit Your Funding Round experience — one that collects everything, and
 * a review. It was three (company & founder / contact & presence / review) until the two field
 * chapters were merged on request: they came to six fields between them, which is one short screen,
 * and splitting them made the reader scroll past a chapter header to reach an email box. Deliberately
 * mapped onto the fields this page actually collects out of `useLeadForm`'s `LeadFormData` (name,
 * companyName, phone, email, website, countryCity) — not the richer "funding amount / round /
 * investors" field set an idealized brief might assume, since none of those exist in the backend
 * and this redesign was explicitly told not to invent fields it doesn't have. The shared `pdfFile`
 * field is deliberately NOT collected here: the funding-deck upload chapter was removed from this
 * page, so nothing on it asks for a PDF any more. `pdfFile` still exists on the shared type for
 * the other two lead forms (Feature Your Startup, Submit Your Press Release), which do upload one. */
export interface ChapterMeta {
  id: string;
  label: string;
}

/** No `n`: the progress rail used to print "01 Your Details" and the chapter headers a big ghost
 * number, and all numbering was removed from this page on request. The rail now marks the current
 * chapter by state alone, which is what it always distinguished on anyway. */
export const CHAPTERS: ChapterMeta[] = [
  { id: "details", label: "Your Details" },
  { id: "review", label: "Review" },
];
