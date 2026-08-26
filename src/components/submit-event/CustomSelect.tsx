"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  searchable?: boolean;
  searchPlaceholder?: string;
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
  ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlurValidate?.();
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      setSearch("");
      const t = setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.alwaysShow || o.label.toLowerCase().includes(term));
  }, [options, search]);

  function toggleOpen() {
    setOpen((o) => !o);
  }

  function selectOption(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="custom-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={"custom-select-btn" + (open ? " open" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="cs-label">
          {selected ? `${selected.emoji ? selected.emoji + " " : ""}${selected.label}` : ""}
        </span>
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      <ul className={"custom-select-list" + (open ? " open" : "")} role="listbox" aria-label={ariaLabel} tabIndex={-1}>
        {searchable && (
          <li className="dropdown-search-item">
            <input
              ref={searchInputRef}
              type="text"
              className="dropdown-search-input"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) selectOption(filtered[0].value);
                }
              }}
            />
          </li>
        )}
        {filtered.map((o) => (
          <li
            key={o.value}
            role="option"
            aria-selected={o.value === value}
            className={o.value === value ? "selected" : ""}
            onClick={() => selectOption(o.value)}
          >
            {o.emoji ? `${o.emoji} ` : ""}
            {o.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
