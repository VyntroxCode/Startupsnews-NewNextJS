'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellRing, X } from 'lucide-react';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';
import { ASSIGNMENT_STATUS_PENDING, type AssignedLead } from '@/modules/lead-assignments/domain/types';

// Same ringtone as the Events Tracker daily-report bell (partnership-tracker/page.tsx).
const RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/1356/1356.wav';
// Pending-leads alarm — rings at 11:00 AM and 4:00 PM IST, once per slot per day.
const SLOTS: { hour: number; minute: number }[] = [
  { hour: 11, minute: 0 },
  { hour: 16, minute: 0 },
];
const POLL_MS = 30000;

function istDayStamp(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function istTimeParts(d: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { hours: get('hour'), minutes: get('minute') };
}

/** Employee panel alarm: at 11:00 AM and 4:00 PM IST, if the logged-in employee has even one assigned
 * lead whose shared status is still Pending, the Events Tracker ringtone plays and a toast links to
 * My Leads. Mounted once in the employee layout, so it works on any employee page.
 *
 * Each slot is recorded in localStorage ("<IST day>|<slot keys>", keyed per employee) so it fires only
 * once a day, across polls and reloads; a slot missed because the panel wasn't open fires once on the
 * next poll after its time (same rule as the Events Tracker bell). A slot is only recorded once the
 * leads fetch succeeds, so a network blip retries on the next poll. */
export default function PendingLeadsAlarm({ employeeCode }: { employeeCode: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const storageKey = `emp_leads_alarm_rung:${employeeCode}`;
    let busy = false;
    let cancelled = false;

    async function check() {
      if (busy) return;
      const now = new Date();
      const today = istDayStamp(now);
      const { hours, minutes } = istTimeParts(now);

      let stored = '';
      try { stored = localStorage.getItem(storageKey) || ''; } catch { /* storage unavailable */ }
      const [rungDay, rungSlotsStr = ''] = stored.split('|');
      const rung = new Set(rungDay === today ? rungSlotsStr.split(',').filter(Boolean) : []);

      const due = SLOTS
        .map((s) => ({ ...s, key: `${s.hour}:${s.minute}` }))
        .filter((s) => !rung.has(s.key) && (hours > s.hour || (hours === s.hour && minutes >= s.minute)));
      if (!due.length) return;

      busy = true;
      try {
        const res = await fetch('/api/employee/leads', { headers: getEmployeeAuthHeaders() });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) return;
        const leads: AssignedLead[] = json.data || [];
        const pending = leads.filter((l) => l.status === ASSIGNMENT_STATUS_PENDING).length;
        if (cancelled) return;

        due.forEach((s) => rung.add(s.key));
        try { localStorage.setItem(storageKey, `${today}|${[...rung].join(',')}`); } catch { /* storage unavailable */ }

        if (pending > 0) {
          setPendingCount(pending);
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.play()?.catch((err) => console.warn('Pending leads alarm could not play:', err));
          }
        }
      } catch {
        /* network error — retry on the next poll */
      } finally {
        busy = false;
      }
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [employeeCode]);

  return (
    <>
      <audio ref={audioRef} preload="auto" src={RINGTONE_URL} className="hidden" />
      {pendingCount > 0 && (
        <div
          role="alert"
          className="fixed bottom-20 right-4 z-50 box-border flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-solid border-red-200 bg-white p-4 shadow-lg md:bottom-6 md:right-6"
        >
          <BellRing size={20} className="mt-0.5 shrink-0 animate-pulse text-red-600 motion-reduce:animate-none" aria-hidden />
          <div className="text-sm text-slate-700">
            <div className="font-semibold text-red-700">
              You have {pendingCount} pending lead{pendingCount === 1 ? '' : 's'}
            </div>
            <Link href="/employee/leads" onClick={() => setPendingCount(0)} className="font-medium text-blue-700 underline">
              Open My Leads
            </Link>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setPendingCount(0)}
            className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-slate-400 hover:text-slate-700"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
