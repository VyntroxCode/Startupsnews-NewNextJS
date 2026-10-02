import type { Article, Author, TemplateId } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// Prompt builders, ported verbatim from content-studio-v17.html:1780-1914.
//
// These strings are tuned. Do not reword them — incidental edits change
// output quality. The only intentional change from the original is that
// `buildPromptArticle` takes `templateId` as a parameter instead of reading
// `document.getElementById('template-select').value` (original line 1789),
// since this now runs on the server.
// ══════════════════════════════════════════════════════════════════

// ── OPENING-STYLE VARIETY (internal, silent — no UI, no chips. Keeps prose from
// feeling templated across many generations without asking the user to pick anything.) ──
export const OPENING_STYLES = [
  "Lead with the single most newsworthy fact, stated plainly, in the first sentence.",
  "Lead with the most surprising or counterintuitive detail in the story, then explain why it matters.",
  "Lead with the concrete number or figure that anchors the story.",
  "Lead with the specific action taken, naming who did it, before any surrounding context.",
  "Open by stating plainly what changed, then immediately say who it changes things for.",
  "Open with the company or person's name and the core fact in the same breath, wire-style.",
];

export function randomOpeningStyle(): string {
  return OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)];
}

export interface ArticlePromptArgs {
  article: Article;
  keyword: string;
  geo: string;
  length: string;
  tone: string;
  industry: string;
  tmplStyle: string;
  templateId: TemplateId;
  author: Author | null;
  openingStyle: string;
}

