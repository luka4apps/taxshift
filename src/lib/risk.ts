import { formatDate } from './dates.ts';
import type { Election, Measure, Party, Position, Stance } from './schema.ts';

/** Which way a party would move the measure. Neutral vocabulary, no party colours (ADR-17). */
export type Direction = 'keep' | 'reverse' | 'tighten' | 'amend' | 'unknown';
export type RiskLevel = 'repeal-pledged' | 'contested' | 'could-tighten' | 'settled';

export interface FlipLine {
  party: Party;
  position: Position;
  direction: Direction;
}

export interface FlipSummary {
  level: RiskLevel;
  headline: string;
  /** What would have to happen for the measure to change. */
  trigger?: string;
  lines: FlipLine[];
}

const DIRECTION: Record<Stance, Direction> = {
  introduced: 'keep',
  supports: 'keep',
  opposes: 'reverse',
  'pledges-repeal': 'reverse',
  'wants-stronger': 'tighten',
  'wants-amendment': 'amend',
  'no-position': 'unknown',
};

export const STANCE_LABEL: Record<Stance, string> = {
  introduced: 'Introduced it',
  supports: 'Supports',
  opposes: 'Opposes',
  'pledges-repeal': 'Will repeal',
  'wants-stronger': 'Wants it tougher',
  'wants-amendment': 'Wants changes',
  'no-position': 'No stated position',
};

const ROLE_ORDER: Record<Party['role'], number> = { government: 0, opposition: 1, crossbench: 2 };

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

export function electionTrigger(election: Election): string {
  return election.announcedDate
    ? `If it wins the federal election on ${formatDate(election.announcedDate)}`
    : `If it wins the next federal election (due by ${formatDate(election.latestPossible)})`;
}

function linesFor(measure: Measure, parties: Party[]): FlipLine[] {
  const rank = (p: Party) => ROLE_ORDER[p.role] * 1000 + parties.indexOf(p);
  return measure.positions
    .map((position) => ({ position, party: parties.find((p) => p.id === position.party) }))
    .filter((x): x is { position: Position; party: Party } => x.party !== undefined)
    .map(({ position, party }) => ({ party, position, direction: DIRECTION[position.stance] }))
    .sort((a, b) => rank(a.party) - rank(b.party));
}

export function flipRisk(measure: Measure, parties: Party[], election: Election): FlipSummary {
  const lines = linesFor(measure, parties);
  const withStance = (s: Stance) => lines.filter((l) => l.position.stance === s);
  const names = (ls: FlipLine[]) => joinNames(ls.map((l) => l.party.shortName));

  const repeal = withStance('pledges-repeal');
  if (repeal.length) {
    const verb = repeal.length === 1 ? 'pledges' : 'pledge';
    return {
      level: 'repeal-pledged',
      headline: `${names(repeal)} ${verb} repeal`,
      trigger: repeal[0]!.position.trigger ?? electionTrigger(election),
      lines,
    };
  }

  const opposed = withStance('opposes');
  if (opposed.length) {
    return { level: 'contested', headline: `Opposed by ${names(opposed)}, no repeal pledge yet`, trigger: opposed[0]!.position.trigger, lines };
  }

  const tighten = withStance('wants-stronger');
  if (tighten.length) {
    return { level: 'could-tighten', headline: `${names(tighten)} want it to go further`, trigger: tighten[0]!.position.trigger, lines };
  }

  return { level: 'settled', headline: 'No party has pledged to change it', lines };
}
