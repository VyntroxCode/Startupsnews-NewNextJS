"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  emoji?: string;
  /** Stays visible in a searchable list no matter what's typed — for a pinned "Other (add
   * manually)" entry, which the user needs to reach precisely when their search finds nothing. */
  alwaysShow?: boolean;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlurValidate?: () => void;
  /** Turns the trigger into a combobox: the field itself is a text input, and the list below
   * narrows as you type. Long lists (countries) are unusable as a plain scroll. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shown on the trigger while nothing is selected — without it an unset select
   * renders as a blank box that reads as broken rather than as "nothing picked yet". */
  placeholder?: string;
  ariaLabel: string;
}

/** Generic dropdown that always opens below its trigger. Mirrors the site's other custom selects. */
export function CustomSelect({
  options,
  value,
  onChange,
  onBlurValidate,
  searchable = false,
  searchPlaceholder = "Search…",
  placeholder = "Select…",
  ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        close();
        onBlurValidate?.();
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    // Prefix matches first — typing "ind" should offer India before Finland.
    const starts: CustomSelectOption[] = [];
    const contains: CustomSelectOption[] = [];
    const pinned: CustomSelectOption[] = [];
    for (const o of options) {
      const label = o.label.toLowerCase();
      if (label.startsWith(term)) starts.push(o);
      else if (label.includes(term)) contains.push(o);
      else if (o.alwaysShow) pinned.push(o);
    }
    return [...starts, ...contains, ...pinned];
  }, [options, query]);

  // Keep the highlight on a row that still exists as the list narrows.
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Follow the highlight when it's driven off-screen by the arrow keys.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function selectOption(v: string) {
    onChange(v);
    close();
  }

  function moveActive(delta: number) {
    if (!filtered.length) return;
    setActiveIdx((i) => (i + delta + filtered.length) % filtered.length);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) moveActive(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (filtered[activeIdx]) selectOption(filtered[activeIdx].value);
      return;
    }
    if (!searchable && (e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  }

  const label = selected ? `${selected.emoji ? selected.emoji + " " : ""}${selected.label}` : "";

  const list = (
    <ul
      ref={listRef}
      id={listId}
      className={"custom-select-list" + (open ? " open" : "")}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={-1}
    >
      {filtered.map((o, i) => (
        <li
          key={o.value}
          data-idx={i}
          role="option"
          aria-selected={o.value === value}
          className={(o.value === value ? "selected" : "") + (i === activeIdx ? " active" : "")}
          onMouseEnter={() => setActiveIdx(i)}
          onClick={() => selectOption(o.value)}
        >
          {o.emoji ? `${o.emoji} ` : ""}
          {o.label}
        </li>
      ))}
      {filtered.length === 0 && <li className="cs-empty">No matches for &ldquo;{query.trim()}&rdquo;</li>}
    </ul>
  );

  if (searchable) {
    return (
      <div className="custom-select-wrap" ref={wrapRef}>
        <div
          className={"custom-select-btn is-combobox" + (open ? " open" : "")}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="cs-input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={ariaLabel}
            autoComplete="off"
            // Closed, the field reads as the current selection; open, it's a blank search box
            // whose placeholder still shows what's selected so nothing feels lost while typing.
            value={open ? query : label}
            placeholder={open ? label || searchPlaceholder : placeholder}
            onChange={(e) => {
              if (!open) setOpen(true);
              setQuery(e.target.value);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          <span className="caret" aria-hidden="true">▾</span>
        </div>
        {list}
      </div>
    );
  }

  return (
    <div className="custom-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={"custom-select-btn" + (open ? " open" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className={"cs-label" + (selected ? "" : " cs-placeholder")}>
          {selected ? label : placeholder}
        </span>
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      {list}
    </div>
  );
}
