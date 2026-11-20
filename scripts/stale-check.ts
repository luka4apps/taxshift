// Daily freshness alarm (ADR-13). Prints the verdict and writes `stale=true|false` to $GITHUB_OUTPUT.
import fs from 'node:fs';
import { daysSince, isStale } from '../src/lib/dates.ts';
import { readDataDir } from '../src/lib/load.ts';
import { Meta } from '../src/lib/schema.ts';

const meta = Meta.parse(readDataDir().meta);
const stale = isStale(meta.lastChecked);
console.log(`Last checked ${meta.lastChecked} (${daysSince(meta.lastChecked)} days ago): ${stale ? 'STALE' : 'fresh'}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `stale=${stale}\n`);
