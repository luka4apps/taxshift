import type { Election, Measure, Party, SiteData } from '../../src/lib/schema.ts';

const ATO = 'https://www.ato.gov.au/example';

/** Builder for a valid measure; override only what a test cares about. */
export function aMeasure(overrides: Partial<Measure> = {}): Measure {
  return {
    id: 'cgt-indexation',
    title: 'CGT discount replaced by indexation',
    shortTitle: 'CGT discount ends',
    headline: 'Gains after 1 July 2027 use indexation plus a 30% minimum tax instead of the 50% discount.',
    summary: 'The 50% CGT discount is replaced by cost-base indexation and a 30% minimum tax.',
    category: 'cgt',
    jurisdiction: 'federal',
    personas: ['property', 'shares'],
    priority: 1,
    announcedOn: '2026-05-12',
    effectiveDate: '2027-07-01',
    history: [
      { date: '2026-05-12', stage: 'announced', sourceUrl: ATO },
      { date: '2026-06-25', stage: 'passed-parliament', sourceUrl: ATO },
    ],
    bigStat: { value: '30%', caption: 'minimum tax on capital gains' },
    shift: { from: '50% discount', to: 'Indexation + 30% minimum' },
    before: ['50% of the gain is tax-free after 12 months.'],
    after: ['Cost base indexed to inflation; 30% minimum tax.'],
    exemptions: [],
    actions: [{ text: 'Consider getting a market valuation at 1 July 2027.' }],
    positions: [],
    sources: [{ url: ATO, title: 'ATO page', publisher: 'ATO', tier: 1, accessed: '2026-11-20' }],
    caveats: [],
    lastVerified: '2026-11-20',
    ...overrides,
  };
}

export function aParty(overrides: Partial<Party> = {}): Party {
  return {
    id: 'coalition',
    name: 'Liberal–National Coalition',
    shortName: 'Coalition',
    role: 'opposition',
    leader: 'Angus Taylor',
    treasurySpokesperson: 'Tim Wilson',
    website: 'https://www.liberal.org.au',
    ...overrides,
  };
}

export function anElection(overrides: Partial<Election> = {}): Election {
  return {
    lastHeld: '2025-05-03',
    earliestLikely: '2027-08-07',
    latestPossible: '2028-09-30',
    announcedDate: null,
    note: 'Next federal election must be held by the latest possible date.',
    sources: [{ url: 'https://www.aec.gov.au/x', title: 'AEC', publisher: 'AEC', tier: 1, accessed: '2026-11-20' }],
    ...overrides,
  };
}

export function aSite(overrides: Partial<SiteData> = {}): SiteData {
  return {
    measures: [aMeasure()],
    parties: [
      aParty({ id: 'labor', name: 'Australian Labor Party', shortName: 'Labor', role: 'government', leader: 'Anthony Albanese', website: 'https://www.alp.org.au' }),
      aParty(),
      aParty({ id: 'greens', name: 'Australian Greens', shortName: 'Greens', role: 'crossbench', leader: 'Larissa Waters', website: 'https://greens.org.au' }),
    ],
    election: anElection(),
    glossary: [],
    changelog: [],
    meta: { lastChecked: '2026-11-20T05:30:00+11:00', dataVersion: 1 },
    ...overrides,
  };
}
