/**
 * CGT old-vs-new estimator (FR12). General information only.
 *
 * Implements Treasury Laws Amendment (Tax Reform No. 1) Act 2026 for one asset sold by one
 * Australian-resident individual, with simplifications listed in `notes`:
 *  - assets held at 30 June 2027 are split: growth to 1 July 2027 keeps the 50% discount,
 *    growth after it uses indexation (s 112-155, s 112-160);
 *  - indexation is projected with an assumed inflation rate, as Treasury's own examples do
 *    (the real factor uses quarterly CPI, s 960-275);
 *  - 30% minimum tax top-up on post-2027 gains (Div 119, Rates Act s 12AA);
 *  - resident income tax rates from 2027-28, excluding Medicare levy and offsets.
 * Verified against the Budget explainer and Explanatory Memorandum worked examples (tests/unit/cgt.test.ts).
 */
import { daysBetween, type IsoDate } from './dates.ts';

export const NEW_RULES_START: IsoDate = '2027-07-01';
const PRE_CGT_CUTOFF: IsoDate = '1985-09-20';
const MINIMUM_RATE = 0.3;

const BANDS = [
  { from: 18_200, to: 45_000, rate: 0.14 },
  { from: 45_000, to: 135_000, rate: 0.3 },
  { from: 135_000, to: 190_000, rate: 0.37 },
  { from: 190_000, to: Infinity, rate: 0.45 },
];

/** Resident income tax from 2027-28 (no Medicare levy, no offsets). */
export function taxOn(income: number): number {
  const x = Math.max(0, income);
  const tax = BANDS.reduce((sum, b) => (x > b.from ? sum + (Math.min(x, b.to) - b.from) * b.rate : sum), 0);
  return Math.round(tax * 100) / 100;
}

/** Div 119 top-up: 30% of the minimum-tax gain less the income tax already payable on it, rounded down. */
export function minimumTaxTopUp(a: { otherTaxable: number; minimumTaxGain: number; alsoTaxable?: number }): number {
  const base = a.otherTaxable + (a.alsoTaxable ?? 0);
  const marginal = taxOn(base + a.minimumTaxGain) - taxOn(base);
  return Math.max(0, Math.floor(MINIMUM_RATE * a.minimumTaxGain - marginal));
}

/**
 * DRAFT Ministerial apportioning method (not law yet): constant compound growth from cost to proceeds,
 * applied over the days before 1 July 2027.
 */
export function apportionValue(a: { cost: number; proceeds: number; purchaseDate: IsoDate; saleDate: IsoDate }): number {
  const preDays = daysBetween(a.purchaseDate, '2027-06-30');
  const totalDays = daysBetween(a.purchaseDate, a.saleDate);
  return a.cost * (a.proceeds / a.cost) ** (preDays / totalDays);
}

function monthsBetween(from: IsoDate, to: IsoDate): number {
  const [y1, m1, d1] = from.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = to.split('-').map(Number) as [number, number, number];
  return (y2 - y1) * 12 + (m2 - m1) + (d2 - d1) / 30.4375;
}

/** CGT 12-month rule: the sale must be after the first anniversary of purchase. */
function heldTwelveMonths(purchase: IsoDate, sale: IsoDate): boolean {
  const anniversary = `${Number(purchase.slice(0, 4)) + 1}${purchase.slice(4)}`;
  return daysBetween(anniversary, sale) > 0;
}

export interface CgtInput {
  purchaseDate: IsoDate;
  /** Purchase price plus costs such as stamp duty and capital improvements. */
  costBase: number;
  saleDate: IsoDate;
  salePrice: number;
  /** Market value just before 1 July 2027, if known. */
  valueAt2027?: number;
  /** Taxable income from everything else in the year of sale. */
  otherIncome: number;
  /** Assumed yearly inflation for indexation, e.g. 0.025. */
  inflation: number;
  incomeSupport?: boolean;
  /** A qualifying new residential dwelling keeping the 50% discount (the default choice). */
  newDwelling?: boolean;
}

export interface OldRules {
  taxableGain: number;
  tax: number;
}

export interface NewRules {
  valueAt2027?: number;
  valueEstimated: boolean;
  /** Growth up to 1 July 2027 (negative = loss). */
  preGain: number;
  /** Pre-2027 gain after losses and the 50% discount. */
  preTaxable: number;
  indexedCostBase: number;
  /** Post-2027 gain after losses: the amount the 30% minimum applies to. */
  postGain: number;
  taxableGain: number;
  incomeTax: number;
  topUp: number;
  tax: number;
}

export type CgtResult =
  | { ok: true; old: OldRules; next: NewRules; difference: number; notes: string[] }
  | { ok: false; error: string };

const money = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

