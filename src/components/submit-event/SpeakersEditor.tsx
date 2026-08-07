"use client";

import type { Speaker } from "@/modules/partnership-events/domain/types";

interface SpeakersEditorProps {
  speakers: Speaker[];
  error?: string;
  onChange: (speakers: Speaker[]) => void;
  onBlurValidate: () => void;
}

export function SpeakersEditor({ speakers, error, onChange, onBlurValidate }: SpeakersEditorProps) {
  function updateRow(idx: number, patch: Partial<Speaker>) {
    const next = speakers.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  }

  function removeRow(idx: number) {
    const next = speakers.filter((_, i) => i !== idx);
    onChange(next);
    onBlurValidate();
  }

  function addRow() {
    onChange([...speakers, { name: "", designation: "", company: "", others: "" }]);
  }

  return (
    <div className="field" id="field-speakers">
      <div className="speakers-box">
        {speakers.map((s, idx) => (
          <div className="speaker-row" data-idx={idx} key={idx}>
            <div className="field">
              <label>Name *</label>
              <input
                type="text"
                className="sp-name"
                value={s.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                onBlur={() => {
                  if (error) onBlurValidate();
                }}
              />
            </div>
            <div className="field">
              <label>Designation</label>
              <input
                type="text"
                className="sp-designation"
                value={s.designation}
                onChange={(e) => updateRow(idx, { designation: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Company / Org</label>
              <input
                type="text"
                className="sp-company"
                value={s.company}
                onChange={(e) => updateRow(idx, { company: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Others</label>
              <input
                type="text"
                className="sp-others"
                value={s.others}
                onChange={(e) => updateRow(idx, { others: e.target.value })}
              />
            </div>
            <button type="button" className="sp-remove-btn" title="Remove this guest" onClick={() => removeRow(idx)}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="add-link" onClick={addRow}>
          + Add speaker/guest
        </button>
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id="err-speakers">
        {error}
      </div>
    </div>
  );
}
