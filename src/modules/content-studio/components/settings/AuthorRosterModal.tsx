"use client";

import { useState } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";

import { Button } from "@/modules/content-studio/components/ui";
import { Modal } from "@/modules/content-studio/components/ui/Modal";
import { useSettings } from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import { blankAuthor } from "@/modules/content-studio/lib/data/authors";
import type { Author } from "@/modules/content-studio/types";

// ── AUTHOR ROSTER EDITOR (content-studio-v17.html:460-473, 787-822) ──
// The original scraped [data-f] attributes back out of the DOM on save
// (line 814). Here the rows edit a local draft array that is committed on Save.

const INPUT =
  "w-full rounded-[7px] border border-cs-edge px-[9px] py-[7px] font-cs-sans text-cs-ui outline-none focus:border-cs-accent";

export function AuthorRosterModal({ onClose }: { onClose: () => void }) {
  const { authors, setAuthors } = useSettings();
  const toast = useToast();
  const [draft, setDraft] = useState<Author[]>(() => structuredClone(authors));

  const update = (i: number, field: keyof Author, value: string | boolean) => {
    setDraft((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)),
    );
  };

  const save = () => {
    const cleaned = draft
      .filter((a) => a.name && a.name.trim())
      .map((a) => ({
        ...a,
        id: a.id || "a" + Math.random().toString(36).slice(2, 7),
      }));
    setAuthors(cleaned);
    toast("Authors saved", "success");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      z={9999}
      className="max-h-[86vh] w-full max-w-[680px] overflow-auto rounded-2xl bg-white px-[26px] py-6 shadow-[0_20px_60px_rgba(0,0,0,.3)]"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="font-cs-sans text-base">Author roster</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex cursor-pointer border-none bg-transparent text-cs-t3"
        >
          <X aria-hidden className="size-5 shrink-0" />
        </button>
      </div>

      <p className="mt-0 mb-3.5 text-cs-ui leading-[1.5] text-cs-t2">
        Voice traits marked <strong className="inline-flex items-center gap-0.5 align-bottom text-cs-warn">
          <TriangleAlert aria-hidden className="size-3 shrink-0" />
          inferred
        </strong> are
        best guesses — replace them with each author&apos;s real style and a
        one-line verified bio before publishing. Bylines link to the LinkedIn URL
        provided.
      </p>

      <div>
        {draft.map((a, i) => (
          <div key={a.id || i} className="mb-3 rounded-[10px] border border-cs-edge p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-cs-body">{a.name || "New author"}</strong>
              {a.inferred ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#f3d19a] bg-[#fef9ee] px-[7px] py-0.5 text-cs-label text-cs-warn">
                  <TriangleAlert aria-hidden className="size-2.5 shrink-0" />
                  inferred — verify
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#a7e3c9] bg-[#effaf3] px-[7px] py-0.5 text-cs-label text-[#059669]">
                  <CircleCheck aria-hidden className="size-2.5 shrink-0" />
                  verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                className={INPUT}
                value={a.name}
                placeholder="Name"
                onChange={(e) => update(i, "name", e.target.value)}
              />
              <input
                className={INPUT}
                value={a.role}
                placeholder="Role / title"
                onChange={(e) => update(i, "role", e.target.value)}
              />
            </div>

            <input
              className={`${INPUT} mt-2`}
              value={a.beats}
              placeholder="Beats (comma-separated)"
              onChange={(e) => update(i, "beats", e.target.value)}
            />
            <input
              className={`${INPUT} mt-2`}
              value={a.linkedin}
              placeholder="LinkedIn URL"
              onChange={(e) => update(i, "linkedin", e.target.value)}
            />
            <textarea
              className={`${INPUT} mt-2 resize-y`}
              rows={2}
              value={a.voice}
              placeholder="Voice traits — how this person actually writes"
              onChange={(e) => update(i, "voice", e.target.value)}
            />
            <textarea
              className={`${INPUT} mt-2 resize-y`}
              rows={3}
              value={a.structure ?? ""}
              placeholder="Article structure / pattern this author follows (paragraph-by-paragraph)"
              onChange={(e) => update(i, "structure", e.target.value)}
            />
            <textarea
              className={`${INPUT} mt-2 resize-y`}
              rows={2}
              value={a.bio}
              placeholder="One-line verified bio (shown near byline)"
              onChange={(e) => update(i, "bio", e.target.value)}
            />

            <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-cs-meta text-cs-t2">
              <input
                type="checkbox"
                checked={Boolean(a.inferred)}
                onChange={(e) => update(i, "inferred", e.target.checked)}
              />
              Voice still inferred (untick once you&apos;ve verified it)
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={save}>
          Save authors
        </Button>
        <Button onClick={() => setDraft((p) => [...p, blankAuthor()])}>
          + Add author
        </Button>
      </div>
    </Modal>
  );
}
