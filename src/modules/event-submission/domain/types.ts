import type { Speaker, SocialCreative } from '@/modules/partnership-events/domain/types';

export interface SubmitEventPayload {
  organizerName?: string;
  organizerOrg?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  title?: string;
  slug?: string;
  country?: string;
  city?: string;
  externalUrl?: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  venueAddress?: string;
  venueMapLink?: string;
  eventType?: string;
  speakers?: Speaker[];
  image1?: string;
  image3?: string;
  socialImages?: SocialCreative[];
}

/** Thrown for bad/missing input so the route can return 400 instead of 500. */
export class SubmitEventValidationError extends Error {}
