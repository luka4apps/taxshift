import { z } from 'zod';

/**
 * Data contract for everything under src/data.
 * Objects are .strict(): unknown keys fail validation, so a typo by the
 * research agent is caught instead of silently ignored (fail-closed).
 */

const isoDate = z.iso.date();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase-kebab slug');
const text = (min = 3) => z.string().trim().min(min);

export const PERSONA_IDS = ['property', 'shares', 'smsf', 'business'] as const;
export const Persona = z.enum(PERSONA_IDS);

/** Legislative lifecycle. "in-effect" is derived from royal-assent + effectiveDate, never stored. */
export const STAGES = [
  'announced',
  'draft',
  'bill-introduced',
  'passed-house',
  'passed-senate',
  'passed-parliament',
  'royal-assent',
  'withdrawn',
  'lapsed',
  'repealed',
] as const;
export const Stage = z.enum(STAGES);

export const STANCES = [
  'introduced',
  'supports',
  'opposes',
  'pledges-repeal',
  'wants-stronger',
  'wants-amendment',
  'no-position',
] as const;
export const Stance = z.enum(STANCES);

export const Source = z
  .object({
    url: z.url(),
    title: text(),
    publisher: text(2),
    /** 1 = official (legislation, APH, ATO, Treasury); 2 = party/minister; 3 = reputable media/professional body */
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    accessed: isoDate,
  })
  .strict();

export const StageEvent = z
  .object({
    date: isoDate,
    stage: Stage,
    note: text().optional(),
    sourceUrl: z.url(),
  })
  .strict();

export const Position = z
  .object({
    party: slug,
    stance: Stance,
    summary: text(10),
    /** What would have to happen for this party to act, e.g. "If it wins the next federal election". */
    trigger: text().optional(),
    statedOn: isoDate.optional(),
    sourceUrl: z.url().optional(),
  })
  .strict()
  .refine((p) => p.stance === 'no-position' || p.sourceUrl !== undefined, {
    message: 'a stated position needs a sourceUrl',
    path: ['sourceUrl'],
  });

export const Action = z
  .object({
    text: text(10),
    personas: z.array(Persona).min(1).optional(),
    deadline: isoDate.optional(),
  })
  .strict();

export const WorkedExample = z
  .object({
    title: text(),
    steps: z.array(text()).min(1),
    result: text(),
    sourceUrl: z.url().optional(),
  })
  .strict();

export const JURISDICTIONS = ['federal', 'nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt'] as const;

export const Measure = z
  .object({
    id: slug,
    title: text(),
    shortTitle: text().max(40),
    headline: text(10).max(180),
    summary: text(20),
    category: z.enum(['cgt', 'negative-gearing', 'super', 'trusts', 'business', 'other']),
    jurisdiction: z.enum(JURISDICTIONS),
    personas: z.array(Persona).min(1),
    /** 1 = most important; drives ordering on the dashboard. */
    priority: z.number().int().min(1).max(100),
    announcedOn: isoDate,
    effectiveDate: isoDate.optional(),
    /** Human wording when the start is not a single day, e.g. "Income years from 1 July 2028". */
    effectiveLabel: text().optional(),
    history: z.array(StageEvent).min(1),
    bigStat: z.object({ value: text(1).max(12), caption: text().max(70) }).strict(),
    shift: z.object({ from: text(2).max(48), to: text(2).max(48) }).strict(),
    before: z.array(text()).min(1),
    after: z.array(text()).min(1),
    exemptions: z.array(text()),
    workedExample: WorkedExample.optional(),
    actions: z.array(Action),
    positions: z.array(Position),
    sources: z.array(Source).min(1),
    /** Known unknowns and source conflicts, shown to readers. */
    caveats: z.array(text()),
    lastVerified: isoDate,
  })
  .strict();

export const Party = z
  .object({
    id: slug,
    name: text(),
    shortName: text(2).max(20),
    role: z.enum(['government', 'opposition', 'crossbench']),
    leader: text(),
    treasurySpokesperson: text().optional(),
    website: z.url().optional(),
  })
  .strict();

export const Election = z
  .object({
    lastHeld: isoDate,
    earliestLikely: isoDate,
    latestPossible: isoDate,
    announcedDate: isoDate.nullable(),
    note: text(10),
    sources: z.array(Source).min(1),
  })
  .strict();

export const GlossaryEntry = z
  .object({
    slug,
    term: text(2),
    definition: text(20),
    related: z.array(slug),
  })
  .strict();

export const ChangeLogEntry = z
  .object({
    date: isoDate,
    measureId: slug.nullable(),
    kind: z.enum(['material', 'minor']),
    summary: text(10),
    sourceUrl: z.url().optional(),
  })
  .strict();

export const Meta = z
  .object({
    lastChecked: z.iso.datetime({ offset: true }),
    runId: text().optional(),
    dataVersion: z.number().int().min(1),
  })
  .strict();

export type Persona = z.infer<typeof Persona>;
export type Stage = z.infer<typeof Stage>;
export type Stance = z.infer<typeof Stance>;
export type Source = z.infer<typeof Source>;
export type StageEvent = z.infer<typeof StageEvent>;
export type Position = z.infer<typeof Position>;
export type Action = z.infer<typeof Action>;
export type Measure = z.infer<typeof Measure>;
export type Party = z.infer<typeof Party>;
export type Election = z.infer<typeof Election>;
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;
export type ChangeLogEntry = z.infer<typeof ChangeLogEntry>;
export type Meta = z.infer<typeof Meta>;

export interface SiteData {
  measures: Measure[];
  parties: Party[];
  election: Election;
  glossary: GlossaryEntry[];
  changelog: ChangeLogEntry[];
  meta: Meta;
}
