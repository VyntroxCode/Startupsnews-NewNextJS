import type { Article, NewsSourceInfo, SourceMode, TrendItem } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// The source pane's state: which mode, what's loaded, what's selected.
// Replaces the module globals at content-studio-v17.html:688 and 1479, plus
// the status bar text (setStatus, 1618).
// ══════════════════════════════════════════════════════════════════

export interface SourceState {
  mode: SourceMode;

  // URL import
  urlArticle: Article | null;
  urlFetching: boolean;
  urlError: string | null;

  // News
  trendingArticles: Article[];
  /** Every source in the last fetch, including ones that returned nothing. */
  trendingSources: NewsSourceInfo[];
  activeNewsSource: string;
  trendingErrors: string[];
  newsFetching: boolean;
  newsFullscreenOpen: boolean;
  /** Which section of the News workspace is showing. */
  newsTab: "news" | "trends";

  // Google Trends
  trends: TrendItem[];
  trendsHours: number;
  /** Google Trends category id: 18 = Technology, 0 = all categories. */
  trendsCategory: number;
  trendsFetching: boolean;
  trendsError: string | null;
  /** False until the first trends fetch, so an empty list can say "none trending". */
  trendsLoaded: boolean;

  // Shared
  selectedArticle: Article | null;
  status: { text: string; loading: boolean };
}

export const initialSourceState: SourceState = {
  mode: "news",
  urlArticle: null,
  urlFetching: false,
  urlError: null,
  trendingArticles: [],
  trendingSources: [],
  activeNewsSource: "all",
  trendingErrors: [],
  newsFetching: false,
  newsFullscreenOpen: false,
  newsTab: "news",
  trends: [],
  trendsHours: 24,
  trendsCategory: 18,
  trendsFetching: false,
  trendsError: null,
  trendsLoaded: false,
  selectedArticle: null,
  status: { text: "Ready", loading: false },
};

export type SourceAction =
  | { type: "setMode"; mode: SourceMode }
  | { type: "urlFetching" }
  | { type: "urlLoaded"; article: Article }
  | { type: "urlFailed"; error: string }
  | { type: "clearUrlCard" }
  | { type: "newsFetching" }
  | {
      type: "newsLoaded";
      articles: Article[];
      errors: string[];
      sources?: NewsSourceInfo[];
    }
  | { type: "setActiveNewsSource"; id: string }
  | { type: "setNewsFullscreen"; open: boolean }
  | { type: "setNewsTab"; tab: "news" | "trends" }
  | { type: "trendsFetching"; hours: number; category: number }
  | { type: "trendsLoaded"; trends: TrendItem[]; error: string | null }
  | { type: "selectArticle"; article: Article | null }
  | { type: "setStatus"; text: string; loading?: boolean };

export function sourceReducer(state: SourceState, action: SourceAction): SourceState {
  switch (action.type) {
    case "setMode":
      // Side effect the original ran inside switchMode (line 952): leaving the
      // url tab clears its error note.
      return {
        ...state,
        mode: action.mode,
        urlError: action.mode === "url" ? state.urlError : null,
      };

    case "urlFetching":
      return { ...state, urlFetching: true, urlError: null };

    case "urlLoaded":
      return {
        ...state,
        urlFetching: false,
        urlError: null,
        urlArticle: action.article,
      };

    case "urlFailed":
      return { ...state, urlFetching: false, urlError: action.error };

    case "clearUrlCard":
      return { ...state, urlArticle: null, urlError: null };

    case "newsFetching":
      return {
        ...state,
        newsFetching: true,
        trendingErrors: [],
        status: { text: "Fetching news…", loading: true },
      };

    case "newsLoaded": {
      const n = action.articles.length;
      const errs = action.errors.length;
      return {
        ...state,
        newsFetching: false,
        trendingArticles: action.articles,
        trendingSources: action.sources ?? [],
        trendingErrors: action.errors,
        status: {
          text: n
            ? `${n} stories loaded${errs ? ` · ${errs} source(s) failed` : ""}`
            : "No stories loaded",
          loading: false,
        },
      };
    }

    case "setActiveNewsSource":
      return { ...state, activeNewsSource: action.id };

    case "setNewsFullscreen":
      return { ...state, newsFullscreenOpen: action.open };

    case "setNewsTab":
      return { ...state, newsTab: action.tab };

    case "trendsFetching":
      return {
        ...state,
        trendsFetching: true,
        trendsHours: action.hours,
        trendsCategory: action.category,
        trendsError: null,
      };

    case "trendsLoaded":
      return {
        ...state,
        trendsFetching: false,
        trendsLoaded: true,
        trends: action.trends,
        trendsError: action.error,
      };

    case "selectArticle":
      return { ...state, selectedArticle: action.article };

    case "setStatus":
      return {
        ...state,
        status: { text: action.text, loading: action.loading ?? false },
      };

    default:
      return state;
  }
}
