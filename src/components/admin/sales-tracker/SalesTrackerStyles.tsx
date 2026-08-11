'use client';

export default function SalesTrackerStyles() {
  return (
    <style jsx global>{`
      .sales-tracker-page {
        --bg: #F8FAFC; --card: #FFFFFF; --border: #E2E8F0; --border-strong: #CBD5E1;
        --text: #0F172A; --text2: #475569; --muted: #94A3B8;
        --pink: #6366F1; --pink-dark: #4F46E5; --pink-bg: #E0E7FF; --pink-bg2: #F1F5F9;
        --radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: var(--text);
      }
      .sales-tracker-page * { box-sizing: border-box; }
      .sales-tracker-page h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: var(--pink-dark); }
      .sales-tracker-page .sub { color: var(--text2); font-size: 13.5px; margin-bottom: 26px; }
      .sales-tracker-page .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 18px; overflow: hidden; }
      .sales-tracker-page .card-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; user-select: none; }
      .sales-tracker-page .card-head:hover { background: var(--pink-bg2); }
      .sales-tracker-page .card-head h2 { font-size: 15.5px; font-weight: 700; margin: 0; color: var(--text); }
      .sales-tracker-page .card-head .chev { color: var(--pink); font-size: 14px; transition: transform 0.15s; display: inline-block; }
      .sales-tracker-page .card-head .chev.open { transform: rotate(90deg); }
      .sales-tracker-page .card-body { padding: 0 20px 20px; }
      .sales-tracker-page .card-body.collapsed { display: none; }
      .sales-tracker-page .modal-overlay { display: flex; position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 1000; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto; }
      .sales-tracker-page .modal-box { background: var(--card); border-radius: var(--radius); width: 100%; max-width: 900px; box-shadow: 0 20px 60px rgba(15,23,42,0.3); }
      .sales-tracker-page .modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 22px; border-bottom: 1px solid var(--border); }
      .sales-tracker-page .modal-head h2 { margin: 0; font-size: 16.5px; font-weight: 700; color: var(--text); }
      .sales-tracker-page .modal-close { background: none; border: none; font-size: 24px; line-height: 1; color: var(--muted); cursor: pointer; padding: 2px 9px; border-radius: 6px; }
      .sales-tracker-page .modal-close:hover { background: var(--pink-bg2); color: var(--text); }
      .sales-tracker-page .modal-body { padding: 20px 22px 22px; }
      .sales-tracker-page .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .sales-tracker-page .row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
      .sales-tracker-page label { display: block; font-size: 12px; color: var(--text2); margin-bottom: 4px; font-weight: 600; }
      .sales-tracker-page input[type=text], .sales-tracker-page input[type=date], .sales-tracker-page input[type=tel],
      .sales-tracker-page input[type=email], .sales-tracker-page select, .sales-tracker-page textarea {
        width: 100%; padding: 9px 11px; border: 1px solid var(--border-strong); border-radius: 8px;
        font-size: 13.5px; background: #fff; color: var(--text); font-family: inherit;
      }
      .sales-tracker-page input:focus, .sales-tracker-page select:focus, .sales-tracker-page textarea:focus { outline: none; border-color: var(--pink); box-shadow: 0 0 0 3px var(--pink-bg); }
      .sales-tracker-page input.invalid { border-color: #D33; box-shadow: 0 0 0 3px #FCE4E4; }
      .sales-tracker-page textarea { resize: vertical; min-height: 56px; }
      .sales-tracker-page .field { flex: 1; min-width: 160px; }
      .sales-tracker-page button { padding: 9px 18px; border-radius: 8px; border: 1px solid var(--border-strong); background: #fff; font-size: 13.5px; cursor: pointer; font-weight: 600; color: var(--text); }
      .sales-tracker-page button:hover { background: var(--pink-bg2); }
      .sales-tracker-page button.primary { background: var(--pink); color: #fff; border-color: var(--pink); }
      .sales-tracker-page button.primary:hover { background: var(--pink-dark); }
      .sales-tracker-page button.small { padding: 5px 12px; font-size: 12px; }
      .sales-tracker-page button.danger { color: #DC2626; border-color: #FECACA; }
      .sales-tracker-page table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .sales-tracker-page th, .sales-tracker-page td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
      .sales-tracker-page th { color: var(--text2); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; background: var(--pink-bg2); }
      .sales-tracker-page tr:hover td { background: var(--pink-bg2); }
      .sales-tracker-page #leadsTable tbody tr { cursor: pointer; }
      .sales-tracker-page #leadsTable tbody tr input, .sales-tracker-page #leadsTable tbody tr select, .sales-tracker-page #leadsTable tbody tr button { cursor: auto; }
      .sales-tracker-page #leadsTable { min-width: max-content; }
      .sales-tracker-page #leadsTable th, .sales-tracker-page #leadsTable td { white-space: nowrap; }
      .sales-tracker-page #leadsTable td.cell-query { white-space: normal; max-width: 240px; }
      .sales-tracker-page .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 700; background: var(--pink-bg); color: var(--pink-dark); }
      .sales-tracker-page .summary-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .sales-tracker-page .summary-table th, .sales-tracker-page .summary-table td { padding: 7px 9px; border: 1px solid var(--border); text-align: center; }
      .sales-tracker-page .summary-table th { background: var(--pink-bg2); font-weight: 700; font-size: 11px; color: var(--pink-dark); }
      .sales-tracker-page .summary-table td.rowlabel { text-align: left; font-weight: 600; background: var(--pink-bg2); }
      .sales-tracker-page .summary-table td.total { font-weight: 700; background: var(--pink-bg); }
      .sales-tracker-page .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 18px; }
      .sales-tracker-page .metric { background: var(--pink-bg); border-radius: 10px; padding: 12px 14px; }
      .sales-tracker-page .metric .num { font-size: 22px; font-weight: 700; color: var(--pink-dark); }
      .sales-tracker-page .metric .lbl { font-size: 11.5px; color: var(--text2); font-weight: 600; }
      .sales-tracker-page .team-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--pink-bg); border-radius: 20px; padding: 5px 10px 5px 13px; font-size: 12.5px; margin: 3px 4px 3px 0; color: var(--pink-dark); font-weight: 600; }
      .sales-tracker-page .team-chip button { border: none; background: none; padding: 0; color: var(--muted); font-size: 15px; line-height: 1; }
      .sales-tracker-page .hint { font-size: 12px; color: var(--muted); }
      .sales-tracker-page .toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 14px; }
      .sales-tracker-page .export-toolbar { display: flex; gap: 8px; margin-left: auto; }
      .sales-tracker-page .export-toolbar button:disabled { opacity: 0.6; cursor: not-allowed; }
      .sales-tracker-page .msg { font-size: 12.5px; padding: 9px 11px; border-radius: 8px; margin-top: 8px; font-weight: 600; }
      .sales-tracker-page .msg.err { background: #FCE4E4; color: #B3231F; }
      .sales-tracker-page .charts-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
      .sales-tracker-page .chart-title { font-size: 12.5px; font-weight: 700; color: var(--text2); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
      .sales-tracker-page .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .sales-tracker-page .bar-label { width: 140px; font-size: 12px; color: var(--text2); flex-shrink: 0; }
      .sales-tracker-page .bar-track { flex: 1; background: var(--pink-bg2); border-radius: 6px; height: 16px; overflow: hidden; }
      .sales-tracker-page .bar-fill { height: 100%; background: var(--pink); border-radius: 6px; transition: width 0.3s; }
      .sales-tracker-page .bar-count { width: 24px; font-size: 12px; font-weight: 700; color: var(--pink-dark); text-align: right; flex-shrink: 0; }
      @media (max-width: 700px) { .sales-tracker-page .charts-wrap { grid-template-columns: 1fr; } }
      .sales-tracker-page .phone-row { display: flex; gap: 8px; }
      .sales-tracker-page .phone-row .custom-select-wrap { width: 110px; flex: 0 0 110px; }
      .sales-tracker-page .phone-row input[type=tel] { flex: 1; min-width: 0; }
      .sales-tracker-page .custom-select-wrap { position: relative; width: 100%; }
      .sales-tracker-page .custom-select-btn { width: 100%; border: 1px solid var(--border-strong); background: #fff; padding: 9px 11px; font-size: 13.5px; font-family: inherit; color: var(--text); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 6px; text-align: left; }
      .sales-tracker-page .custom-select-btn:hover, .sales-tracker-page .custom-select-btn.open { border-color: var(--pink); }
      .sales-tracker-page .custom-select-btn .cs-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
      .sales-tracker-page .custom-select-btn .caret { font-size: 10px; color: var(--muted); flex-shrink: 0; }
      .sales-tracker-page .custom-select-list { position: absolute; top: calc(100% + 6px); left: 0; min-width: 190px; max-height: 240px; overflow-y: auto; background: #fff; border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 12px 28px rgba(15,23,42,0.12); z-index: 60; margin: 0; padding: 5px; list-style: none; }
      .sales-tracker-page .custom-select-list li { padding: 8px 10px; font-size: 13px; border-radius: 6px; cursor: pointer; color: var(--text); display: flex; align-items: center; }
      .sales-tracker-page .custom-select-list li:hover { background: var(--pink-bg2); }
      .sales-tracker-page .custom-select-list li.selected { font-weight: 700; color: var(--pink-dark); }
      .sales-tracker-page .dropdown-search-item { position: sticky; top: -5px; margin: -5px -5px 5px -5px; padding: 6px; background: #fff; border-bottom: 1px solid var(--border); cursor: default; z-index: 1; }
      .sales-tracker-page .dropdown-search-input { width: 100%; border: 1px solid var(--border-strong); border-radius: 6px; padding: 7px 9px; font-size: 12.5px; font-family: inherit; color: var(--text); }
      .sales-tracker-page .cs-flag { margin-right: 2px; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); flex-shrink: 0; }
      .sales-tracker-page .field-error { align-items: center; gap: 6px; color: #B3231F; font-size: 11.5px; font-weight: 600; margin-top: 6px; display: none; }
      .sales-tracker-page .field-error.visible { display: flex; }
      .sales-tracker-page .field.has-error .custom-select-btn, .sales-tracker-page .field.has-error input[type=tel] { border-color: #D33; box-shadow: 0 0 0 3px #FCE4E4; }
      .sales-tracker-page td .inline-cell { width: 100%; min-width: 118px; padding: 6px 7px; border: 1px solid var(--border-strong); border-radius: 6px; font-size: 12.5px; font-family: inherit; background: #fff; color: var(--text); }
      .sales-tracker-page td .inline-cell:hover { border-color: var(--pink); }
      .sales-tracker-page td .inline-cell.inline-cell-text { min-width: 170px; }
    `}</style>
  );
}
