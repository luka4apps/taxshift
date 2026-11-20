/**
 * Publishing gate (ADR-10, ADR-11): decide whether a data change is minor
 * (auto-publish) or material (needs the owner's approval).
 * Fail-closed: only an explicit allowlist is minor; everything else is material.
 */

export interface Snapshot {
  /** Measures keyed by id (one file each). */
  measures: Record<string, unknown>;
  parties: unknown;
  election: unknown;
  glossary: unknown;
  changelog: unknown;
  meta: unknown;
}

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface Change {
  path: string[];
  kind: ChangeKind;
}

export interface Verdict {
  material: Change[];
  minor: Change[];
  isMaterial: boolean;
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Pick a stable identity for array elements so reordering is not a change. */
function keyFn(items: unknown[]): ((x: Obj) => string) | null {
  if (!items.length || !items.every(isObj)) return null;
  const objs = items as Obj[];
  const all = (pred: (o: Obj) => boolean) => objs.every(pred);
  for (const k of ['id', 'slug', 'party', 'url']) {
    if (all((o) => typeof o[k] === 'string')) return (o) => o[k] as string;
  }
  if (all((o) => typeof o.date === 'string' && typeof o.stage === 'string')) return (o) => `${o.date}|${o.stage}`;
  if (all((o) => typeof o.date === 'string' && typeof o.summary === 'string')) return (o) => `${o.date}|${o.summary}`;
  if (all((o) => typeof o.text === 'string')) return (o) => o.text as string;
  return null;
}

function toMap(items: Obj[], key: (x: Obj) => string): Map<string, Obj> | null {
  const map = new Map<string, Obj>();
  for (const it of items) {
    const k = key(it);
    if (map.has(k)) return null; // duplicate identities: fall back to positional comparison
    map.set(k, it);
  }
  return map;
}

function diffMaps(a: Map<string, unknown>, b: Map<string, unknown>, path: string[]): Change[] {
  const out: Change[] = [];
  for (const [k, v] of a) {
    if (!b.has(k)) out.push({ path: [...path, k], kind: 'removed' });
    else out.push(...diff(v, b.get(k), [...path, k]));
  }
  for (const k of b.keys()) if (!a.has(k)) out.push({ path: [...path, k], kind: 'added' });
  return out;
}

export function diff(before: unknown, after: unknown, path: string[] = []): Change[] {
  if (Array.isArray(before) && Array.isArray(after)) {
    const key = keyFn([...before, ...after]);
    const ma = key && toMap(before as Obj[], key);
    const mb = key && toMap(after as Obj[], key);
    if (ma && mb) return diffMaps(ma, mb, path);
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ path, kind: 'changed' }];
  }
  if (isObj(before) && isObj(after)) {
    return diffMaps(new Map(Object.entries(before)), new Map(Object.entries(after)), path);
  }
  return Object.is(before, after) ? [] : [{ path, kind: 'changed' }];
}

interface MinorRule {
  pattern: string[];
  kinds: ChangeKind[];
}

/** The ONLY changes that may publish without review. */
export const MINOR_RULES: readonly MinorRule[] = [
  { pattern: ['meta', '**'], kinds: ['added', 'removed', 'changed'] },
  { pattern: ['measures', '*', 'lastVerified'], kinds: ['changed'] },
  { pattern: ['measures', '*', 'sources', '*'], kinds: ['added'] },
  { pattern: ['measures', '*', 'sources', '*', 'accessed'], kinds: ['changed'] },
  { pattern: ['changelog', '*'], kinds: ['added'] },
];

function matches(pattern: string[], path: string[]): boolean {
  const [head, ...rest] = pattern;
  if (head === undefined) return path.length === 0;
  if (head === '**') return true;
  if (path.length === 0) return false;
  return (head === '*' || head === path[0]) && matches(rest, path.slice(1));
}

export function isMinor(change: Change): boolean {
  return MINOR_RULES.some((r) => r.kinds.includes(change.kind) && matches(r.pattern, change.path));
}

export function classify(before: Snapshot, after: Snapshot): Verdict {
  const changes = diff(before, after);
  const minor = changes.filter(isMinor);
  const material = changes.filter((c) => !isMinor(c));
  return { material, minor, isMaterial: material.length > 0 };
}
