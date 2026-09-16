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
 *  STILLS are PLACEHOLDERS: Unsplash photos already vetted for /sponsor-event
 *  (see src/components/sponsor-event/eventImages.ts), standing in until real
 *  Expand North Star photography is supplied. Their `alt` describes what is in
 *  the frame. If a new host is used, add it to next.config.ts
 *  `images.remotePatterns`.
 */

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

export const ensVideos = {
  /** The big rounded video card in the hero. */
  hero: {
    src: "/images/gif/46285-446732353_medium.mp4",
    poster: "/images/expand-north-star/hero-meeting-poster.jpg",
    subject: "Business people in suits walking, shaking hands and meeting outside glass buildings (6.8s, 1280x720)",
  },
  /** The small globe beside "2025 Show numbers". */
  globe: {
    src: "/images/gif/1992-153555258_medium.mp4",
    poster: "/images/expand-north-star/globe-poster.jpg",
    subject: "Earth seen from orbit with the sun and a lens flare above the horizon (10s, 2560x1440)",
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

/** Where each call to action goes. All point at the event's own site for now. */
export const ENS_LINKS = {
  exhibit: "https://expandnorthstar.com/",
  investors: "https://expandnorthstar.com/",
  foundersPass: "https://expandnorthstar.com/",
};

const unsplash = (id: string, width = 900) =>
  `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;

export const ensImages = {
  backersPitch: {
    src: unsplash("photo-1591115765373-5207764f72e7"),
    alt: "A speaker presenting beside a screen to a seated audience in a brick-walled loft",
  },
  foundersAcademy: {
    src: unsplash("photo-1523580494863-6f3031224c94"),
    alt: "Attendees seated at round tables watching speakers in a meetup hall",
  },
  nsPlay: {
    src: unsplash("photo-1517457373958-b7bdd4587205"),
    alt: "A packed evening mixer under strings of lights",
  },
  digiHealth: {
    src: unsplash("photo-1505373877841-8d25f7d46678"),
    alt: "A presenter beside a large stage screen, facing a seated audience in a dark hall",
  },
  foundersPass: {
    src: unsplash("photo-1560439514-4e9645039924", 1400),
    alt: "A crowded expo floor seen from above, attendees moving between stands",
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
  dayStepOne: {
    src: unsplash("photo-1560439514-4e9645039924"),
    alt: "A crowded expo floor seen from above, attendees moving between stands",
  },
  dayStepTwo: {
    src: unsplash("photo-1591115765373-5207764f72e7"),
    alt: "A speaker presenting beside a screen to a seated audience in a brick-walled loft",
  },
  daySoonA: {
    src: unsplash("photo-1517457373958-b7bdd4587205"),
    alt: "A packed evening mixer under strings of lights",
  },
  daySoonB: {
    src: unsplash("photo-1587825140708-dfaf72ae4b04"),
    alt: "A full auditorium seated around a central stage with a speaker in the middle",
  },
  daySoonC: {
    src: unsplash("photo-1505373877841-8d25f7d46678"),
    alt: "A presenter beside a large stage screen, facing a seated audience in a dark hall",
  },
  daySoonD: {
    src: unsplash("photo-1523580494863-6f3031224c94"),
    alt: "Attendees seated at round tables watching speakers in a meetup hall",
  },
} satisfies Record<string, EnsImage>;
