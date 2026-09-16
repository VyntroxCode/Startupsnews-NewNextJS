/**
 * Attendance geofencing — decides whether a browser-reported GPS fix is close enough to the
 * configured office point for a punch to be accepted. Framework-agnostic (no React, no Next,
 * no DB) so it is usable from the service layer, the API routes, and any client surface.
 *
 * The rule (agreed policy, see agent.md → HR Tool → geofencing):
 *   - no reading at all              → GEOFENCE_LOCATION_REQUIRED
 *   - accuracy worse than 100 m      → GEOFENCE_IMPRECISE (a coarse IP/cell fix says nothing about a 50 m fence)
 *   - distance > radius + slack      → GEOFENCE_OUTSIDE, where slack = min(reported accuracy, 50 m)
 *   - otherwise                      → ok
 * The slack exists because phone GPS is routinely 10–30 m off outdoors and worse indoors; a
 * strict radius would reject people sitting at their desk.
 */

export interface GeoPoint { lat: number; lng: number; }
export interface GeofenceRule { lat: number; lng: number; radiusM: number; }
export interface GeoReading extends GeoPoint { accuracyM: number | null; }

/** Shape accepted from the client in the punch request body (after parsePunchLocation). */
export interface PunchLocationInput { lat: number; lng: number; accuracy: number | null; }

/** Readings with a reported accuracy worse than this are rejected outright. */
export const GEOFENCE_MAX_ACCURACY_M = 100;
/** At most this much of the reported accuracy is credited back as slack on the radius. */
export const GEOFENCE_MAX_SLACK_M = 50;

export type GeofenceCode = 'GEOFENCE_LOCATION_REQUIRED' | 'GEOFENCE_IMPRECISE' | 'GEOFENCE_OUTSIDE';

export type GeofenceVerdict =
  | { ok: true; distanceM: number; allowedM: number }
  | { ok: false; code: GeofenceCode; message: string; distanceM: number | null; allowedM: number };

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points in metres (haversine). */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidGeoPoint(p: unknown): p is GeoPoint {
  if (!p || typeof p !== 'object') return false;
  const { lat, lng } = p as { lat?: unknown; lng?: unknown };
  return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
}

/** Coerces the raw `location` field of a punch request into a trusted shape, or null if it is
 * missing/malformed. Accepts numeric strings too (some clients JSON-stringify numbers). */
export function parsePunchLocation(raw: unknown): PunchLocationInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { lat?: unknown; lng?: unknown; accuracy?: unknown };
  const lat = typeof r.lat === 'string' ? Number(r.lat) : r.lat;
  const lng = typeof r.lng === 'string' ? Number(r.lng) : r.lng;
  if (!isValidGeoPoint({ lat, lng })) return null;
  const accRaw = typeof r.accuracy === 'string' ? Number(r.accuracy) : r.accuracy;
  const accuracy = typeof accRaw === 'number' && Number.isFinite(accRaw) && accRaw >= 0 ? accRaw : null;
  return { lat: lat as number, lng: lng as number, accuracy };
}

/** Human label for the rule, shared by the punch widgets' hint and the employee Policy page. */
export function describeGeofence(rule: Pick<GeofenceRule, 'radiusM'>): string {
  return `within ${Math.round(rule.radiusM)} m of the office`;
}

export function evaluateGeofence(reading: GeoReading | null, rule: GeofenceRule, action: 'in' | 'out' = 'in'): GeofenceVerdict {
  // A hand-edited radius of 0 (or negative) would make punching impossible for everyone by
  // accident — treat anything under 1 m as 1 m. The Rules page itself clamps to >= 10.
  const radiusM = Number.isFinite(rule.radiusM) && rule.radiusM >= 1 ? rule.radiusM : 1;
  const verb = action === 'out' ? 'punch out' : 'punch in';

  if (!reading || !isValidGeoPoint(reading)) {
    return {
      ok: false, code: 'GEOFENCE_LOCATION_REQUIRED', distanceM: null, allowedM: radiusM,
      message: `Your location is required to ${verb} — allow location access and try again.`,
    };
  }

  const accuracyM = typeof reading.accuracyM === 'number' && Number.isFinite(reading.accuracyM) && reading.accuracyM >= 0
    ? reading.accuracyM
    : null;
  const distanceM = haversineMeters(reading, rule);

  if (accuracyM !== null && accuracyM > GEOFENCE_MAX_ACCURACY_M) {
    return {
      ok: false, code: 'GEOFENCE_IMPRECISE', distanceM, allowedM: radiusM,
      message: `Location too imprecise (±${Math.round(accuracyM)} m) — enable precise location or move near a window, then try again.`,
    };
  }

  const slackM = Math.min(accuracyM ?? 0, GEOFENCE_MAX_SLACK_M);
  const allowedM = radiusM + slackM;
  if (distanceM > allowedM) {
    return {
      ok: false, code: 'GEOFENCE_OUTSIDE', distanceM, allowedM,
      message: `You're ${Math.round(distanceM)} m from the office — punches are only accepted within ${Math.round(radiusM)} m.`,
    };
  }

  return { ok: true, distanceM, allowedM };
}
