import * as cheerioRuntime from "cheerio";
import type * as CheerioTypes from "cheerio/slim";
import type { Element } from "domhandler";

// This project also carries @types/cheerio@0.22, whose ambient `declare module "cheerio"` shadows
// cheerio 1.x's own types (and rejects the 3-argument fragment `load`). `cheerio/slim` resolves to
// the real 1.x declarations, so the full build is used at runtime and typed through those.
const cheerio = cheerioRuntime as unknown as typeof CheerioTypes;

import type { ArticleBlock } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// Body HTML <-> block AST.
//
// The original treated the article body as opaque HTML: it set innerHTML
// (content-studio-v17.html:2080), then mutated that live DOM to inject author-
// input cards (2103-2130) and <mark> highlights (981-993), then cloned the DOM
// back and pattern-matched class names to recover the source
// (`syncBodyFromPreview`, 2164-2177). Under React that model is unworkable —
// any re-render of a dangerouslySetInnerHTML subtree discards every one of
// those mutations.
//
// We can do better because the prompt constrains the model to a closed six-tag
// set (see OUTPUT FORMAT in lib/llm/prompts.ts): <p>, <h2>, <ul>/<li>,
// div.key-takeaways, div.data-callout, and <p data-author-input="true">.
// Six block kinds is small enough to parse properly, so the body becomes data
// that React owns, and the Raw tab can never drift from the preview.
// ══════════════════════════════════════════════════════════════════

let counter = 0;
function nextId(): string {
  counter += 1;
  return `b${counter.toString(36)}`;
}

/** Inline markup we allow to survive inside a block's text. */
function inlineHtml($: CheerioTypes.CheerioAPI, el: Element): string {
  return $(el).html()?.trim() ?? "";
}

export function parseBodyHtml(html: string): ArticleBlock[] {
  const $ = cheerio.load(html, null, false);
  const blocks: ArticleBlock[] = [];

  $.root()
    .children()
    .each((_, node) => {
      const el = $(node);
      const tag = (node as Element).tagName?.toLowerCase();
      if (!tag) return;

      if (tag === "p") {
        if (el.attr("data-author-input") != null) {
          blocks.push({ id: nextId(), kind: "authorInput", text: el.text().trim() });
          return;
        }
        const h = inlineHtml($, node as Element);
        if (h) blocks.push({ id: nextId(), kind: "p", html: h });
        return;
      }

      if (tag === "h2") {
        const h = inlineHtml($, node as Element);
        if (h) blocks.push({ id: nextId(), kind: "h2", html: h });
        return;
      }

      if (tag === "ul" || tag === "ol") {
        const items = el
          .children("li")
          .map((__, li) => inlineHtml($, li as Element))
          .get()
          .filter(Boolean);
        if (items.length) blocks.push({ id: nextId(), kind: "ul", items });
        return;
      }

      if (tag === "div") {
        const cls = el.attr("class") ?? "";

        if (cls.includes("key-takeaways")) {
          const items = el
            .find("li")
            .map((__, li) => inlineHtml($, li as Element))
            .get()
            .filter(Boolean);
          if (items.length)
            blocks.push({ id: nextId(), kind: "keyTakeaways", items });
          return;
        }

        if (cls.includes("data-callout")) {
          const figure = el.find("strong").first().text().trim();
          const note = el.find("p").first().text().trim();
          blocks.push({ id: nextId(), kind: "dataCallout", figure, note });
          return;
        }
      }

      // Anything the model emitted outside the contract: keep the text so no
      // content is silently lost, but strip it back to a paragraph.
      const text = el.text().trim();
      if (text) blocks.push({ id: nextId(), kind: "p", html: escapeHtml(text) });
    });

  return blocks;
}

/**
 * Render blocks back to the canonical body HTML used by the Raw tab and the
 * standalone export.
 *
 * `dropEmptyAuthorInputs` mirrors the strip at content-studio-v17.html:2222 —
 * an unfilled placeholder must never ship.
 */
export function serializeBlocks(
  blocks: ArticleBlock[],
  { dropEmptyAuthorInputs = false }: { dropEmptyAuthorInputs?: boolean } = {},
): string {
  const out: string[] = [];

  for (const b of blocks) {
    switch (b.kind) {
      case "p":
        out.push(`<p>${b.html}</p>`);
        break;
      case "h2":
        out.push(`<h2>${b.html}</h2>`);
        break;
      case "ul":
        out.push(`<ul>${b.items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
        break;
      case "keyTakeaways":
        out.push(
          `<div class="key-takeaways"><ul>${b.items
            .map((i) => `<li>${i}</li>`)
            .join("")}</ul></div>`,
        );
        break;
      case "dataCallout":
        out.push(
          `<div class="data-callout"><strong>${escapeHtml(
            b.figure,
          )}</strong><p>${escapeHtml(b.note)}</p></div>`,
        );
        break;
      case "authorInput": {
        const text = b.text.trim();
        if (!text) {
          if (!dropEmptyAuthorInputs) out.push(`<p data-author-input="true"></p>`);
          break;
        }
        // A filled block ships as an ordinary paragraph — the placeholder
        // attribute is an editing affordance, not published markup.
        out.push(`<p>${escapeHtml(text)}</p>`);
        break;
      }
    }
  }

  return out.join("\n");
}

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escapes a value destined for a double-quoted HTML attribute. */
export function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

/** Plain text of a block, used for word counts and highlight offsets. */
export function blockText(b: ArticleBlock): string {
  switch (b.kind) {
    case "p":
    case "h2":
      return stripTags(b.html);
    case "ul":
    case "keyTakeaways":
      return b.items.map(stripTags).join(" ");
    case "dataCallout":
      return `${b.figure} ${b.note}`;
    case "authorInput":
      return b.text;
  }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}
