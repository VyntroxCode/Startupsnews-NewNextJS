"use client";

import { useCallback, useRef, useState } from "react";
import { Pencil, PenLine, Sparkles } from "lucide-react";

import { useOutput, useOutputDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import { cn } from "@/modules/content-studio/lib/cn";
import type { ArticleBlock, AuthorInputType } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// The article body, rendered from the block AST rather than as one opaque
// innerHTML blob. Each block is a real React element, so highlights and author
// input survive re-render — which the original's DOM-mutation model did not.
// ══════════════════════════════════════════════════════════════════

// content-studio-v17.html:2097-2102
const AUTHOR_INPUT_TYPES: Record<
  AuthorInputType,
  { label: string; placeholder: string }
> = {
  opinion: { label: "My take", placeholder: "My read is that…" },
  data: {
    label: "A number",
    placeholder:
      "e.g. The round values the company at $X, up from $Y last year",
  },
  quote: {
    label: "A quote I got",
    placeholder: "Paste the exact quote, then who said it",
  },
  obs: {
    label: "Something I know",
    placeholder: "A first-hand observation or context from the ecosystem",
  },
};

/** Applies the stored highlight offsets to a block's inline HTML. */
function withHighlights(
  html: string,
  ranges: { start: number; end: number }[],
): string {
  if (!ranges.length) return html;

  // Walk the HTML, counting only visible characters so offsets computed
  // against plain text land in the right place inside tags.
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let out = "";
  let visible = 0;
  let i = 0;
  let open = false;

  while (i < html.length) {
    if (html[i] === "<") {
      const close = html.indexOf(">", i);
      const tag = html.slice(i, close + 1);
      if (open) {
        out += "</mark>" + tag;
        open = false;
      } else {
        out += tag;
      }
      i = close + 1;
      continue;
    }

    const starts = sorted.some((r) => r.start === visible);
    const ends = sorted.some((r) => r.end === visible);

    if (ends && open) {
      out += "</mark>";
      open = false;
    }
    if (starts && !open) {
      out += "<mark>";
      open = true;
    }

    out += html[i];
    visible += 1;
    i += 1;
  }

  if (open) out += "</mark>";
  return out;
}

function AuthorInputBlock({ block }: { block: Extract<ArticleBlock, { kind: "authorInput" }> }) {
  const dispatch = useOutputDispatch();
  const toast = useToast();
  const [editing, setEditing] = useState(!block.text);
  const [draft, setDraft] = useState(block.text);
  const [type, setType] = useState<AuthorInputType | null>(null);

  if (!editing) {
    return (
      <p className="group relative mb-[18px]">
        <span className="font-[Georgia,serif] text-base leading-[1.88] text-cs-prose">
          {block.text}
        </span>{" "}
        <button
          type="button"
          title="Edit"
          onClick={() => {
            setDraft(block.text);
            setEditing(true);
          }}
          className="inline-flex cursor-pointer border-none bg-transparent align-[-2px] opacity-50 group-hover:opacity-100"
        >
          <Pencil aria-hidden className="size-3.5 shrink-0" />
        </button>
      </p>
    );
  }

  return (
    <div className="my-6 rounded-cs-panel border-[1.5px] border-dashed border-cs-aac-edge bg-cs-aac-bg px-[18px] py-4 font-cs-sans">
      <div className="text-cs-ui font-bold text-cs-aac-ink">
        <PenLine aria-hidden className="mr-1 inline-block size-3.5 align-[-2px]" />
        Your original input{" "}
        <span className="font-normal text-cs-aac-ink2">
          — adds the value Google wants. Keep it true and in your own words.
        </span>
      </div>

      <div className="my-[11px] flex flex-wrap gap-1.5">
        {(Object.keys(AUTHOR_INPUT_TYPES) as AuthorInputType[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setType(k)}
            className={cn(
              "cursor-pointer rounded-full border px-[11px] py-[5px] text-cs-ui",
              type === k
                ? "border-cs-aac-ink bg-cs-aac-ink text-white"
                : "border-cs-aac-edge2 bg-white text-cs-aac-ink3",
            )}
          >
            {AUTHOR_INPUT_TYPES[k].label}
          </button>
        ))}
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          type
            ? AUTHOR_INPUT_TYPES[type].placeholder
            : "Pick a type above, or just start typing…"
        }
        className="min-h-[62px] w-full resize-none rounded-lg border border-cs-aac-edge2 px-3 py-2.5 font-cs-serif text-sm leading-[1.6] text-cs-ink outline-none"
      />

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            const val = draft.trim();
            if (!val) {
              toast("Type something first, or remove the block", "warning");
              return;
            }
            dispatch({ type: "setAuthorInput", blockId: block.id, text: val });
            setEditing(false);
            toast("Added to article", "success");
          }}
          className="cursor-pointer rounded-[7px] border-none bg-cs-accent px-[15px] py-[7px] text-[12.5px] font-semibold text-white"
        >
          Add to article
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "removeBlock", blockId: block.id });
            toast("Block removed", "info");
          }}
          className="cursor-pointer rounded-[7px] border border-cs-aac-edge2 bg-transparent px-[13px] py-[7px] text-[12.5px] text-cs-aac-ink3"
        >
          Remove this block
        </button>
      </div>
    </div>
  );
}

