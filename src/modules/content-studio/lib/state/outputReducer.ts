import type { ArticleBlock, GeneratedData, Highlight, OutputTab } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// The reader pane's state.
//
// Note what is NOT here: `fullHTMLOutput`. The original kept it as a global and
// had to manually re-derive it on every edit via the
// syncBodyFromPreview -> buildFullHTML -> renderRaw cascade
// (content-studio-v17.html:2174-2176). Here it is a useMemo over `blocks`, so
// the Raw tab structurally cannot drift from the preview.
// ══════════════════════════════════════════════════════════════════

export type OutputPhase = "idle" | "generating" | "ready" | "error";

export interface OutputState {
  phase: OutputPhase;
  step: number;
  stepLabel: string | null;
  error: string | null;
  data: GeneratedData | null;
  /** The editable body. Diverges from `data.blocks` as the editor works. */
  blocks: ArticleBlock[];
  highlights: Highlight[];
  activeTab: OutputTab;
  highlightMode: boolean;
}

export const initialOutputState: OutputState = {
  phase: "idle",
  step: 0,
  stepLabel: null,
  error: null,
  data: null,
  blocks: [],
  highlights: [],
  activeTab: "preview",
  highlightMode: false,
};

export type OutputAction =
  | { type: "start" }
  | { type: "step"; step: number; label?: string }
  | { type: "done"; data: GeneratedData }
  | { type: "failed"; message: string }
  | { type: "reset" }
  | { type: "setTab"; tab: OutputTab }
  | { type: "toggleHighlightMode" }
  | { type: "addHighlight"; highlight: Highlight }
  | { type: "setAuthorInput"; blockId: string; text: string }
  | { type: "removeBlock"; blockId: string };

export function outputReducer(state: OutputState, action: OutputAction): OutputState {
  switch (action.type) {
    case "start":
      return {
        ...initialOutputState,
        activeTab: "preview",
        phase: "generating",
        step: 1,
      };

    case "step":
      return { ...state, step: action.step, stepLabel: action.label ?? null };

    case "done":
      return {
        ...state,
        phase: "ready",
        step: 6,
        stepLabel: null,
        error: null,
        data: action.data,
        blocks: action.data.blocks,
        highlights: [],
      };

    case "failed":
      return { ...state, phase: "error", error: action.message };

    case "reset":
      return { ...initialOutputState };

    case "setTab":
      return { ...state, activeTab: action.tab };

    case "toggleHighlightMode":
      return { ...state, highlightMode: !state.highlightMode };

    case "addHighlight":
      return { ...state, highlights: [...state.highlights, action.highlight] };

    case "setAuthorInput":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId && b.kind === "authorInput"
            ? { ...b, text: action.text }
            : b,
        ),
      };

    case "removeBlock":
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
        highlights: state.highlights.filter((h) => h.blockId !== action.blockId),
      };

    default:
      return state;
  }
}
