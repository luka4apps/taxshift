// Renders a CGT comparison as HTML. Shared by the build (initial result) and the browser (on submit),
// so the calculator works as static HTML first and JS only re-renders.
import type { CgtResult } from '../lib/cgt.ts';

const aud = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderCgtResult(r: CgtResult): string {
  if (!r.ok) return `<p class="calc-error" role="alert">${esc(r.error)}</p>`;
  const { old, next, difference } = r;
  const more = difference > 0;
  const diffText = difference === 0 ? 'No change in tax' : `${aud(Math.abs(difference))} ${more ? 'more' : 'less'} tax`;
  const rows: [string, string][] = [
    ['Taxable gain', aud(next.taxableGain)],
    ...(next.valueAt2027 !== undefined
      ? ([[`Value at 1 July 2027${next.valueEstimated ? ' (estimated)' : ''}`, aud(next.valueAt2027)]] as [string, string][])
      : []),
    ...(next.preTaxable > 0 ? ([['Pre-July 2027 gain after 50% discount', aud(next.preTaxable)]] as [string, string][]) : []),
    ['Indexed cost base', aud(next.indexedCostBase)],
    ['Post-July 2027 gain (indexed)', aud(next.postGain)],
    ['Income tax on the gain', aud(next.incomeTax)],
    ['30% minimum tax top-up', aud(next.topUp)],
  ];
  return `
  <div class="calc-cols">
    <div class="calc-col"><p class="kicker">Old rules: 50% discount</p><p class="display calc-big">${aud(old.tax)}</p><p class="mono">on a taxable gain of ${aud(old.taxableGain)}</p></div>
    <div class="calc-col is-new"><p class="kicker">New rules</p><p class="display calc-big">${aud(next.tax)}</p><p class="mono">on a taxable gain of ${aud(next.taxableGain)}</p></div>
  </div>
  <p class="calc-diff display ${more ? 'is-more' : ''}">${diffText}</p>
  <table class="calc-table"><caption class="kicker">How the new-rules number is built</caption><tbody>
    ${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="mono">${v}</td></tr>`).join('')}
  </tbody></table>
  <ul class="calc-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
}
