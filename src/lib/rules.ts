import { daysBetween, todayInSydney } from './dates.ts';
import type { Measure, SiteData } from './schema.ts';
import { currentStage } from './status.ts';

/** Cross-file business rules the schema alone can't express. */
export interface Violation {
  path: string;
  message: string;
}

const PASSED_STAGES = new Set(['passed-parliament', 'royal-assent']);

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(values.filter((v) => seen.has(v) || !seen.add(v)))];
}

function measureRules(m: Measure, partyIds: Set<string>, asOf: string): Violation[] {
  const out: Violation[] = [];
  const at = (suffix: string, message: string) => out.push({ path: `measures.${m.id}${suffix}`, message });

  if (!m.sources.some((s) => s.tier === 1)) at('.sources', 'needs at least one tier-1 (official) source');

  const citable = new Set(m.sources.filter((s) => s.tier <= 2).map((s) => s.url));
  for (const e of m.history) {
    if (!citable.has(e.sourceUrl)) at(`.history.${e.date}`, 'stage event must cite a tier-1 or tier-2 source listed in sources');
    if (daysBetween(asOf, e.date) > 0) at(`.history.${e.date}`, 'event is in the future');
  }

  if (PASSED_STAGES.has(currentStage(m)) && !m.effectiveDate && !m.effectiveLabel) {
    at('.effectiveDate', 'passed measures need effectiveDate or effectiveLabel');
  }

  if (daysBetween(asOf, m.lastVerified) > 0) at('.lastVerified', 'is after the last check');

  for (const p of m.positions) {
    if (!partyIds.has(p.party)) at(`.positions.${p.party}`, 'unknown party');
  }
  for (const d of duplicates(m.positions.map((p) => p.party))) at(`.positions.${d}`, 'duplicate position for party');

  return out;
}

export function checkRules(data: SiteData): Violation[] {
  const out: Violation[] = [];
  const asOf = todayInSydney(new Date(data.meta.lastChecked));
  const partyIds = new Set(data.parties.map((p) => p.id));
  const measureIds = new Set(data.measures.map((m) => m.id));

  for (const d of duplicates(data.parties.map((p) => p.id))) out.push({ path: `parties.${d}`, message: 'duplicate party id' });
  for (const d of duplicates(data.measures.map((m) => m.id))) out.push({ path: `measures.${d}`, message: 'duplicate measure id' });

  for (const m of data.measures) out.push(...measureRules(m, partyIds, asOf));

  for (const c of data.changelog) {
    if (c.measureId && !measureIds.has(c.measureId)) out.push({ path: `changelog.${c.date}`, message: `unknown measure ${c.measureId}` });
    if (daysBetween(asOf, c.date) > 0) out.push({ path: `changelog.${c.date}`, message: 'entry is in the future' });
  }

  const slugs = data.glossary.map((g) => g.slug);
  for (const d of duplicates(slugs)) out.push({ path: `glossary.${d}`, message: 'duplicate glossary slug' });
  for (const g of data.glossary) {
    for (const r of g.related) if (!slugs.includes(r)) out.push({ path: `glossary.${g.slug}`, message: `unknown related term ${r}` });
  }

  const e = data.election;
  if (daysBetween(e.earliestLikely, e.latestPossible) < 0) out.push({ path: 'election', message: 'earliestLikely must not be after latestPossible' });
  if (daysBetween(e.lastHeld, e.earliestLikely) <= 0) out.push({ path: 'election', message: 'lastHeld must be before earliestLikely' });

  return out;
}
