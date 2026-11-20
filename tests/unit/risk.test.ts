import { describe, expect, it } from 'vitest';
import { flipRisk } from '../../src/lib/risk.ts';
import { aMeasure, aSite } from './fixtures.ts';

const SRC = 'https://www.abc.net.au/news/x';
const { parties, election } = aSite();

describe('flipRisk', () => {
  it('should_headline_a_repeal_pledge_with_the_election_as_the_default_trigger', () => {
    // Given the opposition pledges repeal without a stated trigger
    const m = aMeasure({
      positions: [
        { party: 'labor', stance: 'introduced', summary: 'Introduced in Budget 2026-27.', sourceUrl: SRC },
        { party: 'coalition', stance: 'pledges-repeal', summary: 'Will repeal the CGT changes.', sourceUrl: SRC },
      ],
    });
    // When
    const risk = flipRisk(m, parties, election);
    // Then
    expect(risk.level).toBe('repeal-pledged');
    expect(risk.headline).toBe('Coalition pledges repeal');
    expect(risk.trigger).toBe('If it wins the next federal election (due by 30 Sep 2028)');
  });

  it('should_prefer_the_trigger_stated_in_the_position', () => {
    const m = aMeasure({
      positions: [{ party: 'coalition', stance: 'pledges-repeal', summary: 'Will repeal in first budget.', trigger: 'In its first budget after winning government', sourceUrl: SRC }],
    });
    expect(flipRisk(m, parties, election).trigger).toBe('In its first budget after winning government');
  });

  it('should_join_several_repealing_parties_in_the_headline', () => {
    const extra = [...parties, { ...parties[1]!, id: 'one-nation', shortName: 'One Nation', name: 'Pauline Hanson’s One Nation', role: 'crossbench' as const }];
    const m = aMeasure({
      positions: [
        { party: 'coalition', stance: 'pledges-repeal', summary: 'Will repeal the changes.', sourceUrl: SRC },
        { party: 'one-nation', stance: 'pledges-repeal', summary: 'Would scrap the changes.', sourceUrl: SRC },
      ],
    });
    expect(flipRisk(m, extra, election).headline).toBe('Coalition and One Nation pledge repeal');
  });

  it('should_report_could_tighten_when_only_a_crossbench_party_wants_it_stronger', () => {
    const m = aMeasure({
      positions: [{ party: 'greens', stance: 'wants-stronger', summary: 'Wants grandfathering removed.', sourceUrl: SRC }],
    });
    const risk = flipRisk(m, parties, election);
    expect(risk.level).toBe('could-tighten');
    expect(risk.headline).toBe('Greens want it to go further');
  });

  it('should_report_contested_when_opposed_but_no_repeal_pledged', () => {
    const m = aMeasure({ positions: [{ party: 'coalition', stance: 'opposes', summary: 'Voted against the bill.', sourceUrl: SRC }] });
    const risk = flipRisk(m, parties, election);
    expect(risk.level).toBe('contested');
    expect(risk.headline).toBe('Opposed by Coalition, no repeal pledge yet');
  });

  it('should_report_settled_when_no_party_wants_change', () => {
    const risk = flipRisk(aMeasure({ positions: [] }), parties, election);
    expect(risk.level).toBe('settled');
    expect(risk.headline).toBe('No party has pledged to change it');
  });

  it('should_list_positions_government_first_then_opposition_then_crossbench', () => {
    const m = aMeasure({
      positions: [
        { party: 'greens', stance: 'wants-stronger', summary: 'Wants grandfathering removed.', sourceUrl: SRC },
        { party: 'coalition', stance: 'pledges-repeal', summary: 'Will repeal the changes.', sourceUrl: SRC },
        { party: 'labor', stance: 'introduced', summary: 'Introduced in the Budget.', sourceUrl: SRC },
      ],
    });
    const lines = flipRisk(m, parties, election).lines;
    expect(lines.map((l) => l.party.id)).toEqual(['labor', 'coalition', 'greens']);
    expect(lines.map((l) => l.direction)).toEqual(['keep', 'reverse', 'tighten']);
  });
});
