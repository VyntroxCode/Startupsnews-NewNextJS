/**
 * Attendance lateness — classifies a punch-in's clock-minutes against the admin-configured
 * shift start, grace period, short-leave cutoff, and half-day cutoff. Framework-agnostic (no
 * React) so it's usable from both the HR Tool's own client components and the isolated
 * Publisher/Event Admin and plain employee attendance widgets, which can't reach the rest of
 * the HR-internal code.
 *
 * Single source of truth — originally lived only in the HR Tool's own utils.tsx
 * (src/components/admin/hr-tool/utils.tsx), which now just re-exports this.
 */
export interface ShiftSettings {
  shiftStartTime: string; // "HH:MM"
  shiftGraceMinutes: number;
  /** Hours after shift start marking the end of the Short Leave window (grace period ends,
   * Short Leave begins; this many hours after shift start, Half Day begins). */
  shortLeaveMaxHours: number;
  /** Hours after shift start marking the end of the Half Day window — a punch-in later than
   * this counts as Absent. */
  halfDayThresholdHours: number;
  /** Secondary rule: total hours worked (punch-out minus punch-in) below which the day is
   * Absent regardless of arrival time — see hoursWorkedBucket/combinedAttendanceBucket. */
  halfDayMinWorkedHours: number;
  /** Hours worked at/above which the day is a Half Day rather than Absent. */
  shortLeaveMinWorkedHours: number;
  /** Hours worked at/above which the day is a full, undocked day. */
  fullDayMinWorkedHours: number;
}

export interface LatenessInfo {
  late: boolean;
  text: string;
}

/** Punch-in bucket against shift start + grace cutoff — 'on-time' (at/before shift start),
 * 'grace' (within the grace period), 'late' (past the grace period; arrival time alone no
 * longer says how late — see latenessInfo for that), plus 'short-leave' / 'half-day' / 'absent'
 * which combinedAttendanceBucket can produce from hours worked (see hoursWorkedBucket). Drives
 * attendance-calendar coloring; payroll deductions in HrToolService.computePayrollForMonth are
 * computed from hoursWorkedBucket directly and don't read this type. */
export type LatenessBucket = 'on-time' | 'grace' | 'late' | 'short-leave' | 'half-day' | 'absent';

function shiftBoundaries(rules: ShiftSettings): { shiftStart: number; graceEnd: number; shortLeaveEnd: number; halfDayEnd: number } {
  const [h, m] = rules.shiftStartTime.split(':').map(Number);
  const shiftStart = h * 60 + m;
  return {
    shiftStart,
    graceEnd: shiftStart + Number(rules.shiftGraceMinutes || 0),
    shortLeaveEnd: shiftStart + Math.round(Number(rules.shortLeaveMaxHours || 0) * 60),
    halfDayEnd: shiftStart + Math.round(Number(rules.halfDayThresholdHours || 0) * 60),
  };
}

/**
 * Arrival time now only answers "did they arrive on time?" — it no longer downgrades a day to
 * Short Leave / Half Day / Absent. Those outcomes are decided solely by hours worked (see
 * hoursWorkedBucket / combinedAttendanceBucket), which is the rule HR asked to run on.
 * shortLeaveMaxHours and halfDayThresholdHours are consequently no longer read here.
 */
export function latenessBucket(inMinutes: number | null, rules: ShiftSettings): LatenessBucket | null {
  if (inMinutes == null) return null;
  const { shiftStart, graceEnd } = shiftBoundaries(rules);
  if (inMinutes <= shiftStart) return 'on-time';
  if (inMinutes <= graceEnd) return 'grace';
  // Past the grace period is simply "late". It costs nothing on its own; what the day is worth
  // comes from how long they actually worked.
  return 'late';
}

/**
 * Same cutoffs as latenessBucket, but classifies arrival time itself into the short-leave/
 * half-day/absent tiers instead of collapsing everything past grace into 'late'. Used only by
 * the HR "Today" table, which wants to flag arrival severity directly and immediately (before
 * there's even a punch-out to compute hours worked from). The employee calendar and payroll
 * intentionally stay on hours-worked (hoursWorkedBucket / combinedAttendanceBucket) so a late
 * arrival doesn't count against someone who ends up working a full day — see latenessBucket.
 */
export function arrivalBucket(inMinutes: number | null, rules: ShiftSettings): LatenessBucket | null {
  if (inMinutes == null) return null;
  const { shiftStart, graceEnd, shortLeaveEnd, halfDayEnd } = shiftBoundaries(rules);
  if (inMinutes <= shiftStart) return 'on-time';
  if (inMinutes <= graceEnd) return 'grace';
  if (inMinutes <= shortLeaveEnd) return 'short-leave';
  if (inMinutes <= halfDayEnd) return 'half-day';
  return 'absent';
}

export function latenessInfo(inMinutes: number | null, rules: ShiftSettings): LatenessInfo | null {
  if (inMinutes == null) return null;
  const { shiftStart, graceEnd } = shiftBoundaries(rules);
  if (inMinutes <= shiftStart) return { late: false, text: 'On time' };
  const diff = inMinutes - shiftStart;
  const hrs = Math.floor(diff / 60), mins = diff % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(hrs + ' hr');
  parts.push(mins + ' min');
  const within = inMinutes <= graceEnd;
  return { late: !within, text: `${parts.join(' ')} late${within ? ' — within grace period' : ''}` };
}

