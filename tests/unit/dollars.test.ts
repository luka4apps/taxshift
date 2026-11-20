import { describe, expect, it } from 'vitest';
import { deleteAcrossSeparator, formatWholeDollars, parseWholeDollars, reformatDollarField } from '../../src/lib/dollars.ts';

// Dollar fields in the calculator show Australian dollars as the reader types ("$1,131,371").
// Whole dollars only: cents are dropped, never folded into the dollar amount.

describe('parseWholeDollars', () => {
  it.each([
    ['$1,131,371', 1_131_371],
    ['800000', 800_000],
    [' $ 1 000 ', 1_000],
    ['$0', 0],
  ])('should_read_%j_as_%i', (text, amount) => {
    expect(parseWholeDollars(text)).toBe(amount);
  });

  it('should_drop_cents_rather_than_turn_them_into_dollars', () => {
    // Given an amount pasted with cents
    // When / Then: 1,234.56 is $1,234, not $123,456
    expect(parseWholeDollars('1,234.56')).toBe(1_234);
  });

  it.each(['', '   ', '$', '.50'])('should_return_null_for_a_field_with_no_dollars_%j', (text) => {
    expect(parseWholeDollars(text)).toBeNull();
  });
});

describe('formatWholeDollars', () => {
  it.each([
    [0, '$0'],
    [999, '$999'],
    [1_000, '$1,000'],
    [1_131_371, '$1,131,371'],
    [12_345_678_901, '$12,345,678,901'],
  ])('should_format_%i_as_%s', (amount, text) => {
    expect(formatWholeDollars(amount)).toBe(text);
  });

  it.each([12.5, -1, Number.NaN, Number.POSITIVE_INFINITY])('should_refuse_%d_because_it_is_not_a_whole_dollar_amount', (amount) => {
    expect(() => formatWholeDollars(amount)).toThrow(RangeError);
  });
});

describe('reformatDollarField', () => {
  it('should_add_the_dollar_sign_and_commas_to_plain_digits', () => {
    // Given the reader typed 800000 with the caret at the end
    const edit = reformatDollarField('800000', 6);
    // Then the field shows $800,000 and the caret stays at the end
    expect(edit).toEqual({ value: '$800,000', caret: 8 });
  });

  it('should_regroup_when_a_digit_is_added_at_the_end', () => {
    // Given $999 and the reader types another 9
    const edit = reformatDollarField('$9999', 5);
    // Then the comma appears and the caret stays after the last digit
    expect(edit).toEqual({ value: '$9,999', caret: 6 });
  });

  it('should_keep_the_caret_after_the_digit_just_typed_in_the_middle', () => {
    // Given $100,000 and the reader types 5 straight after the $
    const edit = reformatDollarField('$5100,000', 2);
    // Then the amount regroups and the caret sits after the 5
    expect(edit).toEqual({ value: '$5,100,000', caret: 2 });
  });

  it('should_drop_pasted_cents_and_put_the_caret_after_the_dollars', () => {
    expect(reformatDollarField('1,234.56', 8)).toEqual({ value: '$1,234', caret: 6 });
  });

  it('should_ignore_characters_that_are_not_digits', () => {
    expect(reformatDollarField('$1a2', 4)).toEqual({ value: '$12', caret: 3 });
  });

  it('should_remove_leading_zeros_but_keep_a_single_zero', () => {
    expect(reformatDollarField('$05', 3)).toEqual({ value: '$5', caret: 2 });
    expect(reformatDollarField('$00', 3)).toEqual({ value: '$0', caret: 2 });
  });

  it('should_empty_the_field_when_no_digits_remain', () => {
    // Given the reader deleted the last digit, leaving only the $
    expect(reformatDollarField('$', 1)).toEqual({ value: '', caret: 0 });
  });
});

describe('deleteAcrossSeparator', () => {
  it('should_delete_the_digit_before_a_comma_on_backspace', () => {
    // Given $12,345 with the caret just after the comma
    const edit = deleteAcrossSeparator('$12,345', 4, 'backward');
    // Then backspace removes the 2 rather than the comma
    expect(edit).toEqual({ value: '$1,345', caret: 2 });
  });

  it('should_delete_the_digit_after_a_comma_on_forward_delete', () => {
    // Given $12,345 with the caret just before the comma
    const edit = deleteAcrossSeparator('$12,345', 3, 'forward');
    // Then delete removes the 3 and the caret stays after the 2
    expect(edit).toEqual({ value: '$1,245', caret: 4 });
  });

  it('should_leave_an_ordinary_digit_delete_to_the_browser', () => {
    expect(deleteAcrossSeparator('$12,345', 2, 'backward')).toBeNull();
    expect(deleteAcrossSeparator('$12,345', 5, 'forward')).toBeNull();
  });

  it('should_not_delete_the_dollar_sign', () => {
    // Given the caret just after the $
    // When the reader presses backspace
    // Then nothing changes
    expect(deleteAcrossSeparator('$12', 1, 'backward')).toEqual({ value: '$12', caret: 1 });
  });

  it('should_do_nothing_at_either_end_of_an_empty_field', () => {
    expect(deleteAcrossSeparator('', 0, 'backward')).toBeNull();
    expect(deleteAcrossSeparator('', 0, 'forward')).toBeNull();
  });
});
