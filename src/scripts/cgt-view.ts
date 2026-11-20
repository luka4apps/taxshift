// Renders a CGT comparison as HTML. Shared by the build (initial result) and the browser (on submit),
// so the calculator works as static HTML first and JS only re-renders.
//
// Presentation rule (owner review, 20 Nov 2026): always show the full capital gain first. Showing only the
// discounted "taxable gain" let readers apply the 50% discount twice in their heads.
import type { CgtResult } from '../lib/cgt.ts';

const aud = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-AU')}`;
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const DASH = '<span aria-label="not applicable">–</span>';

type Row = { label: string; old: string; next: string; strong?: boolean };

export function renderCgtResult(r: CgtResult): string {
  if (!r.ok) return `<p class="calc-error" role="alert">${esc(r.error)}</p>`;
  const { old, next, difference, capitalGain } = r;
  const more = difference > 0;
  const diffText = difference === 0 ? 'No change in tax' : `${aud(Math.abs(difference))} ${more ? 'more' : 'less'} tax`;
  const gainLabel = capitalGain >= 0 ? 'Capital gain (sale price − cost)' : 'Capital loss (sale price − cost)';

  const rows: Row[] = [
    { label: gainLabel, old: aud(capitalGain), next: aud(capitalGain), strong: true },
    ...(next.valueAt2027 !== undefined
      ? [
          { label: `Value at 1 July 2027${next.valueEstimated ? ' (estimated)' : ''}`, old: DASH, next: aud(next.valueAt2027) },
          { label: 'Growth to July 2027, after 50% discount', old: DASH, next: aud(next.preTaxable) },
        ]
      : []),
    ...(next.postGain > 0 || next.valueAt2027 !== undefined
      ? [
          { label: 'Cost base indexed for inflation', old: DASH, next: aud(next.indexedCostBase) },
          { label: 'Growth after July 2027, after indexation', old: DASH, next: aud(next.postGain) },
        ]
      : []),
    { label: 'Taxable gain (added to your income)', old: aud(old.taxableGain), next: aud(next.taxableGain), strong: true },
    { label: 'Income tax on it', old: aud(old.tax), next: aud(next.incomeTax) },
    { label: '30% minimum tax top-up', old: DASH, next: aud(next.topUp) },
    { label: 'Medicare levy (about 2%)', old: aud(old.medicare), next: aud(next.medicare) },
    { label: 'Total tax on this sale', old: aud(old.total), next: aud(next.total), strong: true },
    { label: 'Share of your capital gain', old: pct(old.effectiveRate), next: pct(next.effectiveRate) },
  ];

  return `
  <p class="kicker calc-gain">Your capital gain: <strong>${aud(capitalGain)}</strong></p>
  <div class="calc-cols">
    <div class="calc-col"><p class="kicker">Old rules: 50% discount</p><p class="display calc-big">${aud(old.total)}</p><p class="mono">${pct(old.effectiveRate)} of the gain</p></div>
    <div class="calc-col is-new"><p class="kicker">New rules</p><p class="display calc-big">${aud(next.total)}</p><p class="mono">${pct(next.effectiveRate)} of the gain</p></div>
  </div>
  <p class="calc-diff display ${more ? 'is-more' : ''}">${diffText}</p>
  <table class="calc-table">
    <caption class="kicker">The working</caption>
    <thead><tr><th scope="col"><span class="sr-only">Step</span></th><th scope="col" class="kicker">Old</th><th scope="col" class="kicker">New</th></tr></thead>
    <tbody>
      ${rows
        .map((row) => `<tr${row.strong ? ' class="is-strong"' : ''}><th scope="row">${esc(row.label)}</th><td class="mono">${row.old}</td><td class="mono">${row.next}</td></tr>`)
        .join('')}
    </tbody>
  </table>
  <ul class="calc-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
}