const PROSE_P = "mb-[18px] font-[Georgia,serif] text-base leading-[1.88] text-cs-prose";

export function ArticleBody() {
  const { blocks, highlights, highlightMode } = useOutput();
  const dispatch = useOutputDispatch();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  /**
   * Highlights are stored as character offsets, not as injected <mark> nodes.
   * The original called Range.surroundContents (line 986) and mutated the live
   * DOM; that cannot survive a React re-render. Selections that span more than
   * one block are rejected — the original already degraded on those (its
   * try/catch at 987 exists for exactly that case).
   */
  const onMouseUp = useCallback(() => {
    if (!highlightMode) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;

    const range = sel.getRangeAt(0);
    const startEl = (
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as HTMLElement)
    )?.closest("[data-block-id]");
    const endEl = (
      range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endContainer.parentElement
        : (range.endContainer as HTMLElement)
    )?.closest("[data-block-id]");

    if (!startEl || startEl !== endEl) {
      toast("Select within one paragraph", "warning");
      sel.removeAllRanges();
      return;
    }

    const blockId = startEl.getAttribute("data-block-id");
    if (!blockId) return;

    // Character offset of the selection within the block's text.
    const pre = range.cloneRange();
    pre.selectNodeContents(startEl);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;

    dispatch({ type: "addHighlight", highlight: { blockId, start, end } });
    sel.removeAllRanges();
    toast("Highlighted", "success");
  }, [highlightMode, dispatch, toast]);

  const rangesFor = (id: string) =>
    highlights.filter((h) => h.blockId === id).map(({ start, end }) => ({ start, end }));

  return (
    // The body's inline HTML (links, bold, highlight <mark>s) is injected, so it is styled from here
    // through descendant variants; every block element is React-owned and carries its own classes.
    <div
      ref={ref}
      className="[&_a]:text-cs-accent [&_a]:underline [&_mark]:rounded-[3px] [&_mark]:bg-cs-mark [&_mark]:px-0.5 [&_mark]:py-px [&_mark]:text-cs-ink [&_mark]:[print-color-adjust:exact]"
      onMouseUp={onMouseUp}
    >
      {blocks.map((b) => {
        switch (b.kind) {
          case "p":
            return (
              <p
                key={b.id}
                data-block-id={b.id}
                className={PROSE_P}
                dangerouslySetInnerHTML={{
                  __html: withHighlights(b.html, rangesFor(b.id)),
                }}
              />
            );
          case "h2":
            return (
              <h2
                key={b.id}
                data-block-id={b.id}
                className="mt-[34px] mb-[13px] border-t border-cs-edge pt-1 font-cs-serif text-[22px] font-semibold tracking-[-0.01em] text-cs-ink"
                dangerouslySetInnerHTML={{
                  __html: withHighlights(b.html, rangesFor(b.id)),
                }}
              />
            );
          case "ul":
            return (
              <ul key={b.id} data-block-id={b.id} className="mb-[18px] list-disc pl-[18px]">
                {b.items.map((item, i) => (
                  <li
                    key={i}
                    className="mb-1.5 font-[Georgia,serif] text-base leading-[1.75] text-cs-prose"
                    dangerouslySetInnerHTML={{ __html: item }}
                  />
                ))}
              </ul>
            );
          case "keyTakeaways":
            return (
              <div
                key={b.id}
                data-block-id={b.id}
                className="my-6 rounded-cs-panel border-[1.5px] border-cs-edge bg-cs-s2 px-6 py-5"
              >
                <div className="mb-3 flex items-center gap-2 font-cs-sans text-cs-label font-bold tracking-[0.09em] text-cs-accent uppercase">
                  <Sparkles aria-hidden className="size-3 shrink-0" />
                  Key takeaways
                </div>
                <ul className="list-disc pl-[18px]">
                  {b.items.map((item, i) => (
                    <li
                      key={i}
                      className="mb-[5px] font-cs-sans text-sm leading-[1.65] text-cs-ink"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  ))}
                </ul>
              </div>
            );
          case "dataCallout":
            return (
              <div
                key={b.id}
                data-block-id={b.id}
                className="my-6 rounded-cs-panel bg-linear-135 from-cs-accent to-cs-adark px-[26px] py-[22px] text-white"
              >
                <strong className="mb-1 block font-cs-serif text-[28px] font-normal">{b.figure}</strong>
                <p className="font-cs-sans text-[13px] text-white opacity-90">{b.note}</p>
              </div>
            );
          case "authorInput":
            return <AuthorInputBlock key={b.id} block={b} />;
        }
      })}
    </div>
  );
}
