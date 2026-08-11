'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRY_CODES, COUNTRY_CODE_META } from './constants';

export default function CountryCodePicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const filtered = COUNTRY_CODES.filter((c) => !search.trim() || c.toLowerCase().includes(search.toLowerCase()) || (c === 'other' && 'other'.includes(search.toLowerCase())));
  const iso = COUNTRY_CODE_META[value];

  return (
    <div className="custom-select-wrap" ref={wrapRef}>
      <button type="button" className={`custom-select-btn${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="cs-label">
          {iso && <img className="cs-flag" src={`https://flagcdn.com/40x30/${iso}.png`} width={20} height={15} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
          {value === 'other' ? 'Other' : value}
        </span>
        <span className="caret" aria-hidden="true">&#9662;</span>
      </button>
      {open && (
        <ul className="custom-select-list open" role="listbox" aria-label="Country code">
          <li className="dropdown-search-item">
            <input className="dropdown-search-input" type="text" placeholder="Search code…" value={search} autoFocus
              onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} />
          </li>
          {filtered.map((c) => (
            <li key={c} data-value={c} className={c === value ? 'selected' : ''}
              onClick={() => { onChange(c); setOpen(false); setSearch(''); }}>
              {COUNTRY_CODE_META[c] && <img className="cs-flag" src={`https://flagcdn.com/40x30/${COUNTRY_CODE_META[c]}.png`} width={20} height={15} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
              {c === 'other' ? 'Other' : c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
