// Publishing gate CLI (ADR-10). Compares src/data at a base git ref with the working tree
// and decides whether the change is minor (auto-merge) or material (owner review).
//
//   node scripts/classify-pr.ts --base origin/main [--summary classification.md]
//
// Writes `material=true|false` to $GITHUB_OUTPUT when running in GitHub Actions.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { classify, type Change, type Snapshot } from '../src/lib/classify.ts';
import { readDataDir, type RawFiles } from '../src/lib/load.ts';

const DATA = 'src/data';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

function readAtRef(ref: string): RawFiles | null {
  let files: string[];
  try {
    files = git('ls-tree', '-r', '--name-only', ref, `${DATA}/`).split('\n').filter(Boolean);
  } catch {
    return null;
  }
  if (!files.length) return null;
  const json = (p: string) => JSON.parse(git('show', `${ref}:${p}`));
  const measures = Object.fromEntries(
    files
      .filter((f) => f.startsWith(`${DATA}/measures/`) && f.endsWith('.json'))
      .map((f) => [f.slice(`${DATA}/measures/`.length, -'.json'.length), json(f)]),
  );
  const top = (name: string) => (files.includes(`${DATA}/${name}`) ? json(`${DATA}/${name}`) : null);
  return {
    measures,
    parties: top('parties.json'),
    election: top('election.json'),
    glossary: top('glossary.json'),
    changelog: top('changelog.json'),
    meta: top('meta.json'),
  };
}

const toSnapshot = (r: RawFiles): Snapshot => ({ ...r });
const line = (c: Change) => `- \`${c.kind}\` ${c.path.join(' › ')}`;

const base = arg('base') ?? 'origin/main';
const before = readAtRef(base);
const after = readDataDir();
const dataVerdict = before
  ? classify(toSnapshot(before), toSnapshot(after))
  : { material: [{ path: ['(no data at base)'], kind: 'added' as const }], minor: [], isMaterial: true };

// Fail-closed: any change outside src/data (code, workflows, prompt) always needs a human.
const nonData: Change[] = git('diff', '--name-only', `${base}...HEAD`)
  .split('\n')
  .filter((f) => f && !f.startsWith(`${DATA}/`))
  .map((f) => ({ path: ['file', f], kind: 'changed' }));
const material = [...dataVerdict.material, ...nonData];
const verdict = { material, minor: dataVerdict.minor, isMaterial: material.length > 0 };

const summary = [
  verdict.isMaterial ? '### Material changes: owner review required' : '### Minor changes only: safe to auto-publish',
  '',
  ...(verdict.material.length ? ['**Material**', ...verdict.material.map(line), ''] : []),
  ...(verdict.minor.length ? ['**Minor**', ...verdict.minor.map(line)] : []),
].join('\n');

console.log(summary);
const summaryFile = arg('summary');
if (summaryFile) fs.writeFileSync(summaryFile, summary + '\n');
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `material=${verdict.isMaterial}\n`);
