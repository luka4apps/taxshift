// Data contract: the committed data must always load cleanly. This is the gate that stops a bad
// research-agent edit from reaching the site.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSiteData } from '../../src/lib/load.ts';
import { deriveStatus } from '../../src/lib/status.ts';
import { todayInSydney } from '../../src/lib/dates.ts';

const DATA_DIR = path.resolve('src/data');

describe('committed data', () => {
  it('should_pass_schema_and_business_rules', () => {
    expect(() => loadSiteData(DATA_DIR)).not.toThrow();
  });

  it('should_contain_no_provisional_placeholders', () => {
    const files = [
      ...fs.readdirSync(path.join(DATA_DIR, 'measures')).map((f) => path.join(DATA_DIR, 'measures', f)),
      ...fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).map((f) => path.join(DATA_DIR, f)),
    ];
    const offenders = files.filter((f) => /PROVISIONAL|TODO|TBC|lorem/i.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('should_never_present_a_proposal_with_the_word_law_in_its_short_title', () => {
    const data = loadSiteData(DATA_DIR);
    const today = todayInSydney();
    const bad = data.measures.filter((m) => !deriveStatus(m, today).isLaw && /\blaw\b/i.test(m.shortTitle));
    expect(bad.map((m) => m.id)).toEqual([]);
  });
});
