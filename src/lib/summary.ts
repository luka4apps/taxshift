import { daysBetween, type IsoDate } from './dates.ts';
import { flipRisk } from './risk.ts';
import type { Election, Measure, Party } from './schema.ts';
import { deriveStatus } from './status.ts';

export interface Summary {
  total: number;
  law: number;
  proposed: number;
  repealPledged: number;
  nextStart: { date: IsoDate; measureId: string; title: string } | null;
}

/** Headline numbers for the top of the dashboard. */
export function summarise(measures: Measure[], parties: Party[], election: Election, today: IsoDate): Summary {
  const live = measures.filter((m) => deriveStatus(m, today).tone !== 'dead');
  const next = live
    .filter((m) => m.effectiveDate && daysBetween(today, m.effectiveDate) > 0)
    .sort((a, b) => a.effectiveDate!.localeCompare(b.effectiveDate!) || a.priority - b.priority)[0];
  return {
    total: live.length,
    law: live.filter((m) => deriveStatus(m, today).isLaw).length,
    proposed: live.filter((m) => !deriveStatus(m, today).isLaw).length,
    repealPledged: live.filter((m) => flipRisk(m, parties, election).level === 'repeal-pledged').length,
    nextStart: next ? { date: next.effectiveDate!, measureId: next.id, title: next.shortTitle } : null,
  };
}