export function buildPromptArticle({
  article,
  keyword,
  geo,
  length,
  tone,
  industry,
  tmplStyle,
  templateId,
  author,
  openingStyle,
}: ArticlePromptArgs): string {
  let src: string;
  if (article.isTopicMode)
    src =
      "TOPIC/BRIEF FROM USER:\n" +
      article.title +
      "\n\nCreate this article entirely from your own knowledge. Write a full, authoritative piece on this topic.";
  else if (article.fullText)
    src = "FULL PAGE CONTENT FROM URL (" + article.link + "):\n" + article.fullText;
  else
    src =
      "Title: " +
      article.title +
      "\nFrom: " +
      article.feedName +
      " (" +
      article.source +
      ")\nSummary: " +
      (article.desc || "(use title)") +
      "\nURL: " +
      article.link;

  const wordRange =
    length === "800-1000" ? "800–1000" : length === "2000-2500" ? "2000–2500" : "1200–1500";

  // Per-template HTML structure rules
  const layoutRules =
    templateId === "conversational"
      ? `LAYOUT RULE: Start with <div class="key-takeaways"><ul> (3-4 plain-English bullets). Then flowing paragraphs. Then MAX 2 <h2> tags, each phrased as a question a reader would actually search. No <div class="data-callout"> unless one standout figure genuinely needs its own visual beat.`
      : `LAYOUT RULE: Start with <div class="key-takeaways"><ul> (3-4 self-contained bullets). Then the lead paragraph and nut graf. Then body paragraphs. MAX 2 <h2> tags, and none at all if the piece runs under ~700 words. Embed exactly ONE <div class="data-callout"> mid-article around the single most important figure.`;

  const pubStyle = tmplStyle
    ? `\nPUBLICATION STYLE GUIDE — follow every instruction exactly:\n${tmplStyle}\n`
    : "";

  // Author voice block
  let authorBlock = "";
  if (author) {
    authorBlock = `\nAUTHOR — write this entire piece in this real person's voice (first-person singular allowed for OPINION only, never for invented actions):
- Name: ${author.name}${author.role ? ", " + author.role : ""}
- Beats / industry: ${author.beats || "tech & startups"}
- Voice & style: ${author.voice || "clear, analytical, conversational"}
${author.structure ? `- Article structure this author follows, paragraph by paragraph: ${author.structure}` : ""}
The article should read as written by this specific person — their perspective, their judgement, their way of framing things. Carry their opinion and analytical lens throughout, not just in one section. Fit their voice inside the template's layout rules above; the template governs structure, the author governs tone.\n`;
  }

  return `You are ${author ? author.name + ", a senior journalist" : "a senior US tech journalist"}. Write a news article in the EXACT format and style described below, for a US audience, modeled on how TechCrunch and Bloomberg actually write.
${pubStyle}${authorBlock}
SOURCE:
${src}

GEO FOCUS: ${geo}
PRIMARY KEYWORD: ${keyword}
TARGET LENGTH: ${wordRange} words
TONE: ${tone}
PUBLICATION FORMAT: ${industry}

OPENING STYLE FOR THIS PIECE: ${openingStyle}
${layoutRules}

MANDATORY ORIGINAL VALUE — every piece must add at least two of the following, woven naturally into the body, not bolted on at the end:
- Original analysis or an angle other coverage is likely to miss
- US market context, competitive comparison, or what this means for the industry
- A connection to 2-3 related developments, named specifically, or a clear trend line
- A reasoned view on what happens next
Do NOT produce a one-to-one rewrite of the source. Restructure the narrative and combine the source facts with genuine context and connections from established knowledge so the piece is materially richer than a rewrite, and is not traceable to the source's wording, order, or framing.
In addition, insert this EXACT empty placeholder once, at whichever point in the body a human editor's first-hand take would fit best, and DO NOT write anything inside it. Leave it literally empty; do not invent quotes, briefings, reports, consensus, or sourcing to fill it, it is reserved for the human byline author to fill in later:
<p data-author-input="true"></p>

ABSOLUTE HONESTY RULE — fabricated first-hand experience is forbidden. Never claim the author did something they did not verifiably do: no "I tested," "I tried it," "I went to check," "I visited," "I spoke to," "I attended," "in my testing," or similar claims of personal action. First-person is allowed only for genuine opinion or analysis ("I think this matters because...", "My read is..."), never for invented actions, tests, interviews, or events. Do not invent having seen demos, used products, or met people.

HUMAN WRITING BAR — this must read as if a real staff reporter filed it, not as AI output. Before finalizing, check the piece against every rule below:
- Sentence rhythm should have real burstiness: mix short, punchy sentences (5-12 words) with longer ones (25-35 words). No two consecutive paragraphs should read at the same pace. Real reporters do not write in uniform sentence lengths.
- Contractions are fine where the tone calls for them (Conversational especially): "it's," "that's," "here's," "doesn't."
- Every claim should feel earned by a specific, concrete detail (a number, a name, a date, a quote in reported form) rather than a general statement. Cut any sentence that could apply to any company in any story.
- No two paragraphs should open with the same word or grammatical construction. No paragraph should open with a rhetorical question more than once in the whole piece.
- Avoid symmetrical, list-like paragraph structure (e.g., three paragraphs that all follow "X did Y. This means Z. Experts say W.") — real writing is uneven on purpose.

UNIVERSAL RULES:
- LANGUAGE: Write in US English ONLY. American spelling throughout (color, organization, analyze, favor, license, defense, program, center) — never British/Indian English spellings (colour, organisation, analyse, favour, licence, defence, programme, centre). American terminology and punctuation conventions (double quotes, period/comma inside quotes, MM/DD/YYYY-style date phrasing when spelled out, "Wall Street"-style number conventions).
- NO EM DASHES OR EN DASHES ANYWHERE, for any reason — not as a separator, not around a clause, not in a list. Use a comma, period, colon, or parentheses instead. This is a hard requirement; scan your own output before finalising and rewrite any sentence that contains "—" or "–".
- No emojis
- No filler phrases or AI clichés — do not use: "In conclusion", "In today's world", "It is worth noting", "delve", "deep dive", "landscape", "tapestry", "underscores", "testament to", "boasts", "leverage/leveraging", "navigate" (metaphorically), "in the realm of", "game-changer", "cutting-edge", "unlock/unlocking", "furthermore", "moreover", "it's important to note that", "at the end of the day". Write like a specific human reporter, not a generic AI summary.
- No rhetorical throat-clearing questions ("But what does this mean for X?") used as paragraph openers more than once in the piece.
- Vary sentence structure and openings — do not start more than two consecutive paragraphs the same way (same first word or grammatical pattern).
- FACTS AND NUMBERS — accuracy is non-negotiable: every number, date, percentage, currency figure, and named entity must come directly from the source material. Reproduce figures exactly as given (same units, same rounding, same currency) — do not round, convert, or restate them differently than the source. Never invent a number to fill a gap; if a figure is not in the source, describe it qualitatively instead ("a sizeable round" not "a $50 million round") or omit it.
- DEPTH — the full source content above is provided precisely so the article has substance, not just a rewritten lead paragraph: read all of it and mine details from throughout, not only the opening. Pull in specific figures, named entities, background, secondary details, dates, and context that appear anywhere in the source, including further down. Do not pad the target word count with generic filler, throat-clearing, or repeated restatements of the same one or two facts, use additional real detail from the source instead. If the source itself is thin on a section, say less there rather than inventing filler to reach length.
- Write to the geo focus: US examples, US company comparisons, US-relevant regulatory or market context.
- STRIP SOURCE FINGERPRINTS: never include the source outlet's name, another publication's byline, or source calls-to-action (e.g. "Follow ZDNET", "Add us as a preferred source", "Read more on TechCrunch"). Never copy the source's first-person regional voice.
- CRITICAL — NO INVENTED QUOTES OR PERSONAS: Do NOT fabricate quotes, analysts, experts or named individuals not present in the source. Do not use fictional personas such as "Dr Anya Sharma", unnamed "industry analysts", or any made-up spokesperson. If no real attributed quote exists in the source, write in third-person reported speech without quotation marks.
- Do NOT invent statistics or data points not present in the source. Only include numbers that appear in the scraped content.
- GEO (answer-engine) OPTIMIZATION: the key-takeaways bullets and the nut graf/opening paragraph must each be fully self-contained and quotable out of context, phrased so an AI answer engine could lift them directly as an answer to "what happened with [topic]."

OUTPUT FORMAT:
Return ONLY the article body as clean HTML.
Allowed tags: <p>, <h2>, <ul>, <li>, <div class="key-takeaways">, <div class="data-callout">, <p data-author-input="true">
No blockquote, no cite, no span, no strong, no em, no inline styles, no wrapper divs.
Start directly with the first tag as defined by the layout rule above.`;
}

