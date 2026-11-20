// Browser wiring for whole-dollar fields (inputs marked data-dollars). The rules live in src/lib/dollars.ts.
import { deleteAcrossSeparator, reformatDollarField, type FieldEdit } from '../lib/dollars.ts';

const NO_CENTS = 'Whole dollars only: cents are left off.';

function apply(input: HTMLInputElement, edit: FieldEdit): void {
  input.value = edit.value;
  // Moving the caret of an unfocused field can steal focus in some browsers.
  if (document.activeElement === input) input.setSelectionRange(edit.caret, edit.caret);
}

/** Says why the cents vanished, in the browser's own validation bubble. Cleared on the next key press or blur. */
function explainNoCents(input: HTMLInputElement): void {
  input.setCustomValidity(NO_CENTS);
  input.reportValidity();
}

/** Puts a value into a dollar field from code (e.g. the example buttons), formatted like typed input. */
export function setDollarField(input: HTMLInputElement, text: string): void {
  input.value = reformatDollarField(text, text.length).value;
}

export function mountDollarField(input: HTMLInputElement): void {
  const clearNote = () => input.setCustomValidity('');
  input.addEventListener('keydown', clearNote);
  input.addEventListener('blur', clearNote);

  input.addEventListener('beforeinput', (e) => {
    // Typing only ever adds digits: a "." or letter is refused rather than cutting the amount short.
    if (e.inputType === 'insertText' && e.data !== null && /\D/.test(e.data)) {
      e.preventDefault();
      if (e.data.includes('.')) explainNoCents(input);
      return;
    }
    const backward = e.inputType === 'deleteContentBackward';
    if (!backward && e.inputType !== 'deleteContentForward') return;
    const { selectionStart: start, selectionEnd: end } = input;
    if (start === null || start !== end) return;
    const edit = deleteAcrossSeparator(input.value, start, backward ? 'backward' : 'forward');
    if (!edit) return;
    e.preventDefault();
    apply(input, edit);
  });

  // Paste, drop, autofill and anything else: reformat, dropping any cents.
  input.addEventListener('input', () => {
    const hadCents = input.value.includes('.');
    apply(input, reformatDollarField(input.value, input.selectionStart ?? input.value.length));
    if (hadCents) explainNoCents(input);
  });
}
