"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Circle,
  ClipboardCopy,
  Download,
  FilePlus2,
  FileCode,
  FileText,
  Highlighter,
  LayoutTemplate,
  PenLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button, CodeBlock, Spinner } from "@/modules/content-studio/components/ui";
import { useOutput, useOutputDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import { cn } from "@/modules/content-studio/lib/cn";
import {
  buildArticleSchema,
  buildFaqSchema,
  buildFullHtml,
  articleSlug,
} from "@/modules/content-studio/lib/article/buildFullHtml";
import { blockText } from "@/modules/content-studio/lib/article/blocks";
import {
  POST_HANDOFF_QUERY,
  savePostHandoff,
} from "@/modules/content-studio/lib/article/postHandoff";
import { ArticleBody } from "./ArticleBody";
import { formatDate } from "@/modules/content-studio/components/source/ArticleRow";
import type { GeneratedData, OutputTab } from "@/modules/content-studio/types";

// ── RIGHT COLUMN (content-studio-v17.html:608-680) ──

const TABS: { id: OutputTab; label: string }[] = [
  { id: "preview", label: "Article preview" },
  { id: "seo", label: "SEO data" },
  { id: "schema", label: "Schema JSON-LD" },
  { id: "raw", label: "Full HTML" },
];

const STEPS = [
  "Analysing source content",
  "Building EEAT content structure",
  "Writing with unique approach",
  "Fact-checking claims & sources",
  "Crafting FAQs for GEO optimisation",
  "Injecting SEO and schema signals",
];

function scoreColor(s: number): string {
  return s >= 80 ? "var(--color-cs-ok)" : s >= 60 ? "var(--color-cs-warn)" : "var(--color-cs-bad)";
}

function scoreLabel(s: number): string {
  return s >= 80 ? "Excellent" : s >= 60 ? "Good" : "Needs work";
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = scoreColor(score);

  return (
    <div className="relative size-12">
      <svg width={size} height={size} viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-cs-edge)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-cs-sans text-[13px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function ScoreBar({ data }: { data: GeneratedData }) {
  const badge =
    "flex items-center gap-1.5 rounded-full border-[1.5px] border-cs-accent/15 bg-cs-abg px-[13px] py-1.5 text-cs-meta font-semibold text-cs-accent";

  return (
    <div className="flex flex-wrap items-center gap-[22px] border-b border-cs-edge bg-cs-s2 px-7 py-3.5">
      <div className="flex items-center gap-[11px]">
        <ScoreRing score={data.seo_score} />
        <div>
          <div className="mb-0.5 text-cs-label font-bold tracking-[.08em] text-cs-t2 uppercase">
            SEO Score
          </div>
          <div className="text-cs-meta text-cs-t3">{scoreLabel(data.seo_score)}</div>
        </div>
      </div>

      <div className="h-[38px] w-px bg-cs-edge" />

      <div className="flex items-center gap-[11px]">
        <ScoreRing score={data.geo_score} />
        <div>
          <div className="mb-0.5 text-cs-label font-bold tracking-[.08em] text-cs-t2 uppercase">
            GEO Score
          </div>
          <div className="text-cs-meta text-cs-t3">{scoreLabel(data.geo_score)}</div>
        </div>
      </div>

      <div className="h-[38px] w-px bg-cs-edge" />

      {data._template ? (
        <span className={badge}>
          <LayoutTemplate aria-hidden className="size-3 shrink-0" />
          {data._template.label}
        </span>
      ) : null}
      {data._author ? (
        <span className={badge}>
          <PenLine aria-hidden className="size-3 shrink-0" />
          {data._author.name}
        </span>
      ) : null}
      <span
        className="flex items-center gap-1 text-cs-ui font-semibold text-cs-ok"
        title="Names, numbers and calculations verified against the source"
      >
        <ShieldCheck aria-hidden className="size-3.5 shrink-0" />
        Fact-checked (names/numbers)
      </span>
    </div>
  );
}

function SeoPanel({ data }: { data: GeneratedData }) {
  const card = "rounded-cs-panel border-[1.5px] border-cs-edge bg-cs-s2 px-[18px] py-[15px] shadow-cs-soft";
  const label = "mb-2 text-cs-label font-bold tracking-[.08em] text-cs-t2 uppercase";
  const value = "text-cs-body leading-[1.55] text-cs-ink";

  const descLen = data.meta_description.length;
  const descClass =
    descLen >= 140 && descLen <= 158
      ? "text-cs-ok"
      : descLen > 158
        ? "text-cs-bad"
        : "text-cs-warn";

  return (
    <div className="max-w-[760px] px-[30px] py-[26px]">
      <div className="grid grid-cols-2 gap-[11px]">
        <div className={cn(card, "col-span-full")}>
          <div className={label}>Headline</div>
          <div className={value}>{data.headline}</div>
          <div className="mt-1.5 text-cs-meta font-bold text-cs-t3">
            {data.headline.length} chars
          </div>
        </div>

        <div className={cn(card, "col-span-full")}>
          <div className={label}>Meta description</div>
          <div className={value}>{data.meta_description}</div>
          <div className={cn("mt-1.5 flex items-center gap-1 text-cs-meta font-bold", descClass)}>
            {descLen} chars{" "}
            {descLen >= 140 && descLen <= 158 ? (
              <Check aria-label="Within range" className="size-3 shrink-0" />
            ) : (
              "— aim for 140–155"
            )}
          </div>
        </div>

        <div className={card}>
          <div className={label}>Keywords</div>
          <div className={value}>{data.meta_keywords}</div>
        </div>

        <div className={card}>
          <div className={label}>OG title</div>
          <div className={value}>{data.og_title}</div>
        </div>

        <div className={cn(card, "col-span-full")}>
          <div className={label}>LSI keywords</div>
          <div className="flex flex-wrap">
            {data.lsi_keywords.map((k) => (
              <span
                key={k}
                className="m-0.5 inline-block rounded-full border-[1.5px] border-cs-edge bg-cs-surface px-2.5 py-[3px] text-cs-meta font-medium"
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className={cn(card, "col-span-full")}>
          <div className={label}>FAQs ({data.faqs.length})</div>
          {data.faqs.map((f, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="text-cs-body font-bold text-cs-ink">{f.q}</div>
              <div className="text-cs-ui leading-[1.7] text-cs-t2">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReaderPane() {
  const { phase, step, stepLabel, error, data, blocks, activeTab, highlightMode } =
    useOutput();
  const dispatch = useOutputDispatch();
  const toast = useToast();
  const router = useRouter();

  // Derived, never stored. This is what deletes the original's manual
  // syncBodyFromPreview -> buildFullHTML -> renderRaw cascade (lines 2174-2176)
  // and makes the Raw tab structurally unable to drift from the preview.
  const live = useMemo<GeneratedData | null>(
    () => (data ? { ...data, blocks } : null),
    [data, blocks],
  );
  const fullHtml = useMemo(() => (live ? buildFullHtml(live) : ""), [live]);

  const copy = (text: string, msg: string) => {
    if (!live) {
      toast("Generate content first", "warning");
      return;
    }
    void navigator.clipboard.writeText(text).then(() => toast(msg, "success"));
  };

  const moveToPost = () => {
    if (!live) {
      toast("Generate content first", "warning");
      return;
    }
    const saved = savePostHandoff({
      title: live.headline,
      excerpt: live.subheadline || live.meta_description,
      metaDescription: live.meta_description,
      // The post has its own title field and no source footer.
      html: buildFullHtml(live, { forPost: true }),
    });
    if (!saved) {
      toast("Could not hand off to the post editor", "error");
      return;
    }
    router.push(`/admin/posts/create?${POST_HANDOFF_QUERY}`);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-cs-surface">
      {highlightMode ? (
        <div className="shrink-0 border-b border-cs-edge bg-gradient-to-br from-cs-s3 to-cs-abg px-5 py-[7px] text-center text-cs-ui font-semibold text-cs-accent">
          <Highlighter aria-hidden className="mr-1.5 inline-block size-3.5 align-[-2px]" />
          Highlight mode ON — select any text in the article to highlight it
          pink ·{" "}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => dispatch({ type: "toggleHighlightMode" })}
          >
            Done
          </button>
        </div>
      ) : null}

      <div role="tablist" className="flex shrink-0 gap-0.5 border-b border-cs-edge bg-cs-surface px-7">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            onClick={() => dispatch({ type: "setTab", tab: t.id })}
            className={cn(
              "-mb-px cursor-pointer border-b-[2.5px] border-transparent bg-transparent px-[18px] py-[11px] font-cs-sans text-cs-ui font-semibold transition-all duration-150",
              activeTab === t.id
                ? "border-b-cs-accent text-cs-accent"
                : "text-cs-t2 hover:text-cs-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-cs-edge2 flex-1 overflow-y-auto">
        {activeTab === "preview" ? (
          <>
            {phase === "idle" ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3.5 px-10 py-[60px] text-center text-cs-t2">
                <Sparkles aria-hidden className="size-12 opacity-[0.08]" />
                <h3 className="font-cs-serif text-2xl font-normal text-cs-ink">
                  Nothing generated yet
                </h3>
                <p className="max-w-[360px] text-[13px] leading-[1.8]">
                  Pick an article from the feed, choose a template from settings,
                  then click Generate.
                </p>
                <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                  {["Pick a source", "Choose a template", "Click Generate"].map(
                    (s, i) => (
                      <div
                        key={s}
                        className="flex items-center gap-1.5 rounded-[30px] border-[1.5px] border-cs-edge bg-cs-s2 px-3.5 py-1.5 text-cs-meta font-medium"
                      >
                        <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-cs-accent text-[9px] font-bold text-white">
                          {i + 1}
                        </span>
                        {s}
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {phase === "generating" ? (
              <div className="flex flex-col items-center gap-[22px] px-5 py-20">
                <Spinner />
                <ul className="w-[290px] list-none">
                  {STEPS.map((s, i) => {
                    const n = i + 1;
                    const done = n < step;
                    const curr = n === step;
                    return (
                      <li
                        key={s}
                        className={cn(
                          "flex items-center gap-3 border-b border-cs-edge py-2 text-[13px] last:border-b-0",
                          done && "text-cs-ink",
                          curr && "font-bold text-cs-accent",
                          !done && !curr && "text-cs-t2",
                        )}
                      >
                        <span
                          className={cn(
                            "size-[7px] shrink-0 rounded-full",
                            done && "bg-cs-ok",
                            curr && "animate-cs-pulse-dot bg-cs-accent",
                            !done && !curr && "bg-cs-edge2",
                          )}
                        />
                        {curr && stepLabel ? stepLabel : s}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {phase === "error" ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3.5 px-10 py-[60px] text-center text-cs-t2">
                <TriangleAlert aria-hidden className="size-12 opacity-[0.08]" />
                <h3 className="font-cs-sans text-[15px] text-cs-ink">Generation failed</h3>
                <p className="text-cs-bad">{error}</p>
                <p className="text-[13px]">
                  Check the server logs and that the AZURE_OPENAI_* keys are set.
                </p>
              </div>
            ) : null}

            {phase === "ready" && live ? (
              <>
                <ScoreBar data={live} />
                <div className="mx-auto max-w-[700px] px-10 pt-9 pb-[70px]">
                  <div className="mb-[18px] flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-[3px] rounded-full border-[1.5px] border-cs-edge bg-cs-s2 px-2.5 py-[3px] text-cs-meta font-semibold text-cs-t2">
                      <Circle aria-hidden className="size-2 shrink-0 fill-current" />
                      {live._article.feedName}
                    </span>
                    {live._article.pubDate ? (
                      <span className="inline-flex items-center gap-[3px] rounded-full border-[1.5px] border-cs-edge bg-cs-s2 px-2.5 py-[3px] text-cs-meta font-semibold text-cs-t2">
                        {formatDate(live._article.pubDate)}
                      </span>
                    ) : null}
                    {live._keyword ? (
                      <span className="inline-flex items-center gap-[3px] rounded-full border-[1.5px] border-cs-accent/15 bg-cs-abg px-2.5 py-[3px] text-cs-meta font-semibold text-cs-accent">
                        {live._keyword}
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mb-3 font-cs-serif text-[32px] leading-[1.18] font-semibold tracking-[-.02em] text-cs-ink">
                    {live.headline}
                  </h1>

                  {live.subheadline ? (
                    <p className="mb-6 border-l-[3px] border-cs-edge2 pl-3.5 font-cs-serif text-lg leading-[1.5] text-cs-t2 italic">
                      {live.subheadline}
                    </p>
                  ) : null}

                  <div className="mb-[26px] flex items-center gap-[5px] border-b-2 border-cs-edge pb-5 text-cs-ui text-cs-t3">
                    {live._author ? (
                      <span>
                        By <strong className="text-cs-t2">{live._author.name}</strong>
                        {live._author.role ? `, ${live._author.role}` : ""}
                        {live._author.linkedin ? (
                          <>
                            {" · "}
                            <a
                              href={live._author.linkedin}
                              target="_blank"
                              rel="noopener"
                              className="text-cs-accent"
                            >
                              LinkedIn
                            </a>
                          </>
                        ) : null}
                        {live._article.pubDate
                          ? ` · ${formatDate(live._article.pubDate)}`
                          : ""}
                      </span>
                    ) : (
                      <span>
                        <strong className="text-cs-t2">{live._article.feedName}</strong>
                        {live._article.pubDate
                          ? ` · ${formatDate(live._article.pubDate)}`
                          : ""}
                      </span>
                    )}
                  </div>

                  <ArticleBody />

                  {live.faqs.length ? (
                    <div className="mt-8 border-t-2 border-cs-edge pt-6">
                      <div className="mb-[22px] font-cs-serif text-[22px] font-semibold text-cs-ink">
                        Frequently asked questions
                      </div>
                      {live.faqs.map((f, i) => (
                        <div
                          key={i}
                          className="mb-6 border-b border-cs-edge pb-6 last:mb-0 last:border-b-0 last:pb-0"
                        >
                          <div className="mb-2 font-cs-sans text-[15px] leading-[1.4] font-bold text-cs-ink">
                            {f.q}
                          </div>
                          <div className="font-cs-sans text-sm leading-[1.75] text-cs-t2">
                            {f.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-[26px] rounded-cs-panel border-[1.5px] border-cs-edge bg-cs-s2 px-[18px] py-3.5 text-cs-ui shadow-cs-soft">
                    <div className="mb-1.5 text-cs-label font-bold tracking-[.08em] text-cs-t2 uppercase">
                      Source
                    </div>
                    <a
                      href={live._article.link}
                      target="_blank"
                      rel="noopener"
                      className="font-semibold text-cs-accent hover:underline"
                    >
                      {live._article.feedName} — {live._article.title}
                    </a>
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {activeTab === "seo" ? (
          live ? (
            <SeoPanel data={live} />
          ) : (
            <div className="px-[30px] py-[26px] text-[13px] text-cs-t2">
              Generate content to see SEO analysis.
            </div>
          )
        ) : null}

        {activeTab === "schema" ? (
          live ? (
            <div className="max-w-[760px] px-[30px] py-[26px]">
              <CodeBlock>
                {JSON.stringify(
                  [buildArticleSchema(live), buildFaqSchema(live)].filter(Boolean),
                  null,
                  2,
                )}
              </CodeBlock>
            </div>
          ) : (
            <div className="px-[30px] py-[26px] text-[13px] text-cs-t2">
              Generate content to see schema markup.
            </div>
          )
        ) : null}

        {activeTab === "raw" ? (
          live ? (
            <div className="max-w-[760px] px-[30px] py-[26px]">
              <CodeBlock>{fullHtml}</CodeBlock>
            </div>
          ) : (
            <div className="px-[30px] py-[26px] text-[13px] text-cs-t2">
              Generate content to see full HTML.
            </div>
          )
        ) : null}
      </div>

      {/* ACTION BAR (content-studio-v17.html:671-679) */}
      <div className="flex shrink-0 items-center gap-2 border-t border-cs-edge bg-cs-s2 px-5 py-2.5">
        <Button
          title="Select text in the article to highlight it pink"
          onClick={() => dispatch({ type: "toggleHighlightMode" })}
          className={cn(
            "border-cs-accent text-cs-accent",
            highlightMode &&
              "bg-cs-accent text-white shadow-[0_2px_8px_rgba(232,24,109,.35)] hover:bg-cs-accent hover:text-white",
          )}
        >
          <Highlighter aria-hidden className="size-3.5 shrink-0" />
          Highlight
        </Button>
        <div className="flex-1" />
        <Button onClick={() => copy(fullHtml, "Full HTML copied")}>
          <ClipboardCopy aria-hidden className="size-3.5 shrink-0" />
          Copy full HTML
        </Button>
        <Button
          onClick={() =>
            live &&
            copy(
              `<title>${live.headline}</title>\n<meta name="description" content="${live.meta_description}">\n<meta name="keywords" content="${live.meta_keywords}">\n<meta property="og:title" content="${live.og_title}">`,
              "Meta tags copied",
            )
          }
        >
          <FileCode aria-hidden className="size-3.5 shrink-0" />
          Copy meta tags
        </Button>
        <Button
          onClick={() => copy(blocks.map(blockText).join("\n\n"), "Article text copied")}
        >
          <FileText aria-hidden className="size-3.5 shrink-0" />
          Copy article text
        </Button>
        <Button onClick={moveToPost} title="Open a new post with this article's HTML">
          <FilePlus2 aria-hidden className="size-3.5 shrink-0" />
          Move to post
        </Button>
        <div className="flex-1" />
        <Button
          variant="primary"
          onClick={() => {
            if (!live) {
              toast("Generate content first", "warning");
              return;
            }
            const slug = articleSlug(live.headline);
            const blob = new Blob([fullHtml], { type: "text/html" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = slug + ".html";
            a.click();
            URL.revokeObjectURL(a.href);
            toast("Downloaded " + slug + ".html", "success");
          }}
        >
          <Download aria-hidden className="size-3.5 shrink-0" />
          Download .html
        </Button>
      </div>
    </div>
  );
}