// ── FACT-CHECK AGENT ──
// Second-pass model call: strips invented quotes/personas, flags unverifiable claims
export function buildPromptFactCheck(bodyHtml: string, article: Article): string {
  let srcContext: string;
  if (article.fullText) {
    srcContext = "SOURCE CONTENT (scraped from URL): " + article.fullText;
  } else if (article.isTopicMode) {
    srcContext =
      "SOURCE: User-provided topic. Title: " +
      article.title +
      ". No external URL was scraped.";
  } else {
    srcContext =
      "SOURCE: RSS headline and summary. Title: " +
      article.title +
      ". Summary: " +
      (article.desc || "(none)");
  }

  const fakeFp =
    '6. REMOVE FABRICATED FIRST-HAND EXPERIENCE: Delete or rephrase any claim of personal action the author did not verifiably take — "I tested", "I tried", "I went to check", "I visited", "I spoke to", "I attended", "in my testing", "when I used it", etc. Keep genuine opinion/analysis first-person ("I think", "my read is") intact. Convert fake-action claims into neutral reported statements. For any <p data-author-input="true"> element: if it contains ANY text (including invented quotes, briefings, reports, or "consensus"), EMPTY it so it reads exactly <p data-author-input="true"></p>. Never fill it yourself.';

  return [
    "You are a strict editorial fact-checker reviewing a drafted article.",
    "",
    srcContext,
    "",
    "DRAFTED ARTICLE HTML:",
    bodyHtml,
    "",
    "YOUR TASK: Fix the following issues and return the corrected HTML only.",
    "",
    "1. REMOVE ALL INVENTED QUOTES AND PERSONAS: Remove any quote, named individual, or expert (e.g. Dr Anya Sharma, analyst John Doe, industry expert) that does NOT appear in the source above. Replace with factual third-person reported speech.",
    "2. REMOVE UNVERIFIABLE STATISTICS: Remove or generalise any specific number or percentage not present in the source.",
    "3. KEEP all content that is verifiable from the source or established general knowledge.",
    "4. DO NOT change HTML structure, formatting, or writing style. Only fix the problematic elements.",
    '5. REMOVE SOURCE FINGERPRINTS: delete the source outlet name, other-publication bylines, and source CTAs ("Follow ZDNET", "Add us as a preferred source", etc.).',
    fakeFp,
    "7. DO NOT add any new quotes, statistics, or claims not in the source.",
    '8. VERIFY EVERY NAME: check every person, company, product and organisation name against the source. Fix any misspelled name, wrong title/role, or wrong company attribution. If a name cannot be confirmed against the source, remove the specific name and use a generic accurate description instead (e.g. "the company" instead of a guessed name).',
    "9. VERIFY EVERY NUMBER: check every figure, date, percentage, currency amount, and count against the source. Correct any number that does not match the source exactly, including units (million vs billion, Cr vs Lakh, USD vs local currency) and currency symbols.",
    "10. VERIFY EVERY CALCULATION: recompute any derived figure in the draft (totals, percentage changes, year-over-year comparisons, per-unit math, sums of listed amounts). If the arithmetic in the draft is wrong, correct it or remove the derived claim if it cannot be reconstructed correctly from the source.",
    '11. REMOVE AI-TELL MARKERS: delete every em dash and en dash ("—", "–") and rewrite that sentence using a comma, period, or colon instead. Also rewrite away generic AI filler phrases if present ("delve", "deep dive", "landscape", "tapestry", "underscores", "testament to", "boasts", "leverage", "in the realm of", "game-changer", "cutting-edge", "unlock", "furthermore", "moreover", "it is worth noting").',
    "",
    "Return ONLY the corrected article HTML. No explanation, no preamble. Start with the first HTML tag.",
  ].join(" ");
}

