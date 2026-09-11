export interface SponsorEventFormData {
  title: string;
  slug: string;
  /** Canonical location string ("Bengaluru, India") — what the API validates and emails. It is
   * COMPOSED from the four structured fields below by `useSponsorEventForm`; the form no longer
   * asks for it directly. Keeping it as the canonical value is what let the Country/City split
   * happen without touching the API contract. */
  location: string;
  country: string;
  countryOther: string;
  city: string;
  cityOther: string;
  externalUrl: string;

  date: string;
  time: string;
  description: string;

  posterUrl: string;
  posterFilename: string;

  contactName: string;
  contactEmail: string;
  /** Canonical phone string ("+91 9876543210"), composed from the three fields below. New field —
   * the API had no phone at all, so the route was extended to carry it into the notification
   * email; without that the number would have been collected and silently dropped. */
  phone: string;
  phoneCode: string;
  phoneCodeCustom: string;
  phoneNumber: string;
}

export type FieldErrors = Record<string, string>;

export function createInitialFormData(): SponsorEventFormData {
  return {
    title: "",
    slug: "",
    location: "",
    country: "",
    countryOther: "",
    city: "",
    cityOther: "",
    externalUrl: "",

    date: "",
    time: "",
    description: "",

    posterUrl: "",
    posterFilename: "",

    contactName: "",
    contactEmail: "",
    phone: "",
    phoneCode: "+91",
    phoneCodeCustom: "",
    phoneNumber: "",
  };
}