/** Four-way bucket for total hours worked (punch-out minus punch-in) that day — the secondary
 * rule alongside the punch-in-time LatenessBucket above. 'full-time' at/above
 * fullDayMinWorkedHours, 'short-leave' at/above shortLeaveMinWorkedHours, 'half-day' at/above
 * halfDayMinWorkedHours, else 'absent'. Returns null when either punch is missing — hours worked
 * can't be computed yet (see combinedAttendanceBucket for how callers should treat that). */
export type HoursWorkedBucket = 'full-time' | 'short-leave' | 'half-day' | 'absent';

export function hoursWorkedBucket(inMinutes: number | null, outMinutes: number | null, rules: ShiftSettings): HoursWorkedBucket | null {
  if (inMinutes == null || outMinutes == null) return null;
  const workedHours = Math.max(0, outMinutes - inMinutes) / 60;
  if (workedHours < Number(rules.halfDayMinWorkedHours || 0)) return 'absent';
  if (workedHours < Number(rules.shortLeaveMinWorkedHours || 0)) return 'half-day';
  if (workedHours < Number(rules.fullDayMinWorkedHours || 0)) return 'short-leave';
  return 'full-time';
}

/** "HH:MM" -> minutes since midnight. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutes since midnight -> "hh:mm am/pm", matching the display format real punches already
 * use (see utils/time.ts's nowTimeStr) — so an approved regularization's requestedTime reads
 * identically to a real punch's inTime/outTime everywhere it's shown. Pure digit arithmetic, no
 * Date/timezone conversion, since the source is already a plain IST wall-clock value. Shared by
 * the server (HrToolService.decideRegularization, writing hr_attendance) and the client
 * (HrToolContext's optimistic update of the same record) so both agree exactly. */
export function formatTime12h(totalMinutes: number): string {
  const hh = Math.floor(totalMinutes / 60) % 24, mm = totalMinutes % 60;
  const period = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
}

/**
 * Credited working minutes for a day, clamped to the shift window. Time before the shift starts
 * and after it ends is not paid time: punching in at 9:45 and punching out at 22:00 credits
 * shift-start→shift-end, not the full raw span — a punch-out recorded late at night still only
 * counts up to shift end, exactly as if they'd clicked it right at shift end.
 */
export function creditedMinutes(inMinutes: number | null, outMinutes: number | null, shiftStart: string, shiftEnd: string): { inM: number | null; outM: number | null } {
  if (inMinutes == null || outMinutes == null) return { inM: null, outM: null };
  const start = hhmmToMinutes(shiftStart);
  const end = hhmmToMinutes(shiftEnd);
  const a = Math.max(inMinutes, start);
  const b = Math.min(outMinutes, end);
  return { inM: a, outM: Math.max(a, b) };
}

/** The day's REAL hours-worked bucket. A punch-in with no punch-out is a straight Absent — no
 * auto-close standing in for a real punch, no benefit of the doubt for however long it's been:
 * the day only earns a real bucket once punch-out has actually been clicked, whether that's
 * minutes later or at midnight (credited hours still clamp to the shift window either way — see
 * creditedMinutes). Applies uniformly to today and to past days alike; there's no "wait until
 * the day is over" grace period. Returns null only when there's no punch-in at all — that's not
 * this function's call, see the caller for how an unpunched day is treated (e.g. covered by
 * approved leave, or plain absent). Single source of truth for payroll
 * (HrToolService.computePayrollForMonth) and every attendance display (the Today table, the
 * attendance calendar) — one answer, everywhere. */
export function realDayHoursBucket(
  inMinutes: number | null, outMinutes: number | null, rules: ShiftSettings & { shiftEndTime: string }
): HoursWorkedBucket | null {
  if (inMinutes == null) return null;
  if (outMinutes == null) return 'absent';
  const { inM, outM } = creditedMinutes(inMinutes, outMinutes, rules.shiftStartTime, rules.shiftEndTime);
  return hoursWorkedBucket(inM, outM, rules);
}

/** The bucket that actually decides a day's status/pay: the punch-in-time bucket (primary) vs.
 * the hours-worked bucket (secondary) — whichever is worse wins, so being on time doesn't save
 * a day where they left after only a few hours, and working long hours doesn't undo a very late
 * arrival. Returns the primary time bucket unchanged whenever hours-worked isn't worse (or can't
 * be computed and `treatMissingOutAsAbsent` is false) — never returns a "better than primary"
 * result, since the hours rule can only downgrade, never upgrade.
 *
 * `treatMissingOutAsAbsent` controls what an unresolved (no punch-out yet) day does: payroll
 * passes true, since a day isn't fully resolved without a punch-out — the pre-existing "present
 * requires in AND out" rule, now graduated instead of binary. Live display contexts (the
 * attendance calendar, an in-progress "today") pass false, so a day isn't shown as Absent purely
 * because the shift hasn't ended yet. */
export function combinedAttendanceBucket(
  inMinutes: number | null, outMinutes: number | null, rules: ShiftSettings, treatMissingOutAsAbsent: boolean
): LatenessBucket | null {
  const timeBucket = latenessBucket(inMinutes, rules);
  if (timeBucket === null) return null;
  const hoursBucket = hoursWorkedBucket(inMinutes, outMinutes, rules) ?? (treatMissingOutAsAbsent ? 'absent' : null);
  // Hours worked is now the ONLY thing that decides the day's outcome; it no longer merely
  // "downgrades" a verdict that arrival time reached first. When it can't be computed (no
  // punch-out yet on an in-progress day) the arrival label stands in, so a live day isn't
  // judged before it has finished.
  if (hoursBucket === null) return timeBucket;
  // A full day's hours leaves only the arrival label (on-time vs within-grace) to report.
  return hoursBucket === 'full-time' ? timeBucket : hoursBucket;
}
