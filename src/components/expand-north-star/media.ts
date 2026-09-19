/** ============================================================================
 *  EXPAND NORTH STAR — MEDIA & LINKS, SINGLE SOURCE OF TRUTH
 *  ============================================================================
 *
 *  Every clip, still, logo and outbound link on /expand-north-star is declared
 *  here and nowhere else, so swapping a photo or pointing a button somewhere new
 *  is a one-file edit.
 *
 *  CLIPS live in `public/images/gif/` (supplied by the team). They sit under
 *  `/images/` on purpose: src/proxy.ts's matcher skips `images`, so the browser's
 *  byte-range requests while streaming never run the proxy. Each `poster` is the
 *  clip's own first frame, so the swap from poster to video never pops.
 *
 *  The "What's new", Founder's Pass and most delegation-day stills are the event's own photos, served from S3 through the image CDN (see
 *  s3Image below). The remaining STILLS are PLACEHOLDERS: Unsplash photos already vetted for /sponsor-event
 *  (see src/components/sponsor-event/eventImages.ts), standing in until real
 *  Expand North Star photography is supplied. Their `alt` describes what is in
 *  the frame. If a new host is used, add it to next.config.ts
 *  `images.remotePatterns`.
 */

import { toCdnUrl } from "@/shared/utils/image-cdn";

export interface EnsVideoSpec {
  src: string;
  poster: string;
  /** What is in the footage — for the next person choosing a replacement, not for the DOM. */
  subject: string;
}

export interface EnsImage {
  src: string;
  alt: string;
}

/** Our own photography, stored in the site's S3 bucket and served through the image CDN.
 *
 * Built the way the rest of the site treats bucket images: the canonical S3 object URL
 * (NEXT_PUBLIC_IMAGE_BASE_URL + key), then `toCdnUrl`, which rewrites it to the CloudFront host
 * (NEXT_PUBLIC_IMAGE_CDN_URL, images.startupnews.fyi) when that is configured and leaves the S3 URL
 * as-is when it isn't. Both hosts are already allowed in next.config.ts `images.remotePatterns`.
 *
 * Keys follow the admin-upload layout (S3_UPLOAD_PREFIX/uploads/YYYY/MM/…). The files were
 * uploaded from public/images/expand-north-star/ (2.jpg–6.jpg and the delegation PNGs) on 2026-09-17,
 * and the hero poster on 2026-09-19 (the last still image on this page that was still served from
 * `public/` — see `public/images/expand-north-star/` in the repo's history for how it looked before),
 * with a one-year Cache-Control; to swap a photo, upload under a NEW key and change it here, since
 * the CDN caches each key for a year. Declared ahead of `ensVideos` below because it uses this. */
const S3_IMAGE_BASE = (
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "https://startupnews-media-2026.s3.us-east-1.amazonaws.com"
).replace(/\/$/, "");

const s3Image = (key: string) => toCdnUrl(`${S3_IMAGE_BASE}/${key}`);

export const ensVideos = {
  /** The big rounded video card in the hero. The clip itself stays a local file (see the file
   * header: public/images/gif/ is deliberately skipped by src/proxy.ts's matcher so byte-range
   * requests while streaming/seeking never hit the proxy); only the poster — a plain still image,
   * fetched whole like any other, not byte-range streamed — moved to S3 with the rest of this
   * page's photography (2026-09-19). */
  hero: {
    src: "/images/gif/46285-446732353_medium.mp4",
    poster: s3Image("startupnews-in/uploads/2026/09/expand-north-star/hero-meeting-poster.jpg"),
    subject: "Business people in suits walking, shaking hands and meeting outside glass buildings (6.8s, 1280x720)",
  },
} satisfies Record<string, EnsVideoSpec>;

/** The event lockup in the page's own top bar: Expand North Star · Dubai Chamber Digital ·
 * GITEX Global · Summit and Expo dates. */
export const ENS_LOGO = {
  src: "/images/gif/ENS-Logo-lockups-2026_-18.png",
  width: 1920,
  height: 245,
  alt: "Expand North Star, hosted by Dubai Chamber Digital, inspired by GITEX Global. Summit 7 Dec 2026, Dubai World Trade Centre. Expo 8 to 10 Dec 2026, Expo City Dubai.",
};