function validate(i: CgtInput): string | null {
  const nums = [i.costBase, i.salePrice, i.otherIncome, i.inflation, i.valueAt2027 ?? 0];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return 'Enter amounts of zero or more.';
  if (i.costBase <= 0) return 'Enter what the asset cost you.';
  if (i.inflation > 0.2) return 'Enter an inflation rate of 20% or less.';
  if (daysBetween(i.purchaseDate, i.saleDate) <= 0) return 'The sale date must be after the purchase date.';
  if (daysBetween(NEW_RULES_START, i.saleDate) < 0) return 'Choose a sale date on or after 1 July 2027: earlier sales use the old rules.';
  return null;
}

function oldRules(i: CgtInput, held12: boolean, preCgt: boolean): OldRules {
  const gross = Math.max(0, i.salePrice - i.costBase);
  const taxableGain = preCgt ? 0 : held12 ? gross * 0.5 : gross;
  return { taxableGain, tax: Math.round(taxOn(i.otherIncome + taxableGain) - taxOn(i.otherIncome)) };
}

export function compareCgt(i: CgtInput): CgtResult {
  const error = validate(i);
  if (error) return { ok: false, error };

  const held12 = heldTwelveMonths(i.purchaseDate, i.saleDate);
  const preCgt = daysBetween(i.purchaseDate, PRE_CGT_CUTOFF) > 0;
  const old = oldRules(i, held12, preCgt);
  const notes: string[] = [];
  const heldAt2027 = daysBetween(i.purchaseDate, NEW_RULES_START) > 0;

  let next: NewRules;
  if (i.newDwelling) {
    const taxableGain = Math.max(0, i.salePrice - i.costBase) * (held12 ? 0.5 : 1);
    const incomeTax = taxOn(i.otherIncome + taxableGain) - taxOn(i.otherIncome);
    next = { valueEstimated: false, preGain: 0, preTaxable: 0, indexedCostBase: i.costBase, postGain: 0, taxableGain, incomeTax, topUp: 0, tax: Math.round(incomeTax) };
    notes.push('New build: assumes you keep the 50% discount, which also keeps you out of the 30% minimum tax. You can choose indexation instead.');
  } else {
    const valueEstimated = heldAt2027 && i.valueAt2027 === undefined;
    const v27 = heldAt2027 ? (i.valueAt2027 ?? apportionValue({ cost: i.costBase, proceeds: i.salePrice, purchaseDate: i.purchaseDate, saleDate: i.saleDate })) : undefined;
    const pre = v27 === undefined || preCgt ? 0 : v27 - i.costBase;
    const basis = v27 ?? i.costBase;
    const years = monthsBetween(heldAt2027 ? NEW_RULES_START : i.purchaseDate, i.saleDate) / 12;
    const indexedCostBase = basis * (held12 ? (1 + i.inflation) ** years : 1);

    // Losses are applied to deferred (pre-2027) gains first, then post-2027 gains (s 102-5).
    const post = Math.max(0, i.salePrice - indexedCostBase);
    const loss = Math.max(0, -pre) + Math.max(0, basis - i.salePrice);
    const preAfter = Math.max(0, Math.max(0, pre) - loss);
    const lossLeft = Math.max(0, loss - Math.max(0, pre));
    const postGain = Math.max(0, post - lossLeft);
    const carried = Math.max(0, lossLeft - post);

    const preTaxable = preAfter * (held12 ? 0.5 : 1);
    const taxableGain = preTaxable + postGain;
    const incomeTax = taxOn(i.otherIncome + taxableGain) - taxOn(i.otherIncome);
    const topUp = i.incomeSupport ? 0 : minimumTaxTopUp({ otherTaxable: i.otherIncome, alsoTaxable: preTaxable, minimumTaxGain: postGain });
    next = { valueAt2027: v27, valueEstimated, preGain: pre, preTaxable, indexedCostBase, postGain, taxableGain, incomeTax, topUp, tax: Math.round(incomeTax + topUp) };

    if (valueEstimated) notes.push('Value at 1 July 2027 estimated with the draft apportioning method (steady growth from purchase to sale). That method is not law yet; the default is a market valuation.');
    if (preCgt) notes.push('Bought before 20 September 1985: exempt under the old rules, but growth after 1 July 2027 is now taxed.');
    if (topUp > 0) notes.push(`Includes a ${money(topUp)} minimum tax top-up so post-2027 gains are taxed at 30% or more.`);
    if (i.incomeSupport) notes.push('People who receive income support during the year are exempt from the 30% minimum tax.');
    if (carried > 0) notes.push(`Unused capital loss of ${money(carried)} would carry forward.`);
  }

  if (!held12) notes.push('Held for 12 months or less: no discount or indexation under either set of rules.');
  notes.push(`Indexation projected at ${(i.inflation * 100).toFixed(1)}% a year; the real factor uses quarterly CPI.`);
  notes.push('Uses 2027-28 resident tax rates for both columns. Excludes the Medicare levy, tax offsets and any other gains or losses.');

  return { ok: true, old, next, difference: next.tax - old.tax, notes };
}
