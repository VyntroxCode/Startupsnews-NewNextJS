'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, X } from 'lucide-react';
import type { UnreadLeadReplies } from '@/modules/lead-followups/domain/types';

const POLL_MS = 30000;
/** Fired by My Leads when the reader opens a lead (which marks its replies seen), so the pop-up
 * re-checks straight away instead of waiting for the next poll. */
export const LEAD_REPLIES_SEEN_EVENT = 'lead-replies-seen';

/** New-reply pop-up for anyone who can be assigned a Sales Tracker lead: a silent box in the corner
 * saying an admin has replied on one of their leads, with a link to My Leads filtered to the leads
 * that have unseen replies. Mounted once per panel (employee shell; admin layout for Event /
 * Publisher Admins), so it shows on any page.
 *
 * `endpoint` (…/unread-replies) is polled every 30 seconds. The box appears when the newest unseen
 * reply is one this browser hasn't already announced — its id is remembered in localStorage under
 * `storageKey` — so a reply is announced once, not on every poll or page change, while one that
 * arrived while the panel was closed is still announced on the next visit. Dismissing only hides
 * the box; the lead keeps its "new" badge in My Leads until it is opened. The box also goes away
 * by itself once nothing is unseen any more. */
export default function NewLeadReplyToast({ endpoint, getHeaders, leadsHref, storageKey }: {
  endpoint: string;
  getHeaders: () => HeadersInit;
  /** The panel's My Leads page. */
  leadsHref: string;
  /** localStorage key, unique per person. */
  storageKey: string;
}) {
  const [shown, setShown] = useState<UnreadLeadReplies | null>(null);

  useEffect(() => {
    let cancelled = false;
    let busy = false;

    async function check() {
      if (busy) return;
      busy = true;
      try {
        const res = await fetch(endpoint, { headers: getHeaders() });
        const json = await res.json().catch(() => null);
        if (cancelled || !res.ok || !json?.success) return;
        const data: UnreadLeadReplies = json.data;
        if (!data.count) { setShown(null); return; }
        const newest = data.items[0]?.replyId ?? 0;
        let announced = 0;
        try { announced = Number(localStorage.getItem(storageKey)) || 0; } catch { /* storage unavailable */ }
        if (newest > announced) {
          try { localStorage.setItem(storageKey, String(newest)); } catch { /* storage unavailable */ }
          setShown(data);
        } else {
          // Already announced: keep an open box's numbers current, but don't reopen a dismissed one.
          setShown((prev) => (prev ? data : prev));
        }
      } catch {
        /* network error — retry on the next poll */
      } finally {
        busy = false;
      }
    }

    check();
    const id = setInterval(check, POLL_MS);
    window.addEventListener(LEAD_REPLIES_SEEN_EVENT, check);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener(LEAD_REPLIES_SEEN_EVENT, check); };
  }, [endpoint, getHeaders, storageKey]);

  if (!shown) return null;
  const first = shown.items[0];
  const leadCount = new Set(shown.items.map((i) => `${i.source}:${i.leadId}`)).size;

  return (
    <div
      role="status"
      className="fixed bottom-36 right-4 z-[60] box-border flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-solid border-indigo-200 bg-white p-4 shadow-lg md:bottom-24 md:right-6"
    >
      <MessageSquare size={20} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden />
      <div className="min-w-0 flex-1 text-sm text-slate-700">
        <div className="font-semibold text-indigo-700">
          {shown.count === 1 ? 'New reply from admin' : `${shown.count} new replies from admin`}
        </div>
        {first && (
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {shown.count === 1 || leadCount === 1
              ? `${first.authorName} · on lead ${first.leadName || 'assigned to you'}`
              : `On ${leadCount} of your leads · latest from ${first.authorName}`}
          </div>
        )}
        <Link href={`${leadsHref}?replies=new`} onClick={() => setShown(null)} className="mt-1 inline-block font-medium text-blue-700 underline">
          Open in My Leads
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setShown(null)}
        className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-slate-400 hover:text-slate-700"
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
