/**
 * Whole-dollar amount fields (FR12 calculator), shown as Australian dollars while the reader types: "$1,131,371".
 *
 * Cents are not allowed. A decimal part is dropped, never folded into the dollars, so a pasted
 * "1,234.56" reads as $1,234 rather than $123,456.
 */

/** A field's new text and where the caret goes in it. */
export interface FieldEdit {
  value: string;
  caret: number;
}

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const digitsOf = (text: string) => text.replace(/\D/g, '');
const dollarsPart = (text: string) => text.split('.')[0]!;
const withSeparators = (digits: string) => `$${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/** The whole-dollar amount in a field, or null when it holds no digits. */
export function parseWholeDollars(text: string): number | null {
  const digits = digitsOf(dollarsPart(text));
  return digits ? Number(digits) : null;
}

/** "$1,131,371". Throws for anything that is not a whole, non-negative dollar amount. */
export function formatWholeDollars(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError(`Not a whole-dollar amount: ${amount}`);
  return withSeparators(String(amount));
}

/** Index just after the n-th digit of a formatted value (just after the "$" when n is 0). */
function caretAfterDigit(value: string, n: number): number {
  if (n === 0) return Math.min(1, value.length);
  let seen = 0;
  for (let i = 0; i < value.length; i++) if (isDigit(value[i]) && ++seen === n) return i + 1;
  return value.length;
}

/**
 * Re-renders whatever is in the field as whole dollars, keeping the caret after the same digit
 * so typing in the middle of a number still works.
 */
export function reformatDollarField(raw: string, caret: number): FieldEdit {
  const dollars = dollarsPart(raw);
  const typed = digitsOf(dollars);
  const digits = typed.replace(/^0+(?=\d)/, '');
  if (!digits) return { value: '', caret: 0 };

  const digitsBeforeCaret = digitsOf(dollars.slice(0, caret)).length;
  const leadingZerosDropped = typed.length - digits.length;
  const value = withSeparators(digits);
  return { value, caret: caretAfterDigit(value, Math.max(0, digitsBeforeCaret - leadingZerosDropped)) };
}

/**
 * Pastes text over the selection [start, end). Only the pasted text loses its cents and other
 * characters; the field's own digits either side are kept.
 */
export function pasteDollars(value: string, start: number, end: number, pasted: string): FieldEdit {
  const inserted = digitsOf(dollarsPart(pasted));
  return reformatDollarField(value.slice(0, start) + inserted + value.slice(end), start + inserted.length);
}

/**
 * Backspace or Delete next to a "$" or "," would only remove a character that comes straight back.
 * Remove the nearest digit in that direction instead. Returns null when the neighbour is a digit
 * (the browser's own delete is right) or there is nothing to delete.
 */
export function deleteAcrossSeparator(value: string, caret: number, direction: 'backward' | 'forward'): FieldEdit | null {
  const backward = direction === 'backward';
  const neighbour = backward ? value[caret - 1] : value[caret];
  if (neighbour === undefined || isDigit(neighbour)) return null;

  const target = backward ? lastDigitBefore(value, caret) : firstDigitFrom(value, caret);
  if (target === -1) return { value, caret };
  return reformatDollarField(value.slice(0, target) + value.slice(target + 1), backward ? target : caret);
}

function lastDigitBefore(value: string, caret: number): number {
  for (let i = caret - 1; i >= 0; i--) if (isDigit(value[i])) return i;
  return -1;
}

function firstDigitFrom(value: string, caret: number): number {
  for (let i = caret; i < value.length; i++) if (isDigit(value[i])) return i;
  return -1;
}
