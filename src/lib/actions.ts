import type { IsoDate } from './dates.ts';
import type { Measure, Persona } from './schema.ts';
import { deriveStatus } from './status.ts';

export interface ActionItem {
  measureId: string;
  measureTitle: string;
  text: string;
  deadline?: IsoDate;
  personas: Persona[];
  priority: number;
}

export interface ActionSplit {
  /** Actions on measures Parliament has passed. */
  actNow: ActionItem[];
  /** Actions on proposals: prepare and monitor, don't act on them as if they were law. */
  prepare: ActionItem[];
}

function byDeadlineThenPriority(a: ActionItem, b: ActionItem): number {
  const da = a.deadline ?? '9999-12-31';
  const db = b.deadline ?? '9999-12-31';
  return da.localeCompare(db) || a.priority - b.priority;
}

export function splitActions(measures: Measure[], today: IsoDate, persona?: Persona): ActionSplit {
  const split: ActionSplit = { actNow: [], prepare: [] };
  for (const m of measures) {
    const status = deriveStatus(m, today);
    if (status.tone === 'dead') continue;
    for (const a of m.actions) {
      const personas = a.personas ?? m.personas;
      if (persona && !personas.includes(persona)) continue;
      const item: ActionItem = {
        measureId: m.id,
        measureTitle: m.shortTitle,
        text: a.text,
        deadline: a.deadline,
        personas,
        priority: m.priority,
      };
      (status.isLaw ? split.actNow : split.prepare).push(item);
    }
  }
  split.actNow.sort(byDeadlineThenPriority);
  split.prepare.sort(byDeadlineThenPriority);
  return split;
}
