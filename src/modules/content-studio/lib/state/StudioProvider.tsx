"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
} from "react";

import { ToastProvider } from "./toast";
import {
  initialSourceState,
  sourceReducer,
  type SourceAction,
  type SourceState,
} from "./sourceReducer";
import {
  initialOutputState,
  outputReducer,
  type OutputAction,
  type OutputState,
} from "./outputReducer";
import { useLocalStorage, parseArray, type StorageMeta } from "@/modules/content-studio/lib/hooks/useLocalStorage";
import { KEYS } from "@/modules/content-studio/lib/storage";
import { DEFAULT_AUTHORS, mergeAuthors } from "@/modules/content-studio/lib/data/authors";
import {
  DEFAULT_LENGTH,
  DEFAULT_SPECIALS,
  DEFAULT_TEMPLATE,
  TEMPLATES,
} from "@/modules/content-studio/lib/data/templates";
import type {
  Author,
  CustomNewsSource,
  GenerateSettings,
  TemplateId,
} from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// State is split into three contexts rather than one god-reducer so that, for
// example, toggling a settings chip doesn't re-render a 200-card news grid.
// Each exposes state and a stable dispatch separately for the same reason.
// ══════════════════════════════════════════════════════════════════

// ── Source ──
const SourceStateCtx = createContext<SourceState>(initialSourceState);
const SourceDispatchCtx = createContext<Dispatch<SourceAction>>(() => {});
export const useSource = () => useContext(SourceStateCtx);
export const useSourceDispatch = () => useContext(SourceDispatchCtx);

// ── Output ──
const OutputStateCtx = createContext<OutputState>(initialOutputState);
const OutputDispatchCtx = createContext<Dispatch<OutputAction>>(() => {});
export const useOutput = () => useContext(OutputStateCtx);
export const useOutputDispatch = () => useContext(OutputDispatchCtx);

// ── Settings ──
// These four were DOM-only in the original, scraped at generate time
// (content-studio-v17.html:1718-1721). Making them real state is the single
// biggest correctness upgrade in the port.
export interface SettingsValue {
  authors: Author[];
  setAuthors: (a: Author[]) => void;
  authorsMeta: StorageMeta;
  selectedAuthorId: string;
  setSelectedAuthorId: (id: string) => void;
  selectedAuthor: Author | null;

  templateId: TemplateId;
  /** Also resets the special-section chips, as applyTemplate did (line 883). */
  chooseTemplate: (id: TemplateId) => void;

  length: string;
  setLength: (l: string) => void;

  specials: string[];
  toggleSpecial: (val: string) => void;

  settingsOpen: boolean;
  toggleSettings: () => void;

  /** Exactly what POST /api/generate needs. */
  generateSettings: GenerateSettings;

  customSources: CustomNewsSource[];
  setCustomSources: (s: CustomNewsSource[]) => void;

  timeRange: string;
  setTimeRange: (id: string) => void;

  recentHeadlines: string[];
  rememberHeadline: (h: string) => void;

  storageBlocked: boolean;
}

const SettingsCtx = createContext<SettingsValue | null>(null);

export function useSettings(): SettingsValue {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings must be used inside <StudioProvider>");
  return v;
}

const parseCustomSources = parseArray<CustomNewsSource>();
const parseHeadlines = parseArray<string>();
const parseAuthorList = (raw: string): Author[] | null => {
  const v = JSON.parse(raw);
  return mergeAuthors(Array.isArray(v) ? (v as Author[]) : null);
};
const parseTimeRange = (raw: string): string => {
  // Stored unencoded by the original (content-studio-v17.html:1421).
  try {
    const v = JSON.parse(raw);
    return typeof v === "string" ? v : raw;
  } catch {
    return raw;
  }
};

const NO_SOURCES: CustomNewsSource[] = [];
const NO_HEADLINES: string[] = [];

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [sourceState, sourceDispatch] = useReducer(sourceReducer, initialSourceState);
  const [outputState, outputDispatch] = useReducer(outputReducer, initialOutputState);

  const [authors, setAuthors, authorsMeta] = useLocalStorage<Author[]>(
    KEYS.authors,
    DEFAULT_AUTHORS,
    parseAuthorList,
  );
  const [customSources, setCustomSources] = useLocalStorage<CustomNewsSource[]>(
    KEYS.customNewsSources,
    NO_SOURCES,
    parseCustomSources,
  );
  const [timeRange, setTimeRange] = useLocalStorage<string>(
    KEYS.newsTimeRange,
    "all",
    parseTimeRange,
  );
  const [recentHeadlines, setRecentHeadlines] = useLocalStorage<string[]>(
    KEYS.recentHeadlines,
    NO_HEADLINES,
    parseHeadlines,
  );

  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [specials, setSpecials] = useState<string[]>(DEFAULT_SPECIALS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // applyTemplate (line 883) overwrites the chips from the template's defaults.
  // Deliberately an explicit handler, NOT a useEffect on templateId — an effect
  // would also fire on mount and twice under StrictMode, silently clobbering
  // the user's chip selection.
  const chooseTemplate = useCallback((id: TemplateId) => {
    setTemplateId(id);
    setSpecials(TEMPLATES[id]?.specials ?? DEFAULT_SPECIALS);
  }, []);

  const toggleSpecial = useCallback((val: string) => {
    setSpecials((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  const toggleSettings = useCallback(() => setSettingsOpen((v) => !v), []);

  // content-studio-v17.html:1675-1679 — most recent first, capped at 20.
  const rememberHeadline = useCallback(
    (h: string) => {
      if (!h) return;
      setRecentHeadlines([h, ...recentHeadlines.filter((x) => x !== h)].slice(0, 20));
    },
    [recentHeadlines, setRecentHeadlines],
  );

  const selectedAuthor = useMemo(
    () => authors.find((a) => a.id === selectedAuthorId) ?? null,
    [authors, selectedAuthorId],
  );

  const generateSettings = useMemo<GenerateSettings>(
    () => ({ length, templateId, authorId: selectedAuthorId, specials }),
    [length, templateId, selectedAuthorId, specials],
  );

  const settings = useMemo<SettingsValue>(
    () => ({
      authors,
      setAuthors,
      authorsMeta,
      selectedAuthorId,
      setSelectedAuthorId,
      selectedAuthor,
      templateId,
      chooseTemplate,
      length,
      setLength,
      specials,
      toggleSpecial,
      settingsOpen,
      toggleSettings,
      generateSettings,
      customSources,
      setCustomSources,
      timeRange,
      setTimeRange,
      recentHeadlines,
      rememberHeadline,
      storageBlocked: authorsMeta.blocked,
    }),
    [
      authors,
      setAuthors,
      authorsMeta,
      selectedAuthorId,
      selectedAuthor,
      templateId,
      chooseTemplate,
      length,
      specials,
      toggleSpecial,
      settingsOpen,
      toggleSettings,
      generateSettings,
      customSources,
      setCustomSources,
      timeRange,
      setTimeRange,
      recentHeadlines,
      rememberHeadline,
    ],
  );

  return (
    <ToastProvider>
      <SettingsCtx.Provider value={settings}>
        <SourceStateCtx.Provider value={sourceState}>
          <SourceDispatchCtx.Provider value={sourceDispatch}>
            <OutputStateCtx.Provider value={outputState}>
              <OutputDispatchCtx.Provider value={outputDispatch}>
                {children}
              </OutputDispatchCtx.Provider>
            </OutputStateCtx.Provider>
          </SourceDispatchCtx.Provider>
        </SourceStateCtx.Provider>
      </SettingsCtx.Provider>
    </ToastProvider>
  );
}
