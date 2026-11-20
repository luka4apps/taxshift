import { describe, expect, it } from 'vitest';
import { statusTrack } from '../../src/lib/track.ts';
import { aMeasure } from './fixtures.ts';

const URL = 'https://www.aph.gov.au/x';
const TODAY = '2026-11-20';

describe('statusTrack', () => {
  it('should_mark_steps_done_up_to_the_current_stage_and_show_the_future_start', () => {
    // Given an assented law that starts next year, with some steps not recorded
    const m = aMeasure({
      effectiveDate: '2027-07-01',
      history: [
        { date: '2026-05-12', stage: 'announced', sourceUrl: URL },
        { date: '2026-06-25', stage: 'passed-parliament', sourceUrl: URL },
        { date: '2026-06-26', stage: 'royal-assent', sourceUrl: URL },
      ],
    });
    // When
    const steps = statusTrack(m, TODAY);
    // Then
    expect(steps.map((s) => `${s.label}:${s.state}:${s.date ?? ''}`)).toEqual([
      'Announced:done:2026-05-12',
      'Bill introduced:done:',
      'Passed one house:done:',
      'Passed Parliament:done:2026-06-25',
      'Royal assent:current:2026-06-26',
      'In force:todo:2027-07-01',
    ]);
  });

  it('should_show_a_bill_in_the_senate_as_current_at_passed_one_house', () => {
    const m = aMeasure({
      history: [
        { date: '2026-10-14', stage: 'bill-introduced', sourceUrl: URL },
        { date: '2026-10-29', stage: 'passed-house', sourceUrl: URL },
      ],
    });
    const steps = statusTrack(m, TODAY);
    expect(steps.find((s) => s.state === 'current')?.label).toBe('Passed one house');
    expect(steps.at(-1)?.state).toBe('todo');
  });

  it('should_mark_in_force_as_current_once_started', () => {
    const m = aMeasure({ effectiveDate: '2026-08-10', history: [{ date: '2026-06-26', stage: 'royal-assent', sourceUrl: URL }] });
    expect(statusTrack(m, TODAY).at(-1)).toEqual({ label: 'In force', state: 'current', date: '2026-08-10' });
  });

  it('should_end_with_the_dead_stage_when_withdrawn', () => {
    const m = aMeasure({
      history: [
        { date: '2026-05-12', stage: 'announced', sourceUrl: URL },
        { date: '2026-09-01', stage: 'withdrawn', sourceUrl: URL },
      ],
    });
    const steps = statusTrack(m, TODAY);
    expect(steps.at(-1)).toEqual({ label: 'Withdrawn', state: 'current', date: '2026-09-01' });
    expect(steps.map((s) => s.label)).not.toContain('In force');
  });
});
