import { SOCIAL_PLATFORMS } from "./constants";
import { resolveEndDateTime, resolvedCity, resolvedCountry, resolvedPhoneCode } from "./validation";
import type { SubmitEventFormData } from "./types";

export function buildSubmitPayload(data: SubmitEventFormData) {
  const { endDate, endTime } = resolveEndDateTime(data);
  const phoneDigits = data.phoneNumber.replace(/\D/g, "");
  const socialImages = SOCIAL_PLATFORMS.flatMap((p) => {
    const key = `social-${p.slot}`;
    return (data.socialImages[key] || []).map((item) => ({ platform: p.key, image: item.src }));
  });

  return {
    organizerName: data.organizerName.trim(),
    organizerOrg: data.organizerOrg.trim(),
    organizerEmail: data.organizerEmail.trim(),
    organizerPhone: `${resolvedPhoneCode(data)} ${phoneDigits}`,
    title: data.title.trim(),
    slug: data.slug.trim(),
    country: resolvedCountry(data),
    city: resolvedCity(data),
    externalUrl: data.externalUrl.trim(),
    eventType: data.eventType,
    description: data.description.trim(),
    startDate: data.startDate,
    startTime: data.startTime,
    endDate,
    endTime,
    venueAddress: data.venueAddress.trim(),
    venueMapLink: data.venueMapLink.trim(),
    speakers: data.speakers.filter((s) => s.name.trim()),
    image1: data.image1,
    image3: data.image3,
    socialImages,
  };
}
