import type { IsoDate } from './dates.ts';
import type { Measure, Stage } from './schema.ts';
import { currentStage, deriveStatus } from './status.ts';

export interface TrackStep {
  label: string;
  state: 'done' | 'current' | 'todo';
  date?: IsoDate;
}

const STEPS: { label: string; stages: Stage[] }[] = [
  { label: 'Announced', stages: ['announced', 'draft'] },
  { label: 'Bill introduced', stages: ['bill-introduced'] },
  { label: 'Passed one house', stages: ['passed-house', 'passed-senate'] },
  { label: 'Passed Parliament', stages: ['passed-parliament'] },
  { label: 'Royal assent', stages: ['royal-assent'] },
];

const DEAD: Partial<Record<Stage, string>> = { withdrawn: 'Withdrawn', lapsed: 'Lapsed', repealed: 'Repealed' };

function firstDate(m: Measure, stages: Stage[]): IsoDate | undefined {
  return m.history
    .filter((e) => stages.includes(e.stage))
    .map((e) => e.date)
    .sort()[0];
}

/** Legislative progress for the detail-page stepper. Unrecorded earlier steps count as done. */
export function statusTrack(m: Measure, today: IsoDate): TrackStep[] {
  const stage = currentStage(m);
  const dead = DEAD[stage];
  const reached = dead
    ? Math.max(-1, ...m.history.map((e) => STEPS.findIndex((s) => s.stages.includes(e.stage))))
    : STEPS.findIndex((s) => s.stages.includes(stage));
  const tone = deriveStatus(m, today).tone;
  const inForce = tone === 'in-force';

  const steps: TrackStep[] = STEPS.map((s, i) => ({
    label: s.label,
    date: firstDate(m, s.stages),
    state: i < reached || (i === reached && (inForce || dead !== undefined)) ? 'done' : i === reached ? 'current' : 'todo',
  }));

  if (dead) {
    const done = steps.slice(0, reached + 1);
    return [...done, { label: dead, state: 'current', date: firstDate(m, [stage]) }];
  }
  return [...steps, { label: 'In force', state: inForce ? 'current' : 'todo', date: m.effectiveDate }];
}
