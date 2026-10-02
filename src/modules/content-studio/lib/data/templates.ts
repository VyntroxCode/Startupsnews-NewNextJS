import type { Template, TemplateId } from "@/modules/content-studio/types";

// ── TEMPLATES ──
// Ported verbatim from content-studio-v17.html:831-877. The `style` strings are
// tuned prompt text — do not reword them.
export const TEMPLATES: Record<TemplateId, Template> = {
  news: {
    geo: "United States",
    tone: "Newsy / analytical",
    specials: ["key_takeaways", "data_callout", "what_watch_next"],
    label: "News",
    style: `NEWS FORMAT — modeled on how TechCrunch, Reuters and Bloomberg actually file US tech news. Built for both traditional SEO and GEO (AI answer engines like Google AI Overviews, ChatGPT, Perplexity) to score 90+. Follow this layout, no deviations.

LAYOUT: Key-takeaways box → lead paragraph → body paragraphs → 1-2 <h2> subheads for anything past ~600 words → one data callout → forward-looking close.

EXACT STRUCTURE:
- Key takeaways (use <div class="key-takeaways"><ul>): 3-4 bullets, each a complete, self-contained fact a reader (or an AI answer engine) could lift verbatim — who, what, how much/when, why it matters. This is the single most important GEO element in the piece; write it last, after you know exactly what the article says, so nothing is vague.
- Lead paragraph (2-3 sentences, under 45 words total, TechCrunch-style): the single most newsworthy fact, stated plainly. Name the company or person and the action in the first sentence. No throat-clearing, no scene-setting before the news.
- Nut graf (1-2 sentences): a single, quotable, fully self-contained sentence stating what happened and why it matters, phrased so it could be read on its own as the answer to "what happened with [topic]." This is what AI Overviews and featured snippets pull.
- 2-4 body paragraphs (Bloomberg-style): specific figures, named sources, deal or product terms, direct attribution ("[Name], [exact title], said in a statement" / "according to [named source]"). Mix short (1-2 sentence) and longer (3-4 sentence) paragraphs — do not make every paragraph the same length.
- One <h2> subhead (only if the piece runs past roughly 600 words): a plain-English label a reader would actually search for, e.g. "What it means for [audience]" or "The background." Followed by 1-2 paragraphs of context — competitive landscape, funding/company history, prior related moves.
- Data callout (use <div class="data-callout">): one standout number, placed mid-article, with one line of context under it.
- Optional second <h2>: "What's next" — 1 short paragraph naming a concrete date, trigger, or open question, not a vague "time will tell" close.

VOICE: Direct, slightly skeptical insider tone, written for a US founder/operator/investor audience. Short sentences dominate; allow the occasional longer one for rhythm. Light, earned editorializing is fine ("That's a striking number for a company this size") — never breathless, never a press-release tone.

STRICT RULE: Key-takeaways box first, always. Every named number needs a source. Never more than 2 <h2> tags total. No <h2> at all if the piece is under roughly 700 words.`,
  },

  conversational: {
    geo: "United States",
    tone: "Conversational / explainer",
    specials: ["key_takeaways", "what_watch_next"],
    label: "Conversational",
    style: `CONVERSATIONAL FORMAT — modeled on how Business Insider and TechCrunch's explainer pieces talk directly to a US reader. Built for both SEO and GEO to score 90+. Follow this layout, no deviations.

LAYOUT: Key-takeaways box → direct-address opening → paragraphs with 1-2 subheads → reader-facing close.

EXACT STRUCTURE:
- Key takeaways (use <div class="key-takeaways"><ul>): 3-4 bullets in plain, spoken English — each one a complete fact someone could read out loud and have it make sense with zero other context. Write this last.
- Opening paragraph (2-3 sentences): talk to the reader like a smart friend explaining something over coffee. State what happened and immediately answer the "why should I care" question in the same paragraph. Contractions are welcome ("that's," "it's," "here's").
- Second paragraph: the "here's what happened" detail — the concrete facts, still in plain language, jargon translated the moment it appears (e.g., "a Series B, meaning its third major funding round").
- 2-3 more paragraphs: fill in the story with real specifics — numbers, names, dates, what this changes for the people affected (workers, consumers, developers, founders). Ground every claim in a fact from the source, never a generic statement.
- One <h2> subhead: a question a real person would type into Google, e.g. "So what does this actually change?" or "Why now?" Followed by 2-3 paragraphs.
- Optional second <h2>: "What to watch" — 1-2 paragraphs on what happens next, framed concretely.
- Close with a short, grounded paragraph — not an inspirational sign-off, just a clear-eyed last thought on where this leaves things.

VOICE: Warm, smart, plainspoken. Never dumbed-down or cutesy. Explains before it assumes. Rhetorical questions are fine sparingly ("So why does this matter to you?") but never more than once or twice in the whole piece. Reads like a specific person talked you through the news, not like a wiki entry.

STRICT RULE: Key-takeaways box first, always. Max 2 <h2> tags. Every jargon term gets a plain-English gloss the first time it appears.`,
  },
};

/** Hint shown under the template dropdown. content-studio-v17.html:885 */
export const TEMPLATE_HINTS: Record<TemplateId, string> = {
  news: "Punchy, sourced, TechCrunch/Bloomberg-style hard news.",
  conversational: "Warm, plainspoken explainer — Business Insider-style.",
};

/** The special-section chips in the settings bar. content-studio-v17.html:426-431 */
export const SPECIAL_SECTIONS: { val: string; label: string }[] = [
  { val: "key_takeaways", label: "Key takeaways" },
  { val: "data_callout", label: "Data callout" },
  { val: "founder_perspective", label: "Founder view" },
  { val: "what_watch_next", label: "What's next" },
  { val: "skeptics_corner", label: "Skeptic's corner" },
  { val: "historical_context", label: "History" },
];

/** content-studio-v17.html:415-417 */
export const ARTICLE_LENGTHS: { value: string; label: string }[] = [
  { value: "800-1000", label: "800–1000w — quick read" },
  { value: "1200-1500", label: "1200–1500w — standard" },
  { value: "2000-2500", label: "2000–2500w — deep dive" },
];

export const DEFAULT_LENGTH = "1200-1500";
export const DEFAULT_TEMPLATE: TemplateId = "news";
/** Chips that start enabled. content-studio-v17.html:426 */
export const DEFAULT_SPECIALS = ["key_takeaways"];