const unsplash = (id: string, width = 900) =>
  `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;

/** The Dubai Konnect mark, beside "Launchpad Middle East" in the event bar. Prepared from the team's
 * WhatsApp image (public/images/expand-north-star/WhatsApp Image 2026-09-17 at 12.10.55 PM.jpeg,
 * 1600×931 on a light-grey ground): the ground made transparent, cropped to the mark, and the white
 * "konnect" — which would vanish on the bar's pale pink — set in the page's ink. 900×517 PNG. */
export const DUBAI_KONNECT_LOGO = {
  src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/dubai-konnect-logo.png"),
  width: 900,
  height: 517,
  alt: "Dubai Konnect",
};

/** The "Our partners" strip's referral-partner logos (EnsPartners.tsx / referralPartnerLogos.ts) —
 * who is being referred by, on the closing form's "Referred By" list. Supplied by the user into
 * public/images/expand-north-star/logo_slider/ (2026-09-19), uploaded here the same way every
 * other image on this page is (S3 + CDN, one-year cache; see s3Image above), and the local folder
 * deleted once these keys were confirmed live. Keyed by the same slug as
 * `modules/ens-travel-enquiries/domain/sources.ts`'s `REFERRED_BY_OPTIONS`. */
export const ENS_REFERRAL_LOGOS: Record<string, string> = {
  "easy-knowledge-club": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-easy-knowledge-club.png"),
  "venture-wolf": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-venture-wolf.jpg"),
  "billennium-divas": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-billennium-divas.png"),
  "xcel-ventures": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-xcel-ventures.jpg"),
  "confederation-of-indian-startups": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-confederation-of-indian-startups.webp"),
  "usp-house": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-usp-house.jpg"),
  "angel-bay": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-angel-bay.jpg"),
  "meet-day-ai": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-meet-day-ai.jpg"),
  "hbf-direct": s3Image("startupnews-in/uploads/2026/09/expand-north-star/referral-hbf-direct.jpg"),
};

export const ensImages = {
  /* "What's new in 2026" cards (WhatsNew.tsx), in the order the images were numbered. */
  backersPitch: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/whats-new-2.jpg"),
    alt: "A speaker with a microphone presenting on the Spotlight Stage at Expand North Star",
  },
  foundersAcademy: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/whats-new-3.jpg"),
    alt: "Founders and visitors discussing a two-wheeled mobility device at an exhibitor stand",
  },
  nsPlay: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/whats-new-4.jpg"),
    alt: "Visitors checking in at the Expand North Star exhibitors, visitors and delegates registration desk",
  },
  digiHealth: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/whats-new-5.jpg"),
    alt: "A panellist speaking into a microphone during a roundtable discussion",
  },
  /* "One day. One pod. Global exposure." — the Founder's Pass photo (FoundersPass.tsx). */
  foundersPass: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/founders-pass-6.jpg"),
    alt: "Visitors and founders moving between startup pods on the Expand North Star show floor",
  },
  themeFounder: {
    src: unsplash("photo-1587825140708-dfaf72ae4b04"),
    alt: "A full auditorium seated around a central stage with a speaker in the middle",
  },
  themeCapital: {
    src: unsplash("photo-1591115765373-5207764f72e7"),
    alt: "A speaker presenting beside a screen to a seated audience in a brick-walled loft",
  },
  themeDeeptech: {
    src: unsplash("photo-1505373877841-8d25f7d46678"),
    alt: "A presenter beside a large stage screen, facing a seated audience in a dark hall",
  },
  themeScaleup: {
    src: unsplash("photo-1523580494863-6f3031224c94"),
    alt: "Attendees seated at round tables watching speakers in a meetup hall",
  },
  /* Delegation programme day cards (DelegationDays.tsx). */
  /* Day 1 and Day 6 are the team's own day-by-day trip photos, supplied into src/asset/ on
   * 2026-09-19 (heic-convert for the iPhone HEIC pair), uploaded to S3 + CDN and the local files
   * deleted once confirmed live. Day 5's first upload (delegation-day-5-ens-day4.jpg) was rotated
   * 180° on a wrong guess that the source was upside down — it wasn't, so that key is orphaned;
   * ens-day4-v2.jpg below was the corrected version, superseded the same day by the Day 5 photo
   * below (user supplied a replacement URL). Days 2-5 (2026-09-19, second pass) are third-party
   * editorial/press photos of GITEX Global / Expand North Star the user linked directly (Squarespace,
   * offshore-technology.com, wired.com, newsonair.gov.in) — downloaded and re-hosted through this
   * page's own S3 + CDN pipeline rather than hotlinked, same as every other image here, but their
   * copyright sits with the original outlets/photographers (one filename references Shutterstock
   * stock licensed to offshore-technology.com); this page has no license of its own for them, so
   * flagged for the user to confirm usage rights before treating this as settled. */
  dayLaunchpad: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/delegation-day-1-launchpad.jpg"),
    alt: "A speaker presenting the Launchpad Middle East programme to a seated audience",
  },
  dayEnsOne: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/delegation-day-2-panel-gitex.jpg"),
    alt: "A four-person panel discussion on stage at GITEX Global North Star in Dubai",
  },
  dayEnsTwo: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/delegation-day-3-huawei-floor.jpg"),
    alt: "A crowded GITEX Global show floor beneath a large illuminated Huawei sign",
  },
  dayEnsThree: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/delegation-day-4-north-star-walkway.jpg"),
    alt: "Attendees walking through a busy Expand North Star exhibition corridor",
  },
  dayEnsFour: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/delegation-day-5-gitex-sign.jpg"),
    alt: "The illuminated GITEX Global sign above a crowd of attendees",
  },
  dayDeparture: {
    src: s3Image("startupnews-in/uploads/2026/09/expand-north-star/delegation-day-6-departure.jpg"),
    alt: "The Dubai skyline at night with the Museum of the Future and Sheikh Zayed Road traffic trails",
  },
} satisfies Record<string, EnsImage>;
