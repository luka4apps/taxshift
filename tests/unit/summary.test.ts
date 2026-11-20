import { describe, expect, it } from 'vitest';
import { startLine } from '../../src/lib/status.ts';
import { summarise } from '../../src/lib/summary.ts';
import { aMeasure, aSite } from './fixtures.ts';

const URL = 'https://www.aph.gov.au/x';
const TODAY = '2026-11-20';

const law = aMeasure({ id: 'law', effectiveDate: '2027-07-01', history: [{ date: '2026-06-26', stage: 'royal-assent', sourceUrl: URL }] });
const inForce = aMeasure({ id: 'in-force', effectiveDate: '2026-08-10', history: [{ date: '2026-06-26', stage: 'royal-assent', sourceUrl: URL }] });
const proposal = aMeasure({ id: 'proposal', effectiveDate: '2028-07-01', history: [{ date: '2026-10-29', stage: 'passed-house', sourceUrl: URL }] });

describe('startLine', () => {
  it('should_say_starts_with_a_countdown_for_law_not_yet_in_effect', () => {
    expect(startLine(law, TODAY)).toEqual({ prefix: 'Starts', date: '2027-07-01', countdown: true });
  });

  it('should_say_in_force_since_without_countdown_once_started', () => {
    expect(startLine(inForce, TODAY)).toEqual({ prefix: 'In force since', date: '2026-08-10', countdown: false });
  });

  it('should_say_would_start_for_a_proposal', () => {
    expect(startLine(proposal, TODAY)).toEqual({ prefix: 'Would start', date: '2028-07-01', countdown: true });
  });

  it('should_return_null_when_there_is_no_start_date', () => {
    expect(startLine(aMeasure({ effectiveDate: undefined }), TODAY)).toBeNull();
  });
});

describe('summarise', () => {
  it('should_count_laws_proposals_and_repeal_pledges_and_find_the_next_start', () => {
    // Given one law, one in force, one proposal; the proposal has a repeal pledge
    const p = { ...proposal, positions: [{ party: 'coalition', stance: 'pledges-repeal' as const, summary: 'Will repeal this one.', sourceUrl: URL }] };
    const site = aSite({ measures: [law, inForce, p] });
    // When
    const s = summarise(site.measures, site.parties, site.election, TODAY);
    // Then
    expect(s).toEqual({
      total: 3,
      law: 2,
      proposed: 1,
      repealPledged: 1,
      nextStart: { date: '2027-07-01', measureId: 'law', title: law.shortTitle },
    });
  });
});
