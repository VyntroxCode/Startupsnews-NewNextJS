/**
 * Browser geolocation for attendance punches — one shared helper so the Publisher/Event Admin
 * widget, the employee portal widget, and the Founder's HR Management view all ask for
 * location the same way and show the same wording when it fails.
 *
 * Client-only: must be called from a browser event handler (it touches `window`/`navigator`).
 * The server never trusts this — it re-checks the coordinates against the fence itself.
 */

export interface BrowserLocation { lat: number; lng: number; accuracy: number | null; }

export type BrowserLocationErrorCode =
  | 'INSECURE_CONTEXT' | 'UNSUPPORTED' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT';

export const LOCATION_ERROR_MESSAGES: Record<BrowserLocationErrorCode, string> = {
  INSECURE_CONTEXT: 'Location only works over a secure (https) connection — open this page via https and try again.',
  UNSUPPORTED: 'This browser cannot report your location — try Chrome or Safari on your phone.',
  PERMISSION_DENIED: 'Location access was blocked — allow location for this site in your browser settings, then try again.',
  POSITION_UNAVAILABLE: 'Could not determine your location — turn on GPS / Location Services and try again.',
  TIMEOUT: 'Timed out getting your location — move near a window or outdoors and try again.',
};

export class BrowserLocationError extends Error {
  code: BrowserLocationErrorCode;
  constructor(code: BrowserLocationErrorCode) {
    super(LOCATION_ERROR_MESSAGES[code]);
    this.name = 'BrowserLocationError';
    this.code = code;
  }
}

/** One fresh, high-accuracy fix. `maximumAge: 0` forces a new reading rather than a cached one
 * from wherever the phone last was; the first indoor GPS fix can take 5–15 s, hence the
 * generous default timeout — callers should show a "Getting your location…" state meanwhile. */
export function getCurrentBrowserLocation(opts?: { timeoutMs?: number }): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return reject(new BrowserLocationError('UNSUPPORTED'));
    }
    // Checked BEFORE navigator.geolocation: on plain http Chrome still exposes the API but fails
    // every call with PERMISSION_DENIED, which would wrongly tell the user they blocked it.
    if (!window.isSecureContext) return reject(new BrowserLocationError('INSECURE_CONTEXT'));
    if (!('geolocation' in navigator) || !navigator.geolocation) return reject(new BrowserLocationError('UNSUPPORTED'));

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
      }),
      (err) => {
        const code: BrowserLocationErrorCode =
          err.code === err.PERMISSION_DENIED ? 'PERMISSION_DENIED'
            : err.code === err.TIMEOUT ? 'TIMEOUT'
              : 'POSITION_UNAVAILABLE';
        reject(new BrowserLocationError(code));
      },
      { enableHighAccuracy: true, timeout: opts?.timeoutMs ?? 15000, maximumAge: 0 },
    );
  });
}

/** Extra guidance for the server's geofence `code`, rendered under the server's own message.
 * Returns null when the server message already says everything (e.g. the distance). */
export function geofenceHintFor(code: string | undefined | null): string | null {
  switch (code) {
    case 'GEOFENCE_IMPRECISE':
      return 'Tip: on iPhone enable Settings → Privacy & Security → Location Services → your browser → Precise Location. On Android make sure Location mode is set to High accuracy.';
    case 'GEOFENCE_LOCATION_REQUIRED':
      return 'Tip: reload the page and choose "Allow" when the browser asks for your location.';
    default:
      return null;
  }
}
