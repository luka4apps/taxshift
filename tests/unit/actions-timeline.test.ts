import { describe, expect, it } from 'vitest';
import { splitActions } from '../../src/lib/actions.ts';
import { buildTimeline, keyDates, upcoming } from '../../src/lib/timeline.ts';
import { aMeasure, anElection } from './fixtures.ts';

const URL = 'https://www.aph.gov.au/x';
const TODAY = '2026-11-20';

const law = aMeasure({
  id: 'law',
  shortTitle: 'CGT discount ends',
  priority: 1,
  personas: ['property', 'shares'],
  effectiveDate: '2027-07-01',
  history: [
    { date: '2026-05-12', stage: 'announced', sourceUrl: URL },
    { date: '2026-06-25', stage: 'passed-parliament', sourceUrl: URL },
  ],
  actions: [
    { text: 'Get a valuation before 1 July 2027.', deadline: '2027-06-30' },
    { text: 'Keep purchase records for indexation.', personas: ['shares'] },
  ],
});

const proposal = aMeasure({
  id: 'proposal',
  shortTitle: 'Trust minimum tax',
  priority: 2,
  personas: ['business'],
  effectiveDate: '2028-07-01',
  history: [{ date: '2026-10-29', stage: 'passed-house', sourceUrl: URL }],
  actions: [{ text: 'Review your trust distributions with an adviser.' }],
});

const dead = aMeasure({ id: 'dead', priority: 3, history: [{ date: '2026-09-01', stage: 'withdrawn', sourceUrl: URL }], actions: [{ text: 'Nothing to do for this one.' }] });

describe('splitActions', () => {
  it('should_put_law_actions_in_act_now_and_proposal_actions_in_prepare', () => {
    // Given one law, one proposal and one dropped measure
    // When
    const { actNow, prepare } = splitActions([proposal, law, dead], TODAY);
    // Then
    expect(actNow.map((a) => a.text)).toEqual(['Get a valuation before 1 July 2027.', 'Keep purchase records for indexation.']);
    expect(prepare.map((a) => a.measureId)).toEqual(['proposal']);
  });

  it('should_filter_actions_by_persona_using_the_action_override_or_measure_personas', () => {
    const { actNow } = splitActions([law, proposal], TODAY, 'property');
    expect(actNow.map((a) => a.text)).toEqual(['Get a valuation before 1 July 2027.']);
  });
});

describe('buildTimeline', () => {
  const items = buildTimeline([law, proposal], anElection(), TODAY);

  it('should_order_all_key_dates_chronologically', () => {
    const dates = items.map((i) => i.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('should_include_effective_dates_stage_events_and_the_election_window', () => {
    expect(items).toContainEqual(expect.objectContaining({ date: '2027-07-01', kind: 'effective', label: 'CGT discount ends: starts', measureId: 'law' }));
    expect(items).toContainEqual(expect.objectContaining({ date: '2026-10-29', kind: 'stage', label: 'Trust minimum tax: passed House' }));
    expect(items).toContainEqual(expect.objectContaining({ date: '2028-09-30', kind: 'election', label: 'Latest possible federal election' }));
  });

  it('should_mark_items_before_today_as_past', () => {
    expect(items.find((i) => i.date === '2026-05-12')?.isPast).toBe(true);
    expect(items.find((i) => i.date === '2027-07-01')?.isPast).toBe(false);
  });

  it('should_group_key_start_and_election_dates_by_day_for_the_dashboard', () => {
    // Given two measures starting on different days plus the election window
    const groups = keyDates(items, TODAY, 3);
    // Then deadlines and past stage events are excluded and each date appears once
    expect(groups.map((g) => g.date)).toEqual(['2027-07-01', '2027-08-07', '2028-07-01']);
    expect(groups[0]?.items.map((i) => i.label)).toEqual(['CGT discount ends: starts']);
  });

  it('should_return_the_next_n_upcoming_items_from_today', () => {
    const next = upcoming(items, TODAY, 2);
    expect(next.map((i) => i.date)).toEqual(['2027-06-30', '2027-07-01']);
  });
});
