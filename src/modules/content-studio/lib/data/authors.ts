import type { Author } from "@/modules/content-studio/types";

// ── AUTHOR ROSTER ──
// Voice traits marked inferred:true are best-guesses — verify before publishing.
// LinkedIn URLs and the provided bios are as supplied by the user.
// Ported verbatim from content-studio-v17.html:718-759.
export const DEFAULT_AUTHORS: Author[] = [
  {
    id: "madhur",
    name: "Madhur Mohan Malik",
    role: "Founder, StartupNews.fyi",
    beats:
      "Global tech, cybersecurity & data, venture funding, startup ecosystem, innovation",
    bio: "Startup ecosystem builder focused on global tech, venture funding, and innovation. Writes about startups, emerging technologies, and the global venture landscape while connecting founders, investors, and ecosystem leaders through media, events, and community initiatives.",
    linkedin: "https://www.linkedin.com/in/madhurmohanmalik/",
    voice:
      "Ecosystem-insider perspective; connects individual news to the bigger funding/innovation picture; confident and forward-looking; founder-to-founder directness; opinionated but grounded.",
    patternRef: "TechCrunch breaking-news pattern",
    structure:
      'Lead paragraph states the core news fact plainly in 2 sentences — it should double as a mini-summary of the whole story. Second paragraph gives immediate context: who/what company, scale, why it matters right now. Every following paragraph is short (2-4 sentences), one idea each, no subheadings at all, no bullet summary box. Weave in 2-3 comparable prior incidents or data points by name near the end for pattern context, folded into prose rather than listed. Close on a forward-looking or open line. Voice stays matter-of-fact with occasional light scepticism ("That is a striking number.") — never breathless.',
    inferred: true,
  },
  {
    id: "kapil",
    name: "Kapil Suri",
    role: "Co-Founder & Contributing Author",
    beats:
      "Venture capital, startup funding, emerging technologies, international ecosystem trends",
    bio: "Business builder, writer, and Co-Founder of StartupNews.fyi. Over two decades of cross-industry corporate leadership. Commentary bridges media narrative and ground-level execution, delivering sharp insights into the market movements shaping global innovation.",
    linkedin: "https://www.linkedin.com/in/kapil-suri-3986307/",
    voice:
      "Seasoned operator lens; bridges narrative and execution; sharp, measured, analytical; draws on cross-industry leadership; reads market movements over hype.",
    patternRef: "Inc42 narrative business-journalism pattern",
    structure:
      'Open with a dense factual paragraph naming the company, what it does, and the business decision or move at the centre of the story. Blend any real founder/executive reasoning from the source with concrete data points (funding, revenue, market size) rather than abstract claims. Use one to two subheadings to break out strategic sections such as "Why It Matters" or "What Is Next." Keep standout figures inside normal paragraphs, never in a separate callout box. Close by setting the move inside the broader category trend, naming two or three comparable companies for context. Confident, operator-to-operator tone — reads market moves, not hype.',
    inferred: true,
  },
  {
    id: "kanak",
    name: "Kanak Aggarwal",
    role: "Contributing Author",
    beats:
      "Corporate moves, funding & governance, consumer tech, marketing & creator economy",
    bio: "[Add verified one-line bio]",
    linkedin: "https://www.linkedin.com/in/kanak-aggarwal-2249742b1/",
    voice:
      "Marketing and business-desk angle; audience-and-growth framing; accessible, trend-aware; reads tech and corporate news through brand, distribution and market impact.",
    patternRef: "Entrackr exclusive/filing-based pattern",
    structure:
      'Ultra-tight, roughly 400-500 words, four short paragraphs, no bullet box, no subheadings. Paragraph 1: company name plus the single core fact, sourced ("according to its regulatory filing", "as per sources aware of the development", "as per media reports"). Paragraph 2: the specific named details behind that fact — people, amounts, dates. Paragraph 3: one-line company background — founders, founding year, sector, business model. Paragraph 4: sector-wide context naming two to four comparable companies. Zero adjectives without a fact behind them, zero invented quotes, every named claim carries a sourcing phrase.',
    inferred: true,
  },
  {
    id: "sreejit",
    name: "Sreejit Kumar",
    role: "Contributing Author",
    beats: "Tech, startups, product, emerging technology, venture funding",
    bio: "[Add verified one-line bio]",
    linkedin: "https://www.linkedin.com/in/sreejit-kumar-97333b227/",
    voice:
      "Straightforward tech-explainer voice; clear, no-fluff; product-and-implications focus; curious and analytical.",
    patternRef: "YourStory funding-news pattern",
    structure:
      "Lead paragraph states who invested how much in what, then restates it with a touch more specific detail in the same paragraph. Second paragraph explains what the capital will fund. Third paragraph gives quick company background: founding year, HQ, founder names, one or two scale metrics. Include one short attributed quote only if a genuine quote exists in the source, framed as a company or named-spokesperson statement — never invented. Tone stays informational and positive, minimal scepticism, no adjective without a backing fact, no subheadings.",
    inferred: true,
  },
];

/**
 * Merge a stored roster with the defaults.
 *
 * Self-heal: if a saved roster is missing one of the core team ids (e.g. saved
 * from an older roster before someone was added), re-add the default entry so
 * category → author mapping never silently points at a nonexistent author.
 * Ported from `loadAuthors()`, content-studio-v17.html:761-772.
 */
export function mergeAuthors(stored: Author[] | null): Author[] {
  const list: Author[] =
    Array.isArray(stored) && stored.length
      ? structuredClone(stored)
      : structuredClone(DEFAULT_AUTHORS);

  for (const def of DEFAULT_AUTHORS) {
    if (!list.some((a) => a.id === def.id)) list.push(structuredClone(def));
  }
  return list;
}

export function blankAuthor(): Author {
  return {
    id: "a" + Date.now(),
    name: "",
    role: "Contributing Author",
    beats: "",
    bio: "",
    linkedin: "",
    voice: "",
    inferred: true,
  };
}
