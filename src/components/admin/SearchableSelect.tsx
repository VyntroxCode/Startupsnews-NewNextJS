'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Rendered before the label — a country flag, in the Region/Country case. */
  emoji?: string;
  /** Extra terms the search matches on without ever displaying them — alternative spellings,
   * so an option labelled "USA" is still found by typing "United States". */
  keywords?: string[];
  /** Stays in the list no matter what's typed. For the pinned "Others…" entry, which the admin
   * needs to reach precisely when their search found nothing. */
  alwaysShow?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}

/**
 * Type-to-filter dropdown for the admin forms — a plain <select> is unusable once the list runs
 * to ~200 entries (the country list). Styled with the surrounding admin theme's CSS variables,
 * so it drops into a `.pt-fg` field group next to normal inputs without extra styling.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const selectedLabel = selected ? `${selected.emoji ? selected.emoji + ' ' : ''}${selected.label}` : '';

  function close() {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }

  // Closes on a click anywhere outside — mousedown rather than click so it also fires when the
  // release lands outside the modal (the same text-selection-drag case the modal itself guards).
  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    // Prefix matches first — typing "ind" should offer India before Finland.
    const starts: SearchableSelectOption[] = [];
    const contains: SearchableSelectOption[] = [];
    const pinned: SearchableSelectOption[] = [];
    for (const o of options) {
      const label = o.label.toLowerCase();
      const aliases = o.keywords?.map((k) => k.toLowerCase()) || [];
      if (label.startsWith(term) || aliases.some((a) => a.startsWith(term))) starts.push(o);
      else if (label.includes(term) || aliases.some((a) => a.includes(term))) contains.push(o);
      else if (o.alwaysShow) pinned.push(o);
    }
    return [...starts, ...contains, ...pinned];
  }, [options, query]);

  // The highlight is reset on every keystroke, but the options list can also shrink underneath
  // it (the parent adds/removes the "current value" entry as the selection changes) — clamping
  // here keeps it on a row that actually exists without a render-triggering effect.
  const activeRow = filtered.length ? Math.min(activeIdx, filtered.length - 1) : 0;

  // Follow the highlight when the arrow keys drive it off-screen.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${activeRow}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeRow, open]);

  function selectOption(v: string) {
    onChange(v);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // Escape closes the dropdown only — without this the modal's own document-level Escape
      // handler (useEscapeKey) would close the whole form behind it. stopImmediatePropagation
      // rather than stopPropagation because that handler can sit on the same node as React's
      // own root listener, where plain stopPropagation doesn't reach it.
      if (open) e.nativeEvent.stopImmediatePropagation();
      close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (!filtered.length) return;
      setActiveIdx((activeRow + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (filtered[activeRow]) selectOption(filtered[activeRow].value);
    }
  }

  return (
    <div className="asel-wrap" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        className="asel-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        // Closed, the field reads as the current selection; open, it's a blank search box whose
        // placeholder still shows what's selected, so nothing feels lost while typing.
        value={open ? query : selectedLabel}
        placeholder={open ? selectedLabel || 'Type to search…' : placeholder}
        onChange={(e) => { if (!open) setOpen(true); setQuery(e.target.value); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      <span className="asel-caret" aria-hidden="true">▾</span>
      {open && (
        <ul className="asel-list" id={listId} ref={listRef} role="listbox" aria-label={ariaLabel}>
          {filtered.map((o, i) => (
            <li
              key={o.value}
              data-idx={i}
              role="option"
              aria-selected={o.value === value}
              className={(o.value === value ? 'asel-selected' : '') + (i === activeRow ? ' asel-active' : '')}
              onMouseEnter={() => setActiveIdx(i)}
              // mousedown, not click: the list unmounts on the input's blur otherwise.
              onMouseDown={(e) => { e.preventDefault(); selectOption(o.value); }}
            >
              {o.emoji ? `${o.emoji} ` : ''}{o.label}
            </li>
          ))}
          {filtered.length === 0 && <li className="asel-empty">No matches for &ldquo;{query.trim()}&rdquo;</li>}
        </ul>
      )}
      <style jsx global>{`
        .asel-wrap { position: relative; display: flex; flex-direction: column; min-width: 0; }
        /* border-box is required, not cosmetic: the admin form has no universal border-box rule,
           so width:100% on a content-box input adds its 12px/26px padding and 1px borders on top
           and the field overflows its grid cell into the one beside it. */
        .asel-wrap .asel-input { box-sizing: border-box; width: 100%; padding-right: 26px !important; cursor: text; }
        .asel-caret { position: absolute; right: 10px; top: 12px; font-size: 11px; color: var(--muted); pointer-events: none; }
        .asel-list {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 40;
          margin: 0; padding: 4px; list-style: none; max-height: 260px; overflow-y: auto;
          background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
          box-shadow: 0 8px 24px rgba(16,26,43,.16);
        }
        .asel-list li { padding: 7px 10px; border-radius: 6px; font-size: 13px; color: var(--text); cursor: pointer; }
        .asel-list li.asel-active { background: var(--surface-2); }
        .asel-list li.asel-selected { font-weight: 700; color: var(--accent); }
        .asel-list li.asel-empty { color: var(--muted); cursor: default; font-size: 12px; }
      `}</style>
    </div>
  );
}
