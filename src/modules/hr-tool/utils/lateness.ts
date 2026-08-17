/**
 * Attendance lateness — compares a punch-in's clock-minutes against the configured
 * shift start + grace period. Framework-agnostic (no React) so it's usable from both
 * the HR Tool's own client components and the isolated Publisher/Event Admin and plain
 * employee attendance widgets, which can't reach the rest of the HR-internal code.
 *
 * Single source of truth — originally lived only in the HR Tool's own utils.tsx
 * (src/components/admin/hr-tool/utils.tsx), which now just re-exports this.
 */
export interface ShiftSettings {
  shiftStartTime: string; // "HH:MM"
  shiftGraceMinutes: number;
}

export interface LatenessInfo {
  late: boolean;
  text: string;
}

/** Three-way punch-in bucket against shift start + grace period — 'on-time' (at/before shift
 * start), 'grace' (after shift start but within the grace period), 'late' (past grace). Used
 * to color-code the employee attendance calendar (green / orange / red) in addition to the
 * plain on-time/late split `latenessInfo` gives everywhere else. */
export type LatenessBucket = 'on-time' | 'grace' | 'late';

function shiftBoundaries(rules: ShiftSettings): { shiftStart: number; graceEnd: number } {
  const [h, m] = rules.shiftStartTime.split(':').map(Number);
  const shiftStart = h * 60 + m;
  return { shiftStart, graceEnd: shiftStart + Number(rules.shiftGraceMinutes || 0) };
}

export function latenessBucket(inMinutes: number | null, rules: ShiftSettings): LatenessBucket | null {
  if (inMinutes == null) return null;
  const { shiftStart, graceEnd } = shiftBoundaries(rules);
  if (inMinutes <= shiftStart) return 'on-time';
  if (inMinutes <= graceEnd) return 'grace';
  return 'late';
}

export function latenessInfo(inMinutes: number | null, rules: ShiftSettings): LatenessInfo | null {
  if (inMinutes == null) return null;
  const bucket = latenessBucket(inMinutes, rules);
  if (bucket !== 'late') return { late: false, text: 'On time' };
  const { graceEnd } = shiftBoundaries(rules);
  const diff = inMinutes - graceEnd;
  const hrs = Math.floor(diff / 60), mins = diff % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(hrs + ' hr');
  parts.push(mins + ' min');
  return { late: true, text: parts.join(' ') + ' late' };
}
