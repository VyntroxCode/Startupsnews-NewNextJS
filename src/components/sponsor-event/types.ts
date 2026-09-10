export interface SponsorEventFormData {
  title: string;
  slug: string;
  location: string;
  externalUrl: string;

  date: string;
  time: string;
  description: string;

  posterUrl: string;
  posterFilename: string;

  contactName: string;
  contactEmail: string;
}

export type FieldErrors = Record<string, string>;

export function createInitialFormData(): SponsorEventFormData {
  return {
    title: "",
    slug: "",
    location: "",
    externalUrl: "",

    date: "",
    time: "",
    description: "",

    posterUrl: "",
    posterFilename: "",

    contactName: "",
    contactEmail: "",
  };
}