export function buildPromptMeta(
  article: Article,
  keyword: string,
  bodyText: string,
  industry: string,
  retryHint: boolean,
  recentHeadlines: string[],
): string {
  const bp = bodyText.replace(/<[^>]+>/g, "").slice(0, 400);
  const retryBlock = retryHint
    ? "\n\nPREVIOUS ATTEMPT SCORED BELOW THE 90 THRESHOLD ON SEO AND/OR GEO. This time you MUST engineer a genuinely stronger title, meta description, keyword coverage and FAQ set so that seo_score and geo_score both come out at 90 or above — do not just inflate the numbers, actually improve the metadata quality (sharper primary-keyword placement in the headline and first 5 words of meta_description, richer LSI/related-entity coverage, and FAQs phrased exactly as real voice-search/AI-answer-engine queries with direct, citable 2-3 sentence answers)."
    : "";
  const avoidBlock =
    Array.isArray(recentHeadlines) && recentHeadlines.length
      ? "\n\nDO NOT REUSE ANY OF THESE RECENTLY PUBLISHED HEADLINES, AND DO NOT NEAR-DUPLICATE THEIR PHRASING, WORD ORDER, OR SENTENCE STRUCTURE. Each new headline must be distinctly worded, with a different structure and opening, from every one of these:\n- " +
        recentHeadlines.slice(0, 10).join("\n- ")
      : "";

  return (
    "You are an SEO and GEO (Generative Engine Optimization) expert for a " +
    industry +
    " publication, writing for a US audience in US English. Return ONLY a raw JSON object. No markdown, no backticks. Start with { end with }.\n\nARTICLE TITLE: " +
    article.title +
    "\nSOURCE: " +
    article.feedName +
    "\nPRIMARY KEYWORD: " +
    keyword +
    "\nINDUSTRY: " +
    industry +
    "\nARTICLE PREVIEW: " +
    bp +
    retryBlock +
    avoidBlock +
    '\n\nREQUIREMENTS:\n- headline, meta_description and meta_keywords must be engineered to score 90+ on both traditional SEO (keyword placement, length, click-through appeal) and GEO (how citable/answerable the content is for AI answer engines like ChatGPT, Perplexity, Google AI Overviews).\n- seo_score and geo_score must be your honest 0-100 assessment AFTER you have optimized the metadata below — both should genuinely reach 90 or higher; if a field is weak, strengthen the field itself rather than inflating the score.\n- The headline must be a genuinely fresh, distinctly-worded formulation — not a template you would reuse verbatim for a different story with the words swapped, and not a near-duplicate of any headline listed above as off-limits.\n- faqs is MANDATORY: exactly 6 question/answer pairs, phrased as real voice-search or AI-answer-engine queries a US reader would type, each with a direct, self-contained 2-3 sentence answer that could be lifted verbatim into an AI Overview.\n- All text must be in US English spelling and phrasing.\n- META DESCRIPTION — STRICT LENGTH RULE: write it, then COUNT THE CHARACTERS (including spaces) before responding. It must be between 140 and 155 characters, never more than 158. If your first draft is longer, cut whole words from the end until it fits — never truncate mid-word and never end with a dangling preposition or article. Do not pad short descriptions with filler to reach the range.\n\nReturn this exact JSON shape:\n{"headline":"seo title max 65 chars","subheadline":"engaging subtitle max 120 chars","meta_description":"140-155 chars, hard max 158","meta_keywords":"kw1, kw2, kw3, kw4, kw5, kw6, kw7, kw8","og_title":"open graph title","schema_type":"NewsArticle","read_time":"X min read","word_count":650,"seo_score":92,"geo_score":91,"seo_notes":"why this ranks well in 2 sentences","lsi_keywords":["r1","r2","r3","r4","r5","r6"],"faqs":[{"q":"voice search question 1","a":"direct answer 2-3 sentences"},{"q":"question 2","a":"answer 2"},{"q":"question 3","a":"answer 3"},{"q":"question 4","a":"answer 4"},{"q":"question 5","a":"answer 5"},{"q":"question 6","a":"answer 6"}]}'
  );
}
