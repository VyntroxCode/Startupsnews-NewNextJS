import "server-only";

import { callLLM } from "./azureOpenAI";
import {
  buildPromptArticle,
  buildPromptFactCheck,
  buildPromptMeta,
  randomOpeningStyle,
} from "./prompts";
import { parseOutput, safeParseJSON, stripAIArtifacts } from "./postprocess";
import { parseBodyHtml } from "@/modules/content-studio/lib/article/blocks";
import { TEMPLATES } from "@/modules/content-studio/lib/data/templates";
import { fetchArticleText } from "@/modules/content-studio/lib/feeds/extract";
import type { GenerateRequest, GeneratedData } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// The generate orchestrator, ported from `generateContent`
// (content-studio-v17.html:1684-1777).
//
// In the original this ran in the browser and drove the DOM directly. Here it
// runs on the server and reports progress through `onStep`, which the route
// handler turns into SSE events — so the 6-step checklist reflects real
// progress rather than guesses.
// ══════════════════════════════════════════════════════════════════

export type StepReporter = (step: number, label?: string) => void;

export async function runPipeline(
  req: GenerateRequest,
  onStep: StepReporter,
): Promise<GeneratedData> {
  const { settings, author, recentHeadlines } = req;
  // Local copy — the pipeline enriches it with fullText below.
  const article = { ...req.article };

  onStep(1);

  // RSS-sourced articles only carry a short headline + ~180-char summary from the
  // feed. Fetch the full article page before generating so the model works from
  // real content, not a thin snippet.
  if (
    !article.fullText &&
    article.link &&
    article.link !== "#" &&
    !article.isTopicMode
  ) {
    onStep(1, "Fetching full article content…");
    try {
      const full = await fetchArticleText(article.link);
      if (full && full.length > 300) article.fullText = full.slice(0, 100000);
    } catch {
      /* fall back silently to RSS title+summary if full fetch fails */
    }
  }

  onStep(2);

  const keyword = article.title.split(" ").slice(0, 6).join(" ");
  const tmplObj = TEMPLATES[settings.templateId] || TEMPLATES.news;
  const openingStyle = randomOpeningStyle();

  onStep(3);
  const bodyHtml = await callLLM(
    buildPromptArticle({
      article,
      keyword,
      geo: tmplObj.geo,
      length: settings.length,
      tone: tmplObj.tone,
      industry: tmplObj.label,
      tmplStyle: tmplObj.style,
      templateId: settings.templateId,
      author,
      openingStyle,
    }),
  );

  onStep(4);
  // FACT-CHECK AGENT — verifies claims, removes invented quotes/personas + fake first-person
  let factCheckedHtml = await runFactCheckAgent(bodyHtml, article);
  factCheckedHtml = stripAIArtifacts(factCheckedHtml);

  onStep(5);
  // SEO/GEO METADATA — retry once if score or FAQ coverage falls short of the 90+ / 6-FAQ bar.
  // Recent headlines are passed in so the model never repeats one across generations.
  let metaRaw = await callLLM(
    buildPromptMeta(
      article,
      keyword,
      factCheckedHtml,
      tmplObj.label,
      false,
      recentHeadlines,
    ),
  );

  let parsedMeta: Record<string, unknown> | null = null;
  try {
    parsedMeta = safeParseJSON(metaRaw);
  } catch {
    parsedMeta = null;
  }

  const seo = Number(parsedMeta?.seo_score) || 0;
  const geo = Number(parsedMeta?.geo_score) || 0;
  const faqs = parsedMeta?.faqs;
  const belowBar =
    !parsedMeta || seo < 90 || geo < 90 || !(Array.isArray(faqs) && faqs.length >= 4);

  if (belowBar) {
    try {
      const retryRaw = await callLLM(
        buildPromptMeta(
          article,
          keyword,
          factCheckedHtml,
          tmplObj.label,
          true,
          recentHeadlines,
        ),
      );
      const retryParsed = safeParseJSON(retryRaw);
      if (retryParsed && (Number(retryParsed.seo_score) || 0) >= seo) {
        metaRaw = retryRaw;
      }
    } catch {
      /* keep original metaRaw on retry failure */
    }
  }

  onStep(6);

  const parsed = parseOutput(factCheckedHtml, metaRaw, article, keyword);

  return {
    ...parsed,
    // Parsed once here, on the server, so the client never holds opaque body
    // HTML and the preview/Raw tab can't drift apart. See lib/article/blocks.ts.
    blocks: parseBodyHtml(parsed.body_html),
    _article: article,
    _keyword: keyword,
    _author: author,
    _template: tmplObj,
    _generationId:
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
}

/**
 * Second-pass model call. Falls back to the original draft on failure, exactly
 * as the original did (content-studio-v17.html:1897-1904).
 */
async function runFactCheckAgent(
  bodyHtml: string,
  article: GenerateRequest["article"],
): Promise<string> {
  try {
    const result = await callLLM(buildPromptFactCheck(bodyHtml, article));
    if (!result || result.trim().length < 200) return bodyHtml;
    return result.trim();
  } catch (e) {
    console.warn(
      "Fact-check agent failed, using original:",
      e instanceof Error ? e.message : e,
    );
    return bodyHtml;
  }
}
