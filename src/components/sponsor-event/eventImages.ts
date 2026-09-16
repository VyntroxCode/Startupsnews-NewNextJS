/** ============================================================================
 *  EVENT IMAGERY — SINGLE SOURCE OF TRUTH (stills)
 *  ============================================================================
 *
 *  Every still photograph on /sponsor-event is declared here and nowhere else
 *  (clips and their posters live in backgrounds.ts). No component holds a URL
 *  of its own, so swapping these for StartupNews.fyi's own event photography is
 *  a one-file edit.
 *
 *  These are PLACEHOLDERS: stock photography standing in for real event photos.
 *  They are never captioned or labelled as a StartupNews.fyi event — mock cards
 *  that show one say "Example".
 *
 *  Every photo was LOOKED AT (contact sheet, 2026-09-15) and its `alt` describes
 *  what is actually in the frame. The previous version of this file had alts that
 *  no longer matched their photos (a "networking conversation" that was a packed
 *  hall, a "crowd with hands raised" that was an empty auditorium) — re-check the
 *  alt whenever a `src` changes.
 *
 *  TO REPLACE: change the `src` values. If the new host is not already allowed in
 *  next.config.ts's `images.remotePatterns`, add it there too, or next/image will
 *  refuse to serve it.
 */

export interface EventImage {
  src: string;
  alt: string;
}

const unsplash = (id: string, width = 1400) =>
  `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;

export const eventImages = {
  /** "Discover" beat of the story. */
  discover: {
    src: unsplash("photo-1505373877841-8d25f7d46678", 1200),
    alt: "A presenter beside a large stage screen, facing a seated audience in a dark hall",
  },
  /** The one example event poster, reused wherever the page shows "your event" as a card, so the
   *  same imaginary event travels from the story through the process to the amplification. */
  examplePoster: {
    src: unsplash("photo-1492684223066-81342ee5ff30", 900),
    alt: "Confetti falling over a crowd under blue stage lights",
  },
} satisfies Record<string, EventImage>;

export interface ShowcaseItem extends EventImage {
  key: string;
  title: string;
  /** Who is typically in that room. */
  who: string;
  text: string;
}

/** The horizontal "Where ideas meet people" gallery — event FORMATS we partner on, not events we ran. */
export const showcaseItems: ShowcaseItem[] = [
  {
    key: "conferences",
    title: "Tech conferences",
    who: "Founders · Operators · Tech teams",
    text: "Keynotes, panels and product launches in front of full halls.",
    src: unsplash("photo-1505373877841-8d25f7d46678", 900),
    alt: "A presenter beside a large stage screen, facing a seated audience in a dark hall",
  },
  {
    key: "pitch-nights",
    title: "Pitch nights & demo days",
    who: "Founders · Investors",
    text: "Startups on stage, capital in the seats.",
    src: unsplash("photo-1591115765373-5207764f72e7", 900),
    alt: "A speaker presenting beside a screen to a seated audience in a brick-walled loft",
  },
  {
    key: "expos",
    title: "Startup expos",
    who: "Startups · Buyers · Media",
    text: "Booths, demos and a floor full of conversations.",
    src: unsplash("photo-1560439514-4e9645039924", 900),
    alt: "A crowded expo floor seen from above, attendees moving between stands",
  },
  {
    key: "mixers",
    title: "Founder mixers",
    who: "Founders · Communities",
    text: "Evenings where the real introductions happen.",
    src: unsplash("photo-1517457373958-b7bdd4587205", 900),
    alt: "A packed evening mixer under strings of lights",
  },
  {
    key: "summits",
    title: "Summits",
    who: "Leaders · Investors · Media",
    text: "Big rooms, big ideas, one shared stage.",
    src: unsplash("photo-1587825140708-dfaf72ae4b04", 900),
    alt: "A full auditorium seated around a central stage with a speaker in the middle",
  },
  {
    key: "meetups",
    title: "Community meetups",
    who: "Builders · Communities",
    text: "Smaller rooms, stronger ties.",
    src: unsplash("photo-1523580494863-6f3031224c94", 900),
    alt: "Attendees seated at round tables watching speakers in a meetup hall",
  },
];
