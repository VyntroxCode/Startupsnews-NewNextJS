"use client";

import { useState } from "react";
import { ChevronDown, PenLine, Settings, TriangleAlert } from "lucide-react";

import {
  Chip,
  FieldDivider,
  Select,
  SettingField,
} from "@/modules/content-studio/components/ui";
import { useSettings } from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import {
  ARTICLE_LENGTHS,
  SPECIAL_SECTIONS,
  TEMPLATES,
  TEMPLATE_HINTS,
} from "@/modules/content-studio/lib/data/templates";
import { AuthorRosterModal } from "./AuthorRosterModal";
import type { TemplateId } from "@/modules/content-studio/types";

// ── SETTINGS TOGGLE + COLLAPSIBLE BAR (content-studio-v17.html:372-436) ──

export function SettingsToggle() {
  const { settingsOpen, toggleSettings, length, templateId } = useSettings();
  const tmpl = TEMPLATES[templateId];
  const [from, to] = length.split("-");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggleSettings}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleSettings();
        }
      }}
      className="flex h-[38px] shrink-0 cursor-pointer items-center gap-2.5 border-b border-cs-edge bg-cs-s2 px-5 select-none"
    >
      <span className="flex flex-1 items-center gap-1.5 text-cs-meta font-bold tracking-[.08em] text-cs-t2 uppercase">
        <Settings aria-hidden className="size-3.5 shrink-0" />
        Generation settings
      </span>
      <span className="text-cs-meta text-cs-t3">
        {tmpl.label} · US English · {from}–{to}w · {tmpl.tone}
      </span>
      <ChevronDown
        aria-hidden
        className={`size-3.5 shrink-0 text-cs-t2 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
      />
    </div>
  );
}

export function SettingsBar() {
  const {
    settingsOpen,
    authors,
    selectedAuthorId,
    setSelectedAuthorId,
    selectedAuthor,
    templateId,
    chooseTemplate,
    length,
    setLength,
    specials,
    toggleSpecial,
  } = useSettings();
  const toast = useToast();
  const [rosterOpen, setRosterOpen] = useState(false);

  return (
    <>
      <div
        className={`shrink-0 overflow-hidden border-b border-cs-edge bg-cs-surface transition-[max-height] duration-300 ease-out ${
          settingsOpen ? "max-h-80" : "max-h-0"
        }`}
      >
        <div className="flex flex-wrap items-start gap-[18px] overflow-hidden px-5 pt-3.5 pb-[18px]">
          {/* Author */}
          <SettingField
            label="Author (byline + voice)"
            hint={
              selectedAuthor ? (
                <>
                  <strong className="text-cs-accent">Industry:</strong>{" "}
                  {selectedAuthor.beats || "General tech"}
                  {selectedAuthor.inferred ? (
                    <>
                      {" · "}
                      <span className="inline-flex items-center gap-1 text-cs-warn">
                        <TriangleAlert aria-hidden className="size-3 shrink-0" />
                        voice still being verified
                      </span>
                    </>
                  ) : null}
                </>
              ) : null
            }
          >
            <Select
              accent
              value={selectedAuthorId}
              onChange={(e) => setSelectedAuthorId(e.target.value)}
              className="min-w-[190px]"
            >
              <option value="">— No author / house —</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {(a.beats || "").split(",")[0]}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setRosterOpen(true)}
              className="mt-1.5 inline-flex w-fit cursor-pointer items-center gap-1 rounded-md border border-cs-edge px-2 py-[3px] text-[10.5px] text-cs-t2 hover:border-cs-accent hover:text-cs-accent"
            >
              <PenLine aria-hidden className="size-3 shrink-0" />
              Edit authors
            </button>
          </SettingField>

          <FieldDivider />

          {/* Template */}
          <SettingField label="Content template" hint={TEMPLATE_HINTS[templateId]}>
            <Select
              accent
              value={templateId}
              onChange={(e) => {
                const id = e.target.value as TemplateId;
                chooseTemplate(id);
                toast("Template: " + TEMPLATES[id].label, "success");
              }}
              className="min-w-[190px]"
            >
              <option value="news">News</option>
              <option value="conversational">Conversational</option>
            </Select>
          </SettingField>

          <FieldDivider />

          {/* Length */}
          <SettingField label="Article length">
            <Select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="min-w-[190px]"
            >
              {ARTICLE_LENGTHS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </SettingField>

          <FieldDivider />

          {/* Special sections */}
          <SettingField label="Special sections">
            <div className="flex max-w-[380px] flex-wrap gap-[5px]">
              {SPECIAL_SECTIONS.map((s) => (
                <Chip
                  key={s.val}
                  on={specials.includes(s.val)}
                  onClick={() => toggleSpecial(s.val)}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
          </SettingField>
        </div>
      </div>

      {rosterOpen ? <AuthorRosterModal onClose={() => setRosterOpen(false)} /> : null}
    </>
  );
}
