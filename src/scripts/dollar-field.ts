// Browser wiring for whole-dollar fields (inputs marked data-dollars). The rules live in src/lib/dollars.ts.
import { deleteAcrossSeparator, pasteDollars, reformatDollarField, type FieldEdit } from '../lib/dollars.ts';

const NO_CENTS = 'Whole dollars only: cents are left off.';

function apply(input: HTMLInputElement, edit: FieldEdit): void {
  // Assigning the value from script clears the browser's undo history, so only do it when the text changes.
  if (input.value !== edit.value) input.value = edit.value;
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

function onBeforeInput(input: HTMLInputElement, e: InputEvent): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;

  switch (e.inputType) {
    case 'insertText':
      // Typing only ever adds digits: a "." or letter is refused rather than cutting the amount short.
      if (e.data !== null && /\D/.test(e.data)) {
        e.preventDefault();
        if (e.data.includes('.')) explainNoCents(input);
      }
      return;
    case 'insertFromPaste': {
      const pasted = e.dataTransfer?.getData('text/plain');
      if (pasted === undefined) return; // no clipboard text: the input handler reformats instead
      e.preventDefault();
      apply(input, pasteDollars(input.value, start, end, pasted));
      if (pasted.includes('.')) explainNoCents(input);
      return;
    }
    case 'insertFromDrop':
      e.preventDefault(); // the drop point isn't the selection, so dropped text can't be placed reliably
      return;
    case 'deleteContentBackward':
    case 'deleteContentForward': {
      if (start !== end) return;
      const edit = deleteAcrossSeparator(input.value, start, e.inputType === 'deleteContentBackward' ? 'backward' : 'forward');
      if (!edit) return;
      e.preventDefault();
      apply(input, edit);
    }
  }
}

export function mountDollarField(input: HTMLInputElement): void {
  const clearNote = () => input.setCustomValidity('');
  input.addEventListener('keydown', clearNote);
  input.addEventListener('blur', clearNote);
  input.addEventListener('beforeinput', (e) => onBeforeInput(input, e));

  // Anything else (autofill, word deletes, mobile keyboards): reformat, dropping any cents.
  input.addEventListener('input', () => {
    const hadCents = input.value.includes('.');
    apply(input, reformatDollarField(input.value, input.selectionStart ?? input.value.length));
    if (hadCents) explainNoCents(input);
  });
}
