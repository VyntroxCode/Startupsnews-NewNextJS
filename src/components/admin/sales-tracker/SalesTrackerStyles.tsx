'use client';

export default function SalesTrackerStyles() {
  return (
    <style jsx global>{`
      .sales-tracker-page {
        --bg: #F8FAFC; --card: #FFFFFF; --border: #E2E8F0; --border-strong: #CBD5E1; --border-hover: #94A3B8;
        --text: #0F172A; --text2: #475569; --muted: #94A3B8;
        --pink: #6366F1; --pink-dark: #4F46E5; --pink-bg: #EEF2FF; --pink-bg2: #F8FAFC; --row-hover: #F5F7FF;
        --ring: 0 0 0 3px rgba(99, 102, 241, 0.18);
        --danger: #DC2626; --danger-bg: #FEF2F2; --danger-border: #FECACA;
        --radius: 14px;
        --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: var(--text);
        /* No max-width: like Posts / Newsletter, the page fills the content area and stretches when
           the sidebar collapses. It used to stop at 1400px, leaving a blank strip on wide screens. */
        width: 100%;
      }
      .sales-tracker-page * { box-sizing: border-box; }

      /* ---------- Page header ---------- */
      .sales-tracker-page .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
      .sales-tracker-page h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; color: var(--text); }
      .sales-tracker-page .sub { color: var(--text2); font-size: 13.5px; margin: 0; }

      /* ---------- Cards ---------- */
      .sales-tracker-page .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 18px; overflow: hidden; box-shadow: var(--shadow-sm); }
      .sales-tracker-page .card-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; user-select: none; transition: background-color 0.15s; }
      .sales-tracker-page .card-head:hover { background: var(--pink-bg2); }
      .sales-tracker-page .card-head h2 { font-size: 15px; font-weight: 700; margin: 0; color: var(--text); }
      .sales-tracker-page .card-head .chev { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--pink-bg); color: var(--pink-dark); font-size: 17px; line-height: 1; transition: transform 0.15s; }
      .sales-tracker-page .card-head .chev.open { transform: rotate(90deg); }
      .sales-tracker-page .card-body { padding: 0 20px 20px; }
      .sales-tracker-page .card-body.collapsed { display: none; }

      /* ---------- KPI tiles ---------- */
      .sales-tracker-page .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
      .sales-tracker-page .metric { background: #fff; border: 1px solid var(--border); border-left: 3px solid var(--pink); border-radius: 10px; padding: 14px 16px; }
      .sales-tracker-page .metric .num { font-size: 24px; font-weight: 700; line-height: 1.2; color: var(--text); font-variant-numeric: tabular-nums; }
      .sales-tracker-page .metric .lbl { font-size: 12px; color: var(--text2); font-weight: 600; margin-top: 2px; }
      .sales-tracker-page button.metric-btn { display: block; width: 100%; height: auto; text-align: left; font: inherit; padding: 14px 16px; background: #fff; border: 1px solid var(--border); border-left: 3px solid var(--pink); border-radius: 10px; cursor: pointer; transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s; }
      .sales-tracker-page button.metric-btn:hover { background: var(--pink-bg2); border-color: var(--pink); }
      .sales-tracker-page button.metric-btn.active { background: var(--pink-bg); border-color: var(--pink); box-shadow: var(--ring); }
      .sales-tracker-page button.metric-btn.alert { background: var(--danger-bg); border-color: var(--danger-border); border-left-color: var(--danger); }
      .sales-tracker-page button.metric-btn.alert:hover { border-color: var(--danger); }
      .sales-tracker-page button.metric-btn.alert.active { border-color: var(--danger); box-shadow: 0 0 0 3px #FEE2E2; }
      .sales-tracker-page button.metric-btn.alert .num, .sales-tracker-page button.metric-btn.alert .metric-cta { color: #B91C1C; }
      .sales-tracker-page .metric-btn .metric-open { margin-top: 4px; font-size: 12px; font-weight: 700; color: var(--danger); }
      .sales-tracker-page .metric-btn .metric-cta { margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--pink-dark); display: flex; align-items: center; gap: 6px; }
      .sales-tracker-page .metric-btn .chev { transition: transform 0.15s; display: inline-block; }
      .sales-tracker-page .metric-btn .chev.open { transform: rotate(90deg); }

      /* ---------- Form layout ---------- */
      .sales-tracker-page .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .sales-tracker-page .row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
      .sales-tracker-page .field-row { display: flex; gap: 16px; flex-wrap: wrap; flex: 1 1 100%; }
      .sales-tracker-page .field { flex: 1; min-width: 180px; }
      .sales-tracker-page label { display: block; font-size: 12.5px; color: var(--text2); margin-bottom: 6px; font-weight: 600; }
      .sales-tracker-page .opt { font-weight: 400; color: var(--muted); }
      .sales-tracker-page .hint { font-size: 12px; color: var(--muted); }
      .sales-tracker-page .field .hint { margin-top: 6px; }

      /* ---------- Inputs ---------- */
      .sales-tracker-page input[type=text], .sales-tracker-page input[type=date], .sales-tracker-page input[type=tel],
      .sales-tracker-page input[type=email], .sales-tracker-page select, .sales-tracker-page textarea {
        width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--border-strong); border-radius: 8px;
        font-size: 14px; background: #fff; color: var(--text); font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .sales-tracker-page textarea { height: auto; min-height: 84px; padding: 10px 12px; resize: vertical; line-height: 1.5; }
      .sales-tracker-page input::placeholder, .sales-tracker-page textarea::placeholder { color: var(--muted); }
      .sales-tracker-page input:hover, .sales-tracker-page select:hover, .sales-tracker-page textarea:hover { border-color: var(--border-hover); }
      .sales-tracker-page input:focus, .sales-tracker-page select:focus, .sales-tracker-page textarea:focus { outline: none; border-color: var(--pink); box-shadow: var(--ring); }
      .sales-tracker-page input.invalid { border-color: var(--danger); box-shadow: 0 0 0 3px #FEE2E2; }
      .sales-tracker-page input:disabled, .sales-tracker-page input[readonly] { background: #F1F5F9; color: var(--muted); cursor: not-allowed; }
      .sales-tracker-page .field-error { align-items: center; gap: 6px; color: var(--danger); font-size: 12px; font-weight: 600; margin-top: 6px; display: none; }
      .sales-tracker-page .field-error.visible { display: flex; }
      .sales-tracker-page .field.has-error .custom-select-btn,
      .sales-tracker-page .field.has-error input[type=tel],
      .sales-tracker-page .field.has-error input[type=text],
      .sales-tracker-page .field.has-error input[type=email] { border-color: var(--danger); box-shadow: 0 0 0 3px #FEE2E2; }

      /* ---------- Buttons ---------- */
      .sales-tracker-page button {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        height: 38px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--border-strong); background: #fff;
        font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--text); cursor: pointer; white-space: nowrap;
        transition: background-color 0.15s, border-color 0.15s, color 0.15s;
      }
      .sales-tracker-page button:hover { background: var(--pink-bg2); border-color: var(--border-hover); }
      .sales-tracker-page button:focus-visible { outline: none; box-shadow: var(--ring); }
      .sales-tracker-page button:disabled { opacity: 0.6; cursor: not-allowed; }
      .sales-tracker-page button.primary { background: var(--pink); color: #fff; border-color: var(--pink); }
      .sales-tracker-page button.primary:hover:not(:disabled) { background: var(--pink-dark); border-color: var(--pink-dark); }
      .sales-tracker-page button.small { height: 30px; padding: 0 12px; font-size: 12.5px; }
      .sales-tracker-page button.danger { color: var(--danger); border-color: var(--danger-border); }
      .sales-tracker-page button.danger:hover { background: var(--danger-bg); border-color: var(--danger); }
      .sales-tracker-page td button + button { margin-left: 6px; }

      /* ---------- Custom dropdowns ----------
         Styles the shared CustomSelect component (used directly by PhoneField and
         CountryCityFields in the Add/Edit lead modal) by its class names, not by which component
         renders it. CustomSelect keeps its list in the DOM and toggles .open — without the
         display:none below, every dropdown in the edit modal rendered already expanded. */
      .sales-tracker-page .custom-select-wrap { position: relative; width: 100%; }
      .sales-tracker-page .custom-select-btn {
        width: 100%; height: 40px; border: 1px solid var(--border-strong); background: #fff; padding: 0 12px;
        font-size: 14px; font-weight: 400; font-family: inherit; color: var(--text); border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .sales-tracker-page .custom-select-btn:hover { background: #fff; border-color: var(--border-hover); }
      .sales-tracker-page .custom-select-btn.open,
      .sales-tracker-page .custom-select-btn:focus-visible,
      .sales-tracker-page .custom-select-btn:focus-within { outline: none; border-color: var(--pink); box-shadow: var(--ring); }
      .sales-tracker-page .custom-select-btn.is-combobox { cursor: text; }
      .sales-tracker-page .custom-select-btn .cs-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
      .sales-tracker-page .custom-select-btn .cs-label.cs-placeholder { color: var(--muted); }
      .sales-tracker-page .custom-select-btn .caret { font-size: 10px; color: var(--muted); flex-shrink: 0; transition: transform 0.2s; }
      .sales-tracker-page .custom-select-btn.open .caret { transform: rotate(180deg); }
      .sales-tracker-page .custom-select-btn.is-disabled,
      .sales-tracker-page .custom-select-btn.is-disabled .cs-input { background: #F1F5F9; color: var(--muted); cursor: not-allowed; }
      .sales-tracker-page .custom-select-btn.is-disabled .caret { opacity: 0.4; }
      /* The searchable trigger's inner input must not draw a second box inside the trigger —
         (0,4,1) beats the generic input and .field.has-error input rules above. */
      .sales-tracker-page .field .custom-select-btn input.cs-input,
      .sales-tracker-page .field .custom-select-btn input.cs-input:hover,
      .sales-tracker-page .field .custom-select-btn input.cs-input:focus {
        flex: 1; width: auto; min-width: 0; height: auto; border: none; border-radius: 0; background: transparent;
        padding: 0; margin: 0; font: inherit; color: var(--text); outline: none; box-shadow: none;
      }
      .sales-tracker-page .custom-select-list {
        position: absolute; top: calc(100% + 6px); left: 0; width: 100%; min-width: 200px; max-height: 260px; overflow-y: auto;
        background: #fff; border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
        z-index: 60; margin: 0; padding: 6px; list-style: none; display: none;
      }
      .sales-tracker-page .custom-select-list.open { display: block; }
      .sales-tracker-page .custom-select-list li { padding: 8px 10px; font-size: 13.5px; border-radius: 6px; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 6px; }
      .sales-tracker-page .custom-select-list li:hover,
      .sales-tracker-page .custom-select-list li.active { background: var(--pink-bg); }
      .sales-tracker-page .custom-select-list li.selected { font-weight: 600; color: var(--pink-dark); }
      .sales-tracker-page .custom-select-list li.cs-empty { color: var(--muted); font-style: italic; cursor: default; }
      .sales-tracker-page .custom-select-list li.cs-empty:hover { background: transparent; }
      .sales-tracker-page .dropdown-search-item { position: sticky; top: -6px; margin: -6px -6px 6px; padding: 6px; background: #fff; border-bottom: 1px solid var(--border); cursor: default; z-index: 1; }
      .sales-tracker-page .dropdown-search-item:hover { background: #fff; }
      .sales-tracker-page .custom-select-list input.dropdown-search-input { height: 34px; font-size: 13px; padding: 0 10px; border-radius: 6px; }
      .sales-tracker-page .cs-flag { border-radius: 2px; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15); flex-shrink: 0; }

      /* Phone: code picker + optional custom code + number on one line. */
      .sales-tracker-page .phone-row { display: flex; gap: 8px; }
      .sales-tracker-page .phone-row .custom-select-wrap { width: 120px; flex: 0 0 120px; }
      .sales-tracker-page .phone-row > input[type=text] { flex: 0 0 80px; max-width: 80px; }
      /* min-width:0 (the flex default) let this shrink to illegibility whenever the Contact field's
         own column got narrow — e.g. squeezed as 1-of-4 in the old, narrower modal. A real floor
         keeps the number readable; the field wraps onto its own line instead if it doesn't fit. */
      .sales-tracker-page .phone-row input[type=tel] { flex: 1; min-width: 130px; }

      /* ---------- Modal ---------- */
      @keyframes st-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes st-pop { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: none; } }
      .sales-tracker-page .modal-overlay { display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); z-index: 1000; align-items: flex-start; justify-content: center; padding: 48px 16px; overflow-y: auto; animation: st-fade 0.15s ease-out; }
      /* ~80% of the viewport on desktop/tablet, capped so it doesn't sprawl on very wide monitors;
         reset to full-width under the mobile breakpoint below rather than shrinking further. */
      .sales-tracker-page .modal-box { background: var(--card); border-radius: 16px; width: 80vw; max-width: 1400px; box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28); animation: st-pop 0.18s ease-out; }
      .sales-tracker-page .modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid var(--border); }
      .sales-tracker-page .modal-head h2 { margin: 0; font-size: 17px; font-weight: 700; color: var(--text); }
      .sales-tracker-page button.modal-close { width: 34px; height: 34px; padding: 0; background: none; border: none; font-size: 22px; line-height: 1; color: var(--muted); border-radius: 8px; }
      .sales-tracker-page button.modal-close:hover { background: #F1F5F9; color: var(--text); }
      .sales-tracker-page .modal-body { padding: 22px 24px 6px; }
      .sales-tracker-page .modal-meta { display: inline-block; font-size: 12.5px; color: var(--text2); background: var(--pink-bg2); border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; margin-bottom: 18px; }
      .sales-tracker-page .modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); background: var(--pink-bg2); border-radius: 0 0 16px 16px; }
      @media (prefers-reduced-motion: reduce) {
        .sales-tracker-page .modal-overlay, .sales-tracker-page .modal-box { animation: none; }
      }

      /* ---------- Tables ---------- */
      .sales-tracker-page .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
      .sales-tracker-page table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
      .sales-tracker-page th, .sales-tracker-page td { padding: 11px 12px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: middle; }
      .sales-tracker-page th { color: var(--text2); font-weight: 600; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; background: var(--pink-bg2); position: sticky; top: 0; z-index: 1; }
      .sales-tracker-page tbody tr:last-child td { border-bottom: none; }
      .sales-tracker-page tbody tr:hover td { background: var(--row-hover); }
      .sales-tracker-page #leadsTable tbody tr { cursor: pointer; }
      .sales-tracker-page #leadsTable tbody tr input, .sales-tracker-page #leadsTable tbody tr select, .sales-tracker-page #leadsTable tbody tr button { cursor: auto; }
      .sales-tracker-page #leadsTable tbody tr button { cursor: pointer; }
      .sales-tracker-page #leadsTable { min-width: max-content; }
      .sales-tracker-page #leadsTable th, .sales-tracker-page #leadsTable td { white-space: nowrap; }
      .sales-tracker-page #leadsTable td.cell-query { white-space: normal; max-width: 240px; color: var(--text2); }
      .sales-tracker-page .fys-submissions-table { min-width: max-content; }
      .sales-tracker-page .fys-submissions-table th, .sales-tracker-page .fys-submissions-table td { white-space: nowrap; }
      .sales-tracker-page .fys-submissions-table tbody tr { cursor: pointer; }
      .sales-tracker-page .fys-submissions-table td a { color: var(--pink-dark); text-decoration: none; }
      .sales-tracker-page .fys-submissions-table td a:hover { text-decoration: underline; }
      .sales-tracker-page td .inline-cell { width: 100%; min-width: 118px; height: 32px; padding: 0 8px; border: 1px solid var(--border-strong); border-radius: 6px; font-size: 12.5px; font-family: inherit; background: #fff; color: var(--text); }
      .sales-tracker-page td .inline-cell:hover { border-color: var(--pink); }
      .sales-tracker-page td .inline-cell.inline-cell-text { min-width: 170px; }
      .sales-tracker-page .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; background: var(--pink-bg); color: var(--pink-dark); }

      /* Summary breakdown grid keeps full cell borders. */
      .sales-tracker-page .summary-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .sales-tracker-page .summary-table th, .sales-tracker-page .summary-table td { padding: 8px 10px; border: 1px solid var(--border); text-align: center; position: static; }
      .sales-tracker-page .summary-table th { background: var(--pink-bg2); font-weight: 600; font-size: 11px; color: var(--text2); }
      .sales-tracker-page .summary-table td.rowlabel { text-align: left; font-weight: 600; background: var(--pink-bg2); }
      .sales-tracker-page .summary-table td.total { font-weight: 700; background: var(--pink-bg); color: var(--pink-dark); }
      .sales-tracker-page .summary-table tbody tr:hover td { background: inherit; }

      /* ---------- Toolbar, chips, messages ---------- */
      .sales-tracker-page .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 14px; }
      .sales-tracker-page .export-toolbar { display: flex; gap: 8px; margin-left: auto; }
      .sales-tracker-page .team-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--pink-bg); border-radius: 999px; padding: 5px 8px 5px 13px; font-size: 12.5px; margin: 3px 6px 3px 0; color: var(--pink-dark); font-weight: 600; }
      .sales-tracker-page .team-chip button { height: auto; border: none; background: none; padding: 0 2px; color: var(--muted); font-size: 15px; line-height: 1; }
      .sales-tracker-page .team-chip button:hover { background: none; color: var(--danger); }
      .sales-tracker-page .msg { font-size: 12.5px; padding: 10px 12px; border-radius: 8px; margin: 4px 0 16px; font-weight: 600; }
      .sales-tracker-page .msg.err { background: var(--danger-bg); color: #B91C1C; border: 1px solid var(--danger-border); }
      .sales-tracker-page .pending-banner {
        display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
        font-size: 12.5px; font-weight: 600; color: var(--pink-dark); background: var(--pink-bg);
        border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;
      }

      /* ---------- Charts ---------- */
      .sales-tracker-page .charts-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 22px; }
      .sales-tracker-page .chart-title { font-size: 12px; font-weight: 700; color: var(--text2); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .sales-tracker-page .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
      .sales-tracker-page .bar-label { width: 150px; font-size: 12.5px; color: var(--text2); flex-shrink: 0; }
      .sales-tracker-page .bar-track { flex: 1; background: #F1F5F9; border-radius: 999px; height: 10px; overflow: hidden; }
      .sales-tracker-page .bar-fill { height: 100%; background: var(--pink); border-radius: 999px; transition: width 0.3s; }
      .sales-tracker-page .bar-count { width: 28px; font-size: 12.5px; font-weight: 700; color: var(--text); text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }

      /* ---------- Sponsor Event submissions card + detail modal ---------- */
      .sales-tracker-page .se-intro { display: flex; align-items: baseline; justify-content: space-between; gap: 8px 16px; flex-wrap: wrap; }
      .sales-tracker-page .se-intro h2 { margin: 0; font-size: 15.5px; color: var(--pink-dark); }
      .sales-tracker-page .se-toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px; }
      .sales-tracker-page .se-toolbar .field { flex: 0 1 320px; }
      .sales-tracker-page .se-count { margin-left: auto; font-size: 12.5px; font-weight: 600; color: var(--text2); align-self: center; }
      .sales-tracker-page .se-table { min-width: max-content; }
      .sales-tracker-page .se-table th, .sales-tracker-page .se-table td { white-space: nowrap; }
      .sales-tracker-page .se-table tbody tr { cursor: pointer; }
      .sales-tracker-page .se-table td.se-cell-title { white-space: normal; min-width: 200px; max-width: 280px; font-weight: 600; }
      .sales-tracker-page .se-table td a { color: var(--pink-dark); text-decoration: none; }
      .sales-tracker-page .se-table td a:hover { text-decoration: underline; }
      .sales-tracker-page .se-table td.se-empty { text-align: center; color: var(--muted); padding: 28px 12px; cursor: default; }
      .sales-tracker-page .se-thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); background: #F1F5F9; display: block; }
      .sales-tracker-page .badge.se-when { margin-left: 8px; padding: 2px 8px; font-size: 10.5px; }
      .sales-tracker-page .badge.se-past { background: #F1F5F9; color: var(--text2); }
      .sales-tracker-page .se-detail { display: grid; grid-template-columns: minmax(200px, 300px) 1fr; gap: 28px; align-items: start; margin-bottom: 8px; }
      .sales-tracker-page .se-poster img { width: 100%; display: block; border-radius: 10px; border: 1px solid var(--border); background: #F1F5F9; }
      .sales-tracker-page .se-poster-link { display: inline-block; margin-top: 8px; font-size: 12.5px; font-weight: 600; color: var(--pink-dark); text-decoration: none; }
      .sales-tracker-page .se-poster-link:hover { text-decoration: underline; }
      .sales-tracker-page .se-poster-empty { aspect-ratio: 3 / 4; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--border-strong); border-radius: 10px; color: var(--muted); font-size: 13px; }
      .sales-tracker-page .se-section { margin-bottom: 22px; }
      .sales-tracker-page .se-section h3 { margin: 0 0 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text2); }
      .sales-tracker-page .se-kv { display: grid; grid-template-columns: 150px 1fr; gap: 10px 16px; margin: 0; font-size: 13.5px; }
      .sales-tracker-page .se-kv dt { color: var(--text2); font-weight: 600; }
      .sales-tracker-page .se-kv dd { margin: 0; color: var(--text); overflow-wrap: anywhere; }
      .sales-tracker-page .se-kv a { color: var(--pink-dark); text-decoration: none; }
      .sales-tracker-page .se-kv a:hover { text-decoration: underline; }
      .sales-tracker-page .se-desc { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13.5px; line-height: 1.6; background: var(--pink-bg2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
      /* ---------- Expand North Star enquiries (EnsEnquiryDetailModal; some rules here are unused
         leftovers from the removed EnsEnquiriesCard table/toolbar) ---------- */
      .sales-tracker-page .msg.ok { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
      .sales-tracker-page .se-toolbar .field.ee-filter { flex: 0 1 240px; }
      .sales-tracker-page .ee-table tbody tr:focus-visible { outline: 2px solid var(--pink); outline-offset: -2px; }
      .sales-tracker-page .badge.ee-badge { white-space: nowrap; }
      .sales-tracker-page .badge.ee-badge.is-delegate { background: #E2E8F0; color: #1E293B; }
      .sales-tracker-page .badge.ee-badge.is-booth { background: var(--pink-bg); color: var(--pink-dark); }
      .sales-tracker-page .badge.ee-badge.is-others { background: #FEF3C7; color: #92400E; }
      .sales-tracker-page .badge.ee-status { white-space: nowrap; }
      .sales-tracker-page .badge.ee-status.is-none { background: #F1F5F9; color: #64748B; border: 1px dashed #CBD5E1; }
      .sales-tracker-page .badge.ee-status.is-confirmed { background: #D1FAE5; color: #065F46; }
      .sales-tracker-page .badge.ee-status.is-followed-up { background: #DBEAFE; color: #1E40AF; }
      .sales-tracker-page .badge.ee-status.is-cancelled { background: #FEE2E2; color: #991B1B; }
      .sales-tracker-page .ee-form-divider { margin: 4px 0 12px; padding-top: 14px; border-top: 1px solid var(--border); font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text2); }
      .sales-tracker-page .ee-modal { max-width: 1040px; }
      .sales-tracker-page .ee-dates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
      .sales-tracker-page .ee-date { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border); border-left: 3px solid var(--border-strong); border-radius: 10px; background: #fff; }
      .sales-tracker-page .ee-date.is-edited { border-left-color: var(--pink); }
      .sales-tracker-page .ee-date-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text2); }
      .sales-tracker-page .ee-date-val { font-size: 15px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
      /* Detail view: four titled panels in a 2×2 grid — Contact, Travelling from, Participating as, Conversation. */
      .sales-tracker-page .ee-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
      .sales-tracker-page .ee-panel { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--border); border-top: 3px solid var(--border-strong); border-radius: 12px; background: #fff; padding: 0 18px 18px; }
      .sales-tracker-page .ee-panel-head { display: flex; flex-direction: column; gap: 2px; margin: 0 -18px 16px; padding: 12px 18px; background: var(--pink-bg2); border-bottom: 1px solid var(--border); }
      .sales-tracker-page .ee-panel-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text); letter-spacing: 0; text-transform: none; }
      .sales-tracker-page .ee-panel-head span { font-size: 12px; color: var(--text2); }
      .sales-tracker-page .ee-panel-kv { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 0 16px; margin: 0; font-size: 13.5px; }
      .sales-tracker-page .ee-panel-kv dt { padding: 9px 0; color: var(--text2); font-weight: 600; border-bottom: 1px solid var(--border); }
      .sales-tracker-page .ee-panel-kv dd { margin: 0; padding: 9px 0; color: var(--text); font-weight: 500; overflow-wrap: anywhere; border-bottom: 1px solid var(--border); }
      .sales-tracker-page .ee-panel-kv dt:nth-last-of-type(1), .sales-tracker-page .ee-panel-kv dd:last-of-type { border-bottom: 0; }
      .sales-tracker-page .ee-panel-kv a { color: var(--pink-dark); text-decoration: none; }
      .sales-tracker-page .ee-panel-kv a:hover { text-decoration: underline; }
      .sales-tracker-page .ee-panel.is-delegate { border-top-color: #334155; }
      .sales-tracker-page .ee-panel.is-booth { border-top-color: var(--pink); }
      .sales-tracker-page .ee-panel.is-others { border-top-color: #D97706; }
      .sales-tracker-page .ee-panel.is-status-none { border-top-color: #94A3B8; }
      .sales-tracker-page .ee-panel.is-status-confirmed { border-top-color: #059669; }
      .sales-tracker-page .ee-panel.is-status-followed-up { border-top-color: #2563EB; }
      .sales-tracker-page .ee-panel.is-status-cancelled { border-top-color: #DC2626; }
      .sales-tracker-page .ee-status-row { display: flex; align-items: center; gap: 12px; }
      .sales-tracker-page .ee-status-lbl { font-size: 13.5px; font-weight: 600; color: var(--text2); }
      .sales-tracker-page .ee-status-row .badge.ee-status { font-size: 13px; padding: 5px 14px; }
      .sales-tracker-page .ee-panel-note { margin: 14px 0 0; font-size: 13px; line-height: 1.6; color: var(--text2); background: var(--pink-bg2); border: 1px dashed var(--border-strong); border-radius: 10px; padding: 12px 14px; }
      .sales-tracker-page .ee-package-name { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); }
      .sales-tracker-page .ee-package-sub { margin: 14px 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text2); }
      .sales-tracker-page .ee-inclusions { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 13.5px; }
      .sales-tracker-page .ee-inclusions li { position: relative; padding-left: 22px; color: var(--text); }
      .sales-tracker-page .ee-inclusions li::before { content: '✓'; position: absolute; left: 0; top: 0; font-weight: 700; color: #059669; }
      .sales-tracker-page .ee-inclusions li.is-highlight { font-weight: 700; }
      .sales-tracker-page .ee-inclusions li.is-highlight::before { color: var(--pink); }
      .sales-tracker-page a.se-btn-link.ee-btn-ghost { background: #fff; color: var(--pink-dark); }
      .sales-tracker-page a.se-btn-link.ee-btn-ghost:hover { background: var(--pink-bg2); }
      @media (max-width: 760px) {
        .sales-tracker-page .ee-dates, .sales-tracker-page .ee-panels { grid-template-columns: minmax(0, 1fr); }
        .sales-tracker-page .ee-panel-kv { grid-template-columns: minmax(0, 1fr); gap: 0; }
        .sales-tracker-page .ee-panel-kv dt { padding-bottom: 2px; border-bottom: 0; }
      }
      .sales-tracker-page a.se-btn-link { display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--pink); background: var(--pink); color: #fff; font-size: 13.5px; font-weight: 600; text-decoration: none; white-space: nowrap; }
      .sales-tracker-page a.se-btn-link:hover { background: var(--pink-dark); border-color: var(--pink-dark); }
      @media (max-width: 700px) {
        .sales-tracker-page .se-detail { grid-template-columns: 1fr; }
        .sales-tracker-page .se-kv { grid-template-columns: 1fr; gap: 2px 0; }
        .sales-tracker-page .se-kv dd { margin-bottom: 10px; }
        .sales-tracker-page .se-count { margin-left: 0; }
        .sales-tracker-page .modal-actions a.se-btn-link { width: 100%; }
      }

      /* ---------- Small screens ---------- */
      @media (max-width: 700px) {
        .sales-tracker-page .charts-wrap { grid-template-columns: 1fr; }
        .sales-tracker-page .export-toolbar { margin-left: 0; }
        .sales-tracker-page .modal-overlay { padding: 16px 10px; }
        /* The 80vw modal width above is for desktop/tablet — on a small screen that's a narrower
           box than before, not wider, so give it back the full-width behavior here instead. */
        .sales-tracker-page .modal-box { width: 100%; }
        .sales-tracker-page .modal-head, .sales-tracker-page .modal-actions { padding-left: 16px; padding-right: 16px; }
        .sales-tracker-page .modal-body { padding: 18px 16px 4px; }
        .sales-tracker-page .modal-actions { flex-direction: column-reverse; }
        .sales-tracker-page .modal-actions button { width: 100%; }
      }
      @media (max-width: 480px) {
        .sales-tracker-page .phone-row { flex-wrap: wrap; }
        .sales-tracker-page .phone-row .custom-select-wrap { flex: 0 0 120px; }
        .sales-tracker-page .phone-row input[type=tel] { flex: 1 1 100%; }
      }
    `}</style>
  );
}
