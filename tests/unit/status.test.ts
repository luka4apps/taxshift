import { describe, expect, it } from 'vitest';
import { currentStage, deriveStatus } from '../../src/lib/status.ts';
import { aMeasure } from './fixtures.ts';

const URL = 'https://www.aph.gov.au/x';
const TODAY = '2026-11-20';

describe('currentStage', () => {
  it('should_use_the_latest_dated_event_even_when_history_is_unordered', () => {
    // Given history recorded out of order
    const m = aMeasure({
      history: [
        { date: '2026-10-29', stage: 'passed-house', sourceUrl: URL },
        { date: '2026-10-14', stage: 'bill-introduced', sourceUrl: URL },
      ],
    });
    // When / Then
    expect(currentStage(m)).toBe('passed-house');
  });
});

describe('deriveStatus', () => {
  it('should_show_law_with_start_date_when_assented_but_not_yet_in_effect', () => {
    // Given an assented law starting next year
    const m = aMeasure({
      effectiveDate: '2027-07-01',
      history: [{ date: '2026-07-01', stage: 'royal-assent', sourceUrl: URL }],
    });
    // When
    const s = deriveStatus(m, TODAY);
    // Then
    expect(s.tone).toBe('law-pending');
    expect(s.stamp).toBe('Law');
    expect(s.isLaw).toBe(true);
    expect(s.label).toBe('Law, starts 1 Jul 2027');
  });

  it('should_show_in_force_when_assented_and_effective_date_has_passed', () => {
    const m = aMeasure({
      effectiveDate: '2026-08-10',
      history: [{ date: '2026-07-01', stage: 'royal-assent', sourceUrl: URL }],
    });
    const s = deriveStatus(m, TODAY);
    expect(s.tone).toBe('in-force');
    expect(s.stamp).toBe('In force');
    expect(s.label).toBe('In force since 10 Aug 2026');
  });

  it('should_treat_passed_parliament_as_law_pending_assent', () => {
    const m = aMeasure({ history: [{ date: '2026-06-25', stage: 'passed-parliament', sourceUrl: URL }] });
    const s = deriveStatus(m, TODAY);
    expect(s.tone).toBe('law-pending');
    expect(s.stamp).toBe('Passed');
    expect(s.label).toBe('Passed Parliament, awaiting royal assent');
    expect(s.isLaw).toBe(true);
  });

  it('should_mark_a_bill_in_the_senate_as_proposed_not_law', () => {
    const m = aMeasure({ history: [{ date: '2026-10-29', stage: 'passed-house', sourceUrl: URL }] });
    const s = deriveStatus(m, TODAY);
    expect(s.tone).toBe('proposed');
    expect(s.stamp).toBe('Proposed');
    expect(s.label).toBe('Passed House, now in Senate');
    expect(s.isLaw).toBe(false);
  });

  it.each([
    ['announced', 'Announced, not yet law'],
    ['draft', 'Draft law out for consultation'],
    ['bill-introduced', 'Bill before Parliament'],
    ['passed-senate', 'Passed Senate, now in House'],
  ] as const)('should_label_%s_as_a_proposal', (stage, label) => {
    const s = deriveStatus(aMeasure({ history: [{ date: '2026-05-12', stage, sourceUrl: URL }] }), TODAY);
    expect(s.tone).toBe('proposed');
    expect(s.label).toBe(label);
  });

  it.each([
    ['withdrawn', 'Dropped'],
    ['lapsed', 'Lapsed'],
    ['repealed', 'Repealed'],
  ] as const)('should_mark_%s_measures_as_dead', (stage, stamp) => {
    const s = deriveStatus(aMeasure({ history: [{ date: '2026-09-01', stage, sourceUrl: URL }] }), TODAY);
    expect(s.tone).toBe('dead');
    expect(s.stamp).toBe(stamp);
    expect(s.isLaw).toBe(false);
  });

  it('should_treat_assented_law_without_effective_date_as_in_force', () => {
    const m = aMeasure({ effectiveDate: undefined, history: [{ date: '2026-03-20', stage: 'royal-assent', sourceUrl: URL }] });
    expect(deriveStatus(m, TODAY).tone).toBe('in-force');
  });
});
