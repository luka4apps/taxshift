import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import { checkRules } from './rules.ts';
import { ChangeLogEntry, Election, GlossaryEntry, Measure, Meta, Party, type SiteData } from './schema.ts';
import { z as zod } from 'zod';

/** Untyped file contents, as read from disk. Measures keyed by file name (without .json). */
export interface RawFiles {
  measures: Record<string, unknown>;
  parties: unknown;
  election: unknown;
  glossary: unknown;
  changelog: unknown;
  meta: unknown;
}

export class DataError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Data validation failed:\n  ${issues.join('\n  ')}`);
    this.name = 'DataError';
    this.issues = issues;
  }
}

export const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'src/data');

function check<T>(schema: z.ZodType<T>, value: unknown, file: string, issues: string[]): T | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  for (const i of result.error.issues) issues.push(`${file}: ${i.path.join('.') || '(root)'} ${i.message}`);
  return undefined;
}

/** Pure: validate raw file contents against the schema. Throws DataError listing every issue. */
export function parseSiteData(raw: RawFiles): SiteData {
  const issues: string[] = [];
  const measures = Object.entries(raw.measures).flatMap(([name, value]) => {
    const file = `measures/${name}.json`;
    const m = check(Measure, value, file, issues);
    if (m && m.id !== name) issues.push(`${file}: id must match file name`);
    return m ? [m] : [];
  });
  const parties = check(zod.array(Party), raw.parties, 'parties.json', issues);
  const election = check(Election, raw.election, 'election.json', issues);
  const glossary = check(zod.array(GlossaryEntry), raw.glossary, 'glossary.json', issues);
  const changelog = check(zod.array(ChangeLogEntry), raw.changelog, 'changelog.json', issues);
  const meta = check(Meta, raw.meta, 'meta.json', issues);

  if (issues.length || !parties || !election || !glossary || !changelog || !meta) throw new DataError(issues);
  return { measures: measures.sort((a, b) => a.priority - b.priority), parties, election, glossary, changelog, meta };
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new DataError([`${path.basename(file)}: ${(e as Error).message}`]);
  }
}

/** I/O: read every data file from a directory. */
export function readDataDir(dir: string = DEFAULT_DATA_DIR): RawFiles {
  const measureDir = path.join(dir, 'measures');
  const measures = Object.fromEntries(
    fs
      .readdirSync(measureDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace(/\.json$/, ''), readJson(path.join(measureDir, f))]),
  );
  const read = (name: string) => readJson(path.join(dir, name));
  return {
    measures,
    parties: read('parties.json'),
    election: read('election.json'),
    glossary: read('glossary.json'),
    changelog: read('changelog.json'),
    meta: read('meta.json'),
  };
}

/** Schema + business rules. The single entry point for pages, scripts and CI. */
export function loadSiteData(dir: string = DEFAULT_DATA_DIR): SiteData {
  const data = parseSiteData(readDataDir(dir));
  const violations = checkRules(data);
  if (violations.length) throw new DataError(violations.map((v) => `${v.path}: ${v.message}`));
  return data;
}
