/** ============================================================================
 *  EVENT IMAGERY — SINGLE SOURCE OF TRUTH
 *  ============================================================================
 *
 *  Every photograph used anywhere on /sponsor-event is declared here and nowhere
 *  else. No component holds a URL of its own, so swapping the placeholder set for
 *  StartupNews.fyi's own event photography is a one-file edit.
 *
 *  These are PLACEHOLDERS: stock photography standing in for real event photos.
 *  They are never captioned or labelled as a StartupNews.fyi event — the page
 *  says "example" wherever one is presented as an event.
 *
 *  TO REPLACE: change the `src` values below to your own image URLs. If the new
 *  host is not already allowed in next.config.ts's `images.remotePatterns`, add
 *  it there too, or next/image will refuse to serve them.
 *
 *  Keep the `alt` text meaningful when you swap a photo — it is what screen
 *  readers announce, and several of these images carry the section's only
 *  visual information.
 */

export interface EventImage {
  src: string;
  alt: string;
}

const unsplash = (id: string, width = 1600) =>
  `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;

/** Standalone images, keyed by where they appear. */
export const eventImages = {
  /** 01 — Hero background. The first thing anyone sees; keep it wide and dark enough for
   *  white text to sit on top of it. */
  hero: {
    src: unsplash("photo-1540575467063-178a50c2df87", 2000),
    alt: "A packed audience at a startup and technology conference",
  },
  /** 11 — Full-bleed emotional break between the benefits and the process. */
  energy: {
    src: unsplash("photo-1475721027785-f74eccf877e2", 2000),
    alt: "A crowd lit by stage lighting at an evening event",
  },
  /** 07 — The example event listing card. */
  showcase: {
    src: unsplash("photo-1560439514-4e9645039924", 1400),
    alt: "A speaker presenting to a seated audience in a conference hall",
  },
  /** 13 — Behind the final call to action before the form. */
  cta: {
    src: unsplash("photo-1492684223066-81342ee5ff30", 1800),
    alt: "People gathered together at an evening community event",
  },
} satisfies Record<string, EventImage>;

/** 03 — The five stages of the sticky scroll story. The image on the right changes as the
 *  reader moves through the copy on the left; order here is the order on screen. */
export interface StoryStage extends EventImage {
  n: string;
  title: string;
  description: string;
}

export const storyStages: StoryStage[] = [
  {
    n: "01",
    title: "The Event",
    description:
      "Every great event starts with a reason to bring people together — a question worth asking, or something worth showing.",
    src: unsplash("photo-1505373877841-8d25f7d46678"),
    alt: "A large audience seated at a conference keynote",
  },
  {
    n: "02",
    title: "The Audience",
    description:
      "Founders, builders, investors, operators and technology teams turn up around shared interests, not just a schedule.",
    src: unsplash("photo-1591115765373-5207764f72e7"),
    alt: "Rows of attendees listening at a technology event",
  },
  {
    n: "03",
    title: "The Connections",
    description:
      "The best events create conversations that keep going long after the stage lights go down.",
    src: unsplash("photo-1531058020387-3be344556be6"),
    alt: "Two people in conversation at a networking session",
  },
  {
    n: "04",
    title: "The Visibility",
    description:
      "An event people never hear about is a room half full. Presence across the ecosystem starts well before the doors open.",
    src: unsplash("photo-1517457373958-b7bdd4587205"),
    alt: "A working session around a table at a startup workshop",
  },
  {
    n: "05",
    title: "The Moment",
    description:
      "Get all of it right and your event stops being a date in a calendar and becomes something people remember.",
    src: unsplash("photo-1511578314322-379afb476865"),
    alt: "A crowd with hands raised at a live event",
  },
];

/** 05 — Small photographs behind the audience cards. */
export const audienceImages = {
  founders: {
    src: unsplash("photo-1523580494863-6f3031224c94", 900),
    alt: "A founder speaking on stage",
  },
  community: {
    src: unsplash("photo-1587825140708-dfaf72ae4b04", 900),
    alt: "A small group talking at a community meetup",
  },
  builders: {
    src: unsplash("photo-1559136555-9303baea8ebd", 900),
    alt: "A product team working together at a laptop",
  },
} satisfies Record<string, EventImage>;
