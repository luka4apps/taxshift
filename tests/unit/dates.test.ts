import { describe, expect, it } from 'vitest';
import { countdownText, daysBetween, daysSince, formatDate, isStale, todayInSydney } from '../../src/lib/dates.ts';

describe('todayInSydney', () => {
  it('should_return_the_sydney_calendar_date_when_utc_is_still_the_previous_day', () => {
    // Given 01:30 on 20 Nov in Sydney (AEDT, UTC+11)
    const now = new Date('2026-11-19T14:30:00Z');
    // When
    const today = todayInSydney(now);
    // Then
    expect(today).toBe('2026-11-20');
  });

  it('should_use_standard_time_offset_in_winter', () => {
    // Given 09:59 on 1 Jul in Sydney (AEST, UTC+10)
    const now = new Date('2027-06-30T23:59:00Z');
    // When / Then
    expect(todayInSydney(now)).toBe('2027-07-01');
  });
});

describe('daysBetween', () => {
  it('should_count_calendar_days_across_a_daylight_saving_change', () => {
    // Given dates either side of the April DST change
    // When
    const days = daysBetween('2026-11-20', '2027-07-01');
    // Then
    expect(days).toBe(223);
  });

  it('should_return_a_negative_number_when_the_target_is_in_the_past', () => {
    expect(daysBetween('2026-11-20', '2026-08-10')).toBe(-102);
  });
});

describe('countdownText', () => {
  it.each([
    ['2027-07-01', 'in 223 days'],
    ['2026-11-21', 'tomorrow'],
    ['2026-11-20', 'today'],
    ['2026-11-19', 'yesterday'],
    ['2026-08-10', '102 days ago'],
  ])('should_describe_%s_relative_to_20_nov_2026_as_"%s"', (target, expected) => {
    // Given today is 20 Nov 2026
    // When
    const result = countdownText(target, '2026-11-20');
    // Then
    expect(result).toBe(expected);
  });
});

describe('formatDate', () => {
  it('should_format_long_short_and_stamp_styles_in_australian_order', () => {
    expect(formatDate('2027-07-01', 'long')).toBe('1 July 2027');
    expect(formatDate('2027-07-01', 'short')).toBe('1 Jul 2027');
    expect(formatDate('2027-07-01', 'stamp')).toBe('1.7.27');
  });
});

describe('staleness', () => {
  it('should_flag_data_as_stale_when_last_checked_more_than_three_days_ago', () => {
    // Given a last check four Sydney days ago
    const lastChecked = '2026-11-16T06:00:00+11:00';
    const now = new Date('2026-11-20T01:00:00Z');
    // When / Then
    expect(daysSince(lastChecked, now)).toBe(4);
    expect(isStale(lastChecked, now)).toBe(true);
  });

  it('should_not_flag_data_checked_two_days_ago', () => {
    expect(isStale('2026-11-18T06:00:00+11:00', new Date('2026-11-20T01:00:00Z'))).toBe(false);
  });
});
