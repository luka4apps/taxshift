import { daysBetween, type IsoDate } from './dates.ts';
import type { Election, Measure, Stage } from './schema.ts';
import { deriveStatus } from './status.ts';

export type TimelineKind = 'stage' | 'effective' | 'deadline' | 'election';

export interface TimelineItem {
  date: IsoDate;
  label: string;
  detail?: string;
  kind: TimelineKind;
  measureId?: string;
  isPast: boolean;
}

export const STAGE_TEXT: Record<Stage, string> = {
  announced: 'announced',
  draft: 'draft law released',
  'bill-introduced': 'bill introduced',
  'passed-house': 'passed House',
  'passed-senate': 'passed Senate',
  'passed-parliament': 'passed Parliament',
  'royal-assent': 'became law',
  withdrawn: 'withdrawn',
  lapsed: 'lapsed',
  repealed: 'repealed',
};

const KIND_ORDER: Record<TimelineKind, number> = { stage: 0, deadline: 1, effective: 2, election: 3 };

export function buildTimeline(measures: Measure[], election: Election, today: IsoDate): TimelineItem[] {
  const isPast = (d: IsoDate) => daysBetween(today, d) < 0;
  const items: TimelineItem[] = [];

  for (const m of measures) {
    for (const e of m.history) {
      items.push({ date: e.date, label: `${m.shortTitle}: ${STAGE_TEXT[e.stage]}`, kind: 'stage', measureId: m.id, isPast: isPast(e.date) });
    }
    if (deriveStatus(m, today).tone === 'dead') continue;
    if (m.effectiveDate) {
      items.push({ date: m.effectiveDate, label: `${m.shortTitle}: starts`, kind: 'effective', measureId: m.id, isPast: isPast(m.effectiveDate) });
    }
    for (const a of m.actions) {
      if (!a.deadline) continue;
      items.push({ date: a.deadline, label: `${m.shortTitle}: action deadline`, detail: a.text, kind: 'deadline', measureId: m.id, isPast: isPast(a.deadline) });
    }
  }

  if (election.announcedDate) {
    items.push({ date: election.announcedDate, label: 'Federal election', kind: 'election', isPast: isPast(election.announcedDate) });
  } else {
    items.push({ date: election.earliestLikely, label: 'Earliest likely federal election', kind: 'election', isPast: isPast(election.earliestLikely) });
    items.push({ date: election.latestPossible, label: 'Latest possible federal election', kind: 'election', isPast: isPast(election.latestPossible) });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

export function upcoming(items: TimelineItem[], today: IsoDate, n: number): TimelineItem[] {
  return items.filter((i) => daysBetween(today, i.date) >= 0).slice(0, n);
}

export interface DateGroup {
  date: IsoDate;
  items: TimelineItem[];
}

/** "When it bites": the next n distinct days on which something starts or an election can fall. */
export function keyDates(items: TimelineItem[], today: IsoDate, n: number): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const i of items) {
    if (i.kind !== 'effective' && i.kind !== 'election') continue;
    if (daysBetween(today, i.date) < 0) continue;
    const last = groups.at(-1);
    if (last?.date === i.date) last.items.push(i);
    else groups.push({ date: i.date, items: [i] });
  }
  return groups.slice(0, n);
}
