import { describe, expect, it } from 'vitest';
import { checkRules } from '../../src/lib/rules.ts';
import { DataError, parseSiteData, type RawFiles } from '../../src/lib/load.ts';
import { aMeasure, aSite } from './fixtures.ts';

const ABC = 'https://www.abc.net.au/news/x';

function messages(site = aSite()): string[] {
  return checkRules(site).map((v) => `${v.path}: ${v.message}`);
}

describe('checkRules', () => {
  it('should_pass_a_valid_site', () => {
    expect(messages()).toEqual([]);
  });

  it('should_reject_duplicate_measure_ids', () => {
    expect(messages(aSite({ measures: [aMeasure(), aMeasure()] }))).toContain('measures.cgt-indexation: duplicate measure id');
  });

  it('should_reject_positions_for_unknown_parties_and_duplicate_party_positions', () => {
    const m = aMeasure({
      positions: [
        { party: 'pirates', stance: 'supports', summary: 'Arr, we support it.', sourceUrl: ABC },
        { party: 'coalition', stance: 'opposes', summary: 'Opposes the change.', sourceUrl: ABC },
        { party: 'coalition', stance: 'pledges-repeal', summary: 'Will repeal it.', sourceUrl: ABC },
      ],
    });
    const msgs = messages(aSite({ measures: [m] }));
    expect(msgs).toContain('measures.cgt-indexation.positions.pirates: unknown party');
    expect(msgs).toContain('measures.cgt-indexation.positions.coalition: duplicate position for party');
  });

  it('should_require_at_least_one_official_source', () => {
    const m = aMeasure({
      sources: [{ url: ABC, title: 'ABC story', publisher: 'ABC', tier: 3, accessed: '2026-11-20' }],
      history: [{ date: '2026-05-12', stage: 'announced', sourceUrl: ABC }],
    });
    expect(messages(aSite({ measures: [m] }))).toContain('measures.cgt-indexation.sources: needs at least one tier-1 (official) source');
  });

  it('should_require_stage_events_to_cite_an_official_or_party_source_listed_on_the_measure', () => {
    const m = aMeasure({ history: [{ date: '2026-05-12', stage: 'announced', sourceUrl: ABC }] });
    expect(messages(aSite({ measures: [m] }))).toContain(
      'measures.cgt-indexation.history.2026-05-12: stage event must cite a tier-1 or tier-2 source listed in sources',
    );
  });

  it('should_reject_stage_events_dated_after_the_last_check', () => {
    const m = aMeasure({ history: [...aMeasure().history, { date: '2026-12-25', stage: 'royal-assent', sourceUrl: 'https://www.ato.gov.au/example' }] });
    expect(messages(aSite({ measures: [m] }))).toContain('measures.cgt-indexation.history.2026-12-25: event is in the future');
  });

  it('should_require_a_start_date_once_passed', () => {
    const m = aMeasure({ effectiveDate: undefined, effectiveLabel: undefined });
    expect(messages(aSite({ measures: [m] }))).toContain('measures.cgt-indexation.effectiveDate: passed measures need effectiveDate or effectiveLabel');
  });

  it('should_reject_changelog_entries_for_unknown_measures', () => {
    const site = aSite({ changelog: [{ date: '2026-11-20', measureId: 'ghost', kind: 'material', summary: 'Something changed here.' }] });
    expect(messages(site)).toContain('changelog.2026-11-20: unknown measure ghost');
  });

  it('should_reject_an_inverted_election_window', () => {
    const site = aSite();
    site.election = { ...site.election, earliestLikely: '2029-01-01' };
    expect(messages(site)).toContain('election: earliestLikely must not be after latestPossible');
  });
});

describe('parseSiteData', () => {
  function raw(overrides: Partial<RawFiles> = {}): RawFiles {
    const s = aSite();
    return {
      measures: { 'cgt-indexation': s.measures[0] },
      parties: s.parties,
      election: s.election,
      glossary: s.glossary,
      changelog: s.changelog,
      meta: s.meta,
      ...overrides,
    };
  }

  it('should_return_typed_site_data_for_valid_files', () => {
    const data = parseSiteData(raw());
    expect(data.measures[0]?.id).toBe('cgt-indexation');
  });

  it('should_collect_every_schema_issue_with_its_file_and_field', () => {
    // Given a measure with a typo'd key and a bad meta timestamp
    const bad = { ...aMeasure(), titel: 'typo' };
    // When
    const run = () => parseSiteData(raw({ measures: { 'cgt-indexation': bad }, meta: { lastChecked: 'yesterday', dataVersion: 1 } }));
    // Then
    expect(run).toThrow(DataError);
    try {
      run();
    } catch (e) {
      const issues = (e as DataError).issues.join('\n');
      expect(issues).toContain('measures/cgt-indexation.json');
      expect(issues).toContain('titel');
      expect(issues).toContain('meta.json: lastChecked');
    }
  });

  it('should_reject_a_measure_whose_file_name_differs_from_its_id', () => {
    expect(() => parseSiteData(raw({ measures: { 'wrong-name': aMeasure() } }))).toThrow(/wrong-name.json: id must match file name/);
  });
});
