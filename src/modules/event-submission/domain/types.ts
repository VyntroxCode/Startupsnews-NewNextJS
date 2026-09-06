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

/**
 * End time used when the organiser doesn't set one. The submit form fills it into the field as
 * soon as a start time is picked, and the API assumes the same value for a payload that omits it —
 * one constant so the visible default and the stored default can never disagree.
 */
export const DEFAULT_END_TIME = '23:00';
/** Last minute of the day, used only for an event whose own start is later than DEFAULT_END_TIME
 * on its final day — 23:00 would then fall BEFORE the start and be rejected as an invalid range. */
export const LATEST_END_TIME = '23:59';

/** The end time to assume for a blank field. `sameDay` = the event ends on the day it starts, the
 * only case where the start time can rule the default out. */
export function resolveDefaultEndTime(startTime: string | undefined, sameDay: boolean): string {
  const start = (startTime || '').slice(0, 5);
  return sameDay && start > DEFAULT_END_TIME ? LATEST_END_TIME : DEFAULT_END_TIME;
}

/** Thrown for bad/missing input so the route can return 400 instead of 500. */
export class SubmitEventValidationError extends Error {}
