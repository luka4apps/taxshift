import { compareCgt, type CgtInput } from '../lib/cgt.ts';
import { parseWholeDollars } from '../lib/dollars.ts';
import { renderCgtResult } from './cgt-view.ts';
import { mountDollarField, setDollarField } from './dollar-field.ts';

function readInput(form: HTMLFormElement): CgtInput {
  const f = new FormData(form);
  const text = (k: string) => String(f.get(k) ?? '');
  const dollars = (k: string) => parseWholeDollars(text(k));
  return {
    purchaseDate: text('purchaseDate'),
    costBase: dollars('costBase') ?? 0,
    saleDate: text('saleDate'),
    salePrice: dollars('salePrice') ?? 0,
    valueAt2027: dollars('valueAt2027') ?? undefined,
    otherIncome: dollars('otherIncome') ?? 0,
    inflation: Number(text('inflation')) / 100,
    incomeSupport: f.get('incomeSupport') === 'on',
    newDwelling: f.get('newDwelling') === 'on',
  };
}

function fillExample(form: HTMLFormElement, example: Record<string, string | number | boolean>): void {
  for (const [k, v] of Object.entries(example)) {
    const el = form.elements.namedItem(k) as HTMLInputElement | null;
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else if (el.dataset.dollars !== undefined) setDollarField(el, String(v));
    else el.value = String(v);
  }
}

export function mountCalculator(form: HTMLFormElement, out: HTMLElement): void {
  const run = () => {
    if (!form.reportValidity()) return;
    out.innerHTML = renderCgtResult(compareCgt(readInput(form)));
  };
  form.querySelectorAll<HTMLInputElement>('input[data-dollars]').forEach(mountDollarField);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
    out.focus();
  });
  form.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((b) =>
    b.addEventListener('click', () => {
      fillExample(form, JSON.parse(b.dataset.example ?? '{}') as Record<string, string | number | boolean>);
      run();
    }),
  );
}
