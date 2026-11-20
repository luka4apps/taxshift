import { daysBetween, formatDate, type IsoDate } from './dates.ts';
import { STAGES, type Measure, type Stage } from './schema.ts';

export type Tone = 'in-force' | 'law-pending' | 'proposed' | 'dead';

export interface DisplayStatus {
  tone: Tone;
  /** Rubber-stamp word on the pill. */
  stamp: string;
  /** One-line plain-English status. */
  label: string;
  /** True once Parliament has passed it; drives "act now" vs "prepare". */
  isLaw: boolean;
}

const stageRank = (s: Stage) => STAGES.indexOf(s);

/** Latest stage by date; on a same-day tie the later lifecycle stage wins. */
export function currentStage(measure: Pick<Measure, 'history'>): Stage {
  const latest = [...measure.history].sort(
    (a, b) => a.date.localeCompare(b.date) || stageRank(a.stage) - stageRank(b.stage),
  ).at(-1);
  if (!latest) throw new Error('Measure has no history');
  return latest.stage;
}

const PROPOSED_LABELS: Partial<Record<Stage, string>> = {
  announced: 'Announced, not yet law',
  draft: 'Draft law out for consultation',
  'bill-introduced': 'Bill before Parliament',
  'passed-house': 'Passed House, now in Senate',
  'passed-senate': 'Passed Senate, now in House',
};

const DEAD_STAMPS: Partial<Record<Stage, string>> = {
  withdrawn: 'Dropped',
  lapsed: 'Lapsed',
  repealed: 'Repealed',
};

export function deriveStatus(measure: Pick<Measure, 'history' | 'effectiveDate'>, today: IsoDate): DisplayStatus {
  const stage = currentStage(measure);

  const dead = DEAD_STAMPS[stage];
  if (dead) return { tone: 'dead', stamp: dead, label: `${dead}, no longer proceeding`, isLaw: false };

  const proposed = PROPOSED_LABELS[stage];
  if (proposed) return { tone: 'proposed', stamp: 'Proposed', label: proposed, isLaw: false };

  if (stage === 'passed-parliament') {
    return { tone: 'law-pending', stamp: 'Passed', label: 'Passed Parliament, awaiting royal assent', isLaw: true };
  }

  // royal-assent
  const { effectiveDate } = measure;
  if (effectiveDate && daysBetween(today, effectiveDate) > 0) {
    return { tone: 'law-pending', stamp: 'Law', label: `Law, starts ${formatDate(effectiveDate)}`, isLaw: true };
  }
  const since = effectiveDate ? `In force since ${formatDate(effectiveDate)}` : 'In force';
  return { tone: 'in-force', stamp: 'In force', label: since, isLaw: true };
}

export interface StartLine {
  prefix: 'Starts' | 'In force since' | 'Would start' | 'Was to start';
  date: IsoDate;
  countdown: boolean;
}

/** The "when does it bite?" line on a pill. */
export function startLine(measure: Pick<Measure, 'history' | 'effectiveDate'>, today: IsoDate): StartLine | null {
  const date = measure.effectiveDate;
  if (!date) return null;
  const { tone } = deriveStatus(measure, today);
  const future = daysBetween(today, date) > 0;
  if (tone === 'dead') return { prefix: 'Was to start', date, countdown: false };
  if (tone === 'proposed') return { prefix: 'Would start', date, countdown: future };
  if (tone === 'in-force' || !future) return { prefix: 'In force since', date, countdown: false };
  return { prefix: 'Starts', date, countdown: true };
}
