"use client";

import type { Speaker } from "@/modules/partnership-events/domain/types";
import { RepeatableList } from "@/components/ui/RepeatableList";

interface SpeakersEditorProps {
  speakers: Speaker[];
  error?: string;
  onChange: (speakers: Speaker[]) => void;
  onBlurValidate: () => void;
}

export function SpeakersEditor({ speakers, error, onChange, onBlurValidate }: SpeakersEditorProps) {
  return (
    <RepeatableList<Speaker>
      fieldId="speakers"
      items={speakers}
      onChange={onChange}
      min={0}
      max={20}
      createRow={() => ({ name: "", designation: "", company: "", others: "" })}
      addLabel="Add speaker/guest"
      removeTitle="Remove this guest"
      error={error}
      onBlurValidate={onBlurValidate}
      renderRow={(s, idx, update) => (
        <>
          <div className="field">
            <label>Name *</label>
            <input
              type="text"
              className="sp-name"
              value={s.name}
              onChange={(e) => update({ name: e.target.value })}
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
              onChange={(e) => update({ designation: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Company / Org</label>
            <input
              type="text"
              className="sp-company"
              value={s.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Others</label>
            <input
              type="text"
              className="sp-others"
              value={s.others}
              onChange={(e) => update({ others: e.target.value })}
            />
          </div>
        </>
      )}
    />
  );
}
