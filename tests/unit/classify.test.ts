import { describe, expect, it } from 'vitest';
import { classify, diff, type Snapshot } from '../../src/lib/classify.ts';
import { aMeasure } from './fixtures.ts';

function snap(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    measures: { 'cgt-indexation': aMeasure() },
    parties: [],
    election: { latestPossible: '2028-09-30' },
    glossary: [],
    changelog: [],
    meta: { lastChecked: '2026-11-19T05:30:00+11:00', dataVersion: 1 },
    ...overrides,
  };
}

const newSource = { url: 'https://www.ato.gov.au/new', title: 'New ATO page', publisher: 'ATO', tier: 1, accessed: '2026-11-20' };

describe('diff', () => {
  it('should_ignore_reordering_of_keyed_arrays', () => {
    // Given the same sources in a different order
    const a = [{ url: 'https://a.gov.au', t: 1 }, { url: 'https://b.gov.au', t: 2 }];
    const b = [a[1], a[0]];
    // When / Then
    expect(diff(a, b)).toEqual([]);
  });

  it('should_report_added_removed_and_changed_paths', () => {
    const changes = diff({ x: 1, y: 2 }, { x: 3, z: 4 });
    expect(changes).toEqual(
      expect.arrayContaining([
        { path: ['x'], kind: 'changed' },
        { path: ['y'], kind: 'removed' },
        { path: ['z'], kind: 'added' },
      ]),
    );
  });
});

describe('classify', () => {
  it('should_treat_a_routine_daily_check_as_minor', () => {
    // Given only freshness stamps, a new source and a changelog line changed
    const before = snap();
    const m = aMeasure({ lastVerified: '2026-11-21', sources: [...aMeasure().sources, newSource as never] });
    const after = snap({
      measures: { 'cgt-indexation': m },
      meta: { lastChecked: '2026-11-21T05:30:00+11:00', dataVersion: 1 },
      changelog: [{ date: '2026-11-21', measureId: null, kind: 'minor', summary: 'Daily check, no changes.' }],
    });
    // When
    const verdict = classify(before, after);
    // Then
    expect(verdict.isMaterial).toBe(false);
    expect(verdict.minor.length).toBeGreaterThan(0);
  });

  it('should_flag_a_stage_change_as_material', () => {
    const m = aMeasure({
      history: [...aMeasure().history, { date: '2026-11-20', stage: 'royal-assent', sourceUrl: 'https://www.legislation.gov.au/x' }],
    });
    const verdict = classify(snap(), snap({ measures: { 'cgt-indexation': m } }));
    expect(verdict.isMaterial).toBe(true);
    expect(verdict.material[0]?.path.slice(0, 3)).toEqual(['measures', 'cgt-indexation', 'history']);
  });

  it('should_flag_date_rate_and_position_changes_as_material', () => {
    const m = aMeasure({ effectiveDate: '2028-07-01', bigStat: { value: '25%', caption: 'minimum tax on capital gains' } });
    const verdict = classify(snap(), snap({ measures: { 'cgt-indexation': m } }));
    const paths = verdict.material.map((c) => c.path.join('.'));
    expect(paths).toContain('measures.cgt-indexation.effectiveDate');
    expect(paths).toContain('measures.cgt-indexation.bigStat.value');
  });

  it('should_fail_closed_on_unknown_or_new_fields', () => {
    const verdict = classify(snap(), snap({ meta: { lastChecked: 'x', dataVersion: 1 }, glossary: [{ slug: 'new-term' }] }));
    expect(verdict.material.map((c) => c.path.join('.'))).toEqual(['glossary.new-term']);
  });

  it('should_flag_a_new_measure_and_a_removed_source_as_material', () => {
    const m = aMeasure({ sources: [newSource as never] });
    const verdict = classify(snap(), snap({ measures: { 'cgt-indexation': m, 'new-measure': aMeasure({ id: 'new-measure' }) } }));
    const paths = verdict.material.map((c) => `${c.kind}:${c.path.join('.')}`);
    expect(paths).toContain('added:measures.new-measure');
    expect(paths).toContain('removed:measures.cgt-indexation.sources.https://www.ato.gov.au/example');
  });
});
