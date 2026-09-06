import { PartnershipEventsService } from '@/modules/partnership-events/service/partnership-events.service';
import { ONLINE_PARTNERSHIP_TYPE, PartnershipEventInput } from '@/modules/partnership-events/domain/types';
import { resolveDefaultEndTime, SubmitEventPayload, SubmitEventValidationError } from '../domain/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims a time to HH:MM so a client sending "18:00:00" still compares correctly against "18:00"
 * — lexicographic comparison needs both operands the same width. */
function normalizeTime(value?: string): string {
  return (value || '').slice(0, 5);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

export class EventSubmissionService {
  constructor(private partnershipEventsService: PartnershipEventsService) {}

  private validate(payload: SubmitEventPayload) {
    const organizerName = payload.organizerName?.trim();
    const organizerOrg = payload.organizerOrg?.trim();
    const organizerEmail = payload.organizerEmail?.trim();
    const organizerPhone = payload.organizerPhone?.trim();
    const title = payload.title?.trim();
    const country = payload.country?.trim();
    const city = payload.city?.trim();
    const description = payload.description?.trim();
    const startDate = payload.startDate?.trim();
    const startTime = payload.startTime?.trim();
    const venueAddress = payload.venueAddress?.trim();
    const venueMapLink = payload.venueMapLink?.trim();
    const image1 = payload.image1?.trim();

    // An online (virtual) event genuinely has no country, city, street address or map link — the
    // submit form locks/relaxes those same fields for this type, and none of them is stored. The
    // public "Online" location label is derived from the event type at render time
    // (partnershipEntityToStartupEvent), so nothing downstream needs a stand-in value here.
    const isOnline = payload.eventType?.trim() === ONLINE_PARTNERSHIP_TYPE;

    const missing: string[] = [];
    if (!organizerName) missing.push('organizer name');
    if (!organizerOrg) missing.push('company name');
    if (!organizerEmail) missing.push('organizer email');
    if (!organizerPhone) missing.push('contact number');
    if (!title) missing.push('event title');
    if (!country && !isOnline) missing.push('country');
    if (!city && !isOnline) missing.push('city');
    if (!description) missing.push('description');
    if (!startDate) missing.push('start date');
    if (!startTime) missing.push('start time');
    if (!venueAddress && !isOnline) missing.push('venue address');
    if (!venueMapLink && !isOnline) missing.push('Google Maps link');
    if (!image1) missing.push('cover image');
    if (missing.length) {
      throw new SubmitEventValidationError(`Please fill the following required fields: ${missing.join(', ')}.`);
    }

    if (!EMAIL_RE.test(organizerEmail!)) {
      throw new SubmitEventValidationError('Enter a valid organizer email address.');
    }
    // Checked only when present: optional for an online event, but a value that IS sent must be
    // a real URL either way.
    if (venueMapLink && !isValidHttpUrl(venueMapLink)) {
      throw new SubmitEventValidationError('Enter a valid Google Maps link.');
    }
    if (payload.externalUrl?.trim() && !isValidHttpUrl(payload.externalUrl.trim())) {
      throw new SubmitEventValidationError('Enter a valid registration link.');
    }
    // The end of the event must not precede its start. Resolved the same way the row is written
    // below (blank end date = start date, blank end time = DEFAULT_END_TIME) so what is checked is
    // what is stored, and compared as ISO strings rather than via `new Date()` — an unparseable
    // value there becomes `Invalid Date`, whose comparisons are all false, so it would pass silently.
    const endDate = payload.endDate?.trim() || startDate!;
    const endTime =
      normalizeTime(payload.endTime?.trim()) || resolveDefaultEndTime(startTime, endDate === startDate);
    if (`${endDate}T${endTime}` < `${startDate}T${normalizeTime(startTime)}`) {
      throw new SubmitEventValidationError('The event end date/time cannot be before the start date/time.');
    }

    return {
      organizerName: organizerName!,
      organizerOrg: organizerOrg!,
      organizerEmail: organizerEmail!,
      organizerPhone: organizerPhone!,
      title: title!,
      // Empty string, not undefined, for an online event — every one of these columns is nullable,
      // and the public mappers already handle the blanks (location falls back to the "Online"
      // label off the event type, and the detail page hides its whole venue block when both venue
      // fields are empty).
      country: country || '',
      city: city || '',
      description: description!,
      startDate: startDate!,
      startTime: startTime!,
      endDate,
      endTime,
      venueAddress: venueAddress || '',
      venueMapLink: venueMapLink || '',
      image1: image1!,
    };
  }

  private toPartnershipEventInput(payload: SubmitEventPayload): PartnershipEventInput {
    const required = this.validate(payload);

    const speakers = Array.isArray(payload.speakers)
      ? payload.speakers
          .map((s) => ({
            name: (s?.name || '').trim(),
            designation: (s?.designation || '').trim(),
            company: (s?.company || '').trim(),
            others: (s?.others || '').trim(),
          }))
          .filter((s) => s.name)
      : [];

    const socialCreatives = Array.isArray(payload.socialImages)
      ? payload.socialImages
          .map((s) => ({ platform: (s?.platform || '').trim(), image: (s?.image || '').trim() }))
          .filter((s) => s.platform && s.image)
      : [];

    const slug = payload.slug?.trim();
    const commentParts = ['Submitted via /submit-event.'];
    if (slug) commentParts.push(`Suggested slug: ${slug}`);

    return {
      eventName: required.title,
      city: required.city,
      country: required.country,
      organiser: required.organizerOrg,
      poc: required.organizerName,
      contact: required.organizerPhone,
      email: required.organizerEmail,
      website: payload.externalUrl?.trim() || undefined,
      initiatedDate: new Date().toISOString().slice(0, 10),
      eventStartDate: required.startDate,
      eventStartTime: required.startTime,
      eventEndDate: required.endDate,
      eventEndTime: required.endTime,
      venueAddress: required.venueAddress,
      googleLocationLink: required.venueMapLink,
      description: required.description,
      speakers,
      posterUrl: required.image1,
      bannerUrl: payload.image3?.trim() || undefined,
      socialCreatives,
      partnershipType: payload.eventType?.trim() || undefined,
      partnershipStatus: 'Draft',
      listing: 'Pending',
      source: 'Public Submission',
      comment: commentParts.join(' '),
    };
  }

  /** Validates the payload and creates the lead in the Partnership Tracker. */
  async submit(payload: SubmitEventPayload): Promise<{ id: number }> {
    const input = this.toPartnershipEventInput(payload);
    const { entity } = await this.partnershipEventsService.createEvent(input);
    return { id: entity.id };
  }
}
