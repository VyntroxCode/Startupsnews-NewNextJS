/** Every photograph used on /submit-funding-round, in one place.
 *
 * These are placeholders (Unsplash) until real StartupNews.fyi funding imagery exists. Swapping
 * them should mean editing this file and nothing else — no component imports an image URL
 * directly, and the scroll-driven journey reads its five frames straight out of JOURNEY_VISUALS
 * below.
 *
 * Every photograph here has been DOWNLOADED AND LOOKED AT, and its `alt` describes what is
 * actually in the frame. That is not pedantry — picking stock by guessing from the URL slug has
 * put a photo of banknotes where research documents belonged elsewhere on this site. If you add a
 * slot, fetch the image and look at it before you write its alt.
 *
 * `w=1600` on the full-width slots and `w=1200` on the inset ones keeps the payload sane;
 * next/image re-encodes and serves the right width per breakpoint anyway (see next.config.ts,
 * which already allow-lists images.unsplash.com). */
export interface FundingImage {
  src: string;
  alt: string;
}

/* The `showcase` slot was removed with the mock funding-story preview it fed (log #719). */
export const fundingImages = {
  hero: {
    src: "https://images.unsplash.com/photo-1624555130581-1d9cca783bc0?w=1600&q=80&auto=format&fit=crop",
    alt: "A meeting in progress around a long boardroom table, city windows behind",
  },
  story: {
    src: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1400&q=80&auto=format&fit=crop",
    alt: "A founder presenting at a whiteboard covered in sticky notes while the team listens from sofas",
  },
  milestone: {
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80&auto=format&fit=crop",
    alt: "Someone addressing a seated team with a microphone at an all-hands in a brick-walled office",
  },
  investors: {
    src: "https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=1200&q=80&auto=format&fit=crop",
    alt: "Five people around a wooden table with open laptops, mid-conversation",
  },
  capital: {
    src: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&q=80&auto=format&fit=crop",
    alt: "A hand-drawn line chart in a notebook on a dark wooden desk, a pen and a steel ruler beside it",
  },
  growth: {
    src: "https://images.unsplash.com/photo-1730382624709-81e52dd294d4?w=1200&q=80&auto=format&fit=crop",
    alt: "A hand placing the last wooden block on top of a rising staircase of blocks",
  },
  nextChapter: {
    src: "https://images.unsplash.com/photo-1681949287382-052ea3954a51?w=1200&q=80&auto=format&fit=crop",
    alt: "A team standing and talking beside framed plans pinned to a wall, notebooks in hand",
  },
} as const satisfies Record<string, FundingImage>;

/** The five frames of the pinned journey section, in scroll order. Each one is a photograph plus
 * the words that belong to it — kept together here rather than split across the component so the
 * whole sequence can be re-ordered, extended or re-shot by editing one array. */
export interface JourneyFrame {
  key: string;
  step: string;
  title: string;
  body: string;
  image: FundingImage;
}

export const JOURNEY_VISUALS: JourneyFrame[] = [
  {
    key: "milestone",
    step: "01",
    title: "The Milestone",
    body: "A round closing is the moment a private effort becomes a public fact. Before the number means anything to anyone else, it has to be told as something that happened.",
    image: fundingImages.milestone,
  },
  {
    key: "investors",
    step: "02",
    title: "The Investors",
    body: "Who backed it says as much as how much. A lead, a syndicate, an angel who came in early: each name is a piece of context a reader uses to place your company.",
    image: fundingImages.investors,
  },
  {
    key: "capital",
    step: "03",
    title: "The Capital",
    body: "The amount is the headline, but it is not the story. What the capital buys (runway, a team, a market you could not reach yet) is what makes it worth reading.",
    image: fundingImages.capital,
  },
  {
    key: "growth",
    step: "04",
    title: "The Growth",
    body: "Funding is a starting gun, not a finish line. The plan behind the round is the part founders, operators and future investors actually want to understand.",
    image: fundingImages.growth,
  },
  {
    key: "next",
    step: "05",
    title: "The Next Chapter",
    body: "Rounds compound. The story you publish today is the context for the next one, and the record anyone checks when they look your company up a year from now.",
    image: fundingImages.nextChapter,
  },
];
