import { compareCgt, type CgtInput } from '../lib/cgt.ts';
import { renderCgtResult } from './cgt-view.ts';

function readInput(form: HTMLFormElement): CgtInput {
  const f = new FormData(form);
  const num = (k: string) => Number(String(f.get(k) ?? '').replace(/[$,\s]/g, ''));
  const value = String(f.get('valueAt2027') ?? '').trim();
  return {
    purchaseDate: String(f.get('purchaseDate')),
    costBase: num('costBase'),
    saleDate: String(f.get('saleDate')),
    salePrice: num('salePrice'),
    valueAt2027: value ? num('valueAt2027') : undefined,
    otherIncome: num('otherIncome'),
    inflation: num('inflation') / 100,
    incomeSupport: f.get('incomeSupport') === 'on',
    newDwelling: f.get('newDwelling') === 'on',
  };
}

export function mountCalculator(form: HTMLFormElement, out: HTMLElement): void {
  const run = () => {
    if (!form.reportValidity()) return;
    out.innerHTML = renderCgtResult(compareCgt(readInput(form)));
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
    out.focus();
  });
  form.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((b) =>
    b.addEventListener('click', () => {
      const ex = JSON.parse(b.dataset.example ?? '{}') as Record<string, string | boolean>;
      for (const [k, v] of Object.entries(ex)) {
        const el = form.elements.namedItem(k) as HTMLInputElement | null;
        if (!el) continue;
        if (el.type === 'checkbox') el.checked = Boolean(v);
        else el.value = String(v);
      }
      run();
    }),
  );
}
