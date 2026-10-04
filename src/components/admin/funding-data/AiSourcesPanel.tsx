import { Plus } from 'lucide-react';
import { btnPrimary, cardCls, inputCls, labelCls } from './ui';

const SOURCES = [
  { name: 'Entrackr RSS', type: 'RSS Feed' },
  { name: 'Inc42 API', type: 'REST API' },
  { name: 'YourStory RSS', type: 'RSS Feed' },
  { name: 'Crunchbase API', type: 'REST API' },
  { name: 'Internal deal database', type: 'Internal database' },
];

/**
 * Admin › Funding Data › AI Data Sources — the preview's panel for the feeds the reader AI Assistant
 * will pull from. UI only until the assistant exists: nothing here is connected or scheduled, so
 * every source shows "not connected" and the form is disabled.
 */
export default function AiSourcesPanel() {
  return (
    <div className={`${cardCls} max-w-4xl p-5`}>
      <h2 className="m-0 text-base font-bold text-slate-900">Connected data sources</h2>
      <p className="m-0 mb-4 mt-1 text-sm text-slate-500">
        Feeds and APIs the AI Assistant will pull from when answering a reader&apos;s request: RSS feeds, partner APIs, or internal databases.
      </p>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-solid border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
        <span aria-hidden>⚠️</span>
        <span><b>Needs backend — coming soon.</b> This panel needs a server job to schedule feed pulls, store credentials securely and parse each source&apos;s format. Shown here so the layout is agreed; nothing is saved or fetched yet.</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SOURCES.map((s) => (
          <li key={s.name} className="flex items-center gap-2 rounded-lg border border-solid border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-slate-400" aria-hidden />
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">{s.name}</span>
              <span className="block text-xs text-slate-500">{s.type} · not connected</span>
            </span>
            <button type="button" disabled className="h-8 cursor-not-allowed rounded-lg border border-solid border-slate-300 bg-white px-3 text-xs font-semibold text-slate-400">Edit</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="ai-src-name">Source name</label>
          <input id="ai-src-name" type="text" disabled placeholder="e.g. Entrackr RSS, Crunchbase API" className={`${inputCls} cursor-not-allowed bg-slate-50`} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ai-src-type">Type</label>
          <select id="ai-src-type" disabled className={`${inputCls} cursor-not-allowed bg-slate-50`}><option>RSS Feed</option><option>REST API</option><option>Internal database</option></select>
        </div>
        <div>
          <label className={labelCls} htmlFor="ai-src-refresh">Refresh interval</label>
          <select id="ai-src-refresh" disabled className={`${inputCls} cursor-not-allowed bg-slate-50`}><option>Every hour</option><option>Every 6 hours</option><option>Daily</option></select>
        </div>
      </div>
      <div className="mt-4">
        <button type="button" className={btnPrimary} disabled><Plus size={16} /> Add source (coming soon)</button>
      </div>
    </div>
  );
}
