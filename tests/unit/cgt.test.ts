import { describe, expect, it } from 'vitest';
import { apportionValue, compareCgt, minimumTaxTopUp, taxOn } from '../../src/lib/cgt.ts';

// Test vectors are the Government's own worked examples:
// Budget 2026-27 tax explainer (Michael, Jane, Zoe, Jack) and the Explanatory Memorandum (Genevieve, as corrected).

describe('taxOn (resident rates from 2027-28, excluding Medicare levy)', () => {
  it.each([
    [18_200, 0],
    [40_000, 3_052],
    [90_000, 17_252],
    [135_000, 30_752],
    [200_000, 55_602],
  ])('should_tax_%i_as_%i', (income, tax) => {
    expect(taxOn(income)).toBe(tax);
  });
});

describe('minimumTaxTopUp', () => {
  it('should_match_EM_example_genevieve_800_dollars', () => {
    // Given $40,000 other income and a $50,000 post-2027 gain
    // When / Then: 30% × 50,000 = 15,000 less 14,200 marginal tax = 800
    expect(minimumTaxTopUp({ otherTaxable: 40_000, minimumTaxGain: 50_000 })).toBe(800);
  });

  it('should_match_budget_example_jack_1600_dollars', () => {
    expect(minimumTaxTopUp({ otherTaxable: 25_000, minimumTaxGain: 10_000 })).toBe(1_600);
  });

  it('should_be_zero_for_a_top_rate_taxpayer', () => {
    expect(minimumTaxTopUp({ otherTaxable: 250_000, minimumTaxGain: 100_000 })).toBe(0);
  });

  it('should_stack_the_gain_on_top_of_discounted_pre_2027_gains', () => {
    // Given other income plus a discounted pre-2027 gain pushing taxable income into the 30% bracket
    const topUp = minimumTaxTopUp({ otherTaxable: 40_000, minimumTaxGain: 20_000, alsoTaxable: 30_000 });
    // Then the post-2027 gain is already taxed at 30%, so no top-up
    expect(topUp).toBe(0);
  });
});

describe('apportionValue (draft Ministerial method: constant compound growth)', () => {
  it('should_reproduce_the_tax_institute_illustration_within_a_thousand_dollars', () => {
    // $1m bought 1 Jul 2007, sold for $8m on 30 Jun 2037
    const v = apportionValue({ cost: 1_000_000, proceeds: 8_000_000, purchaseDate: '2007-07-01', saleDate: '2037-06-30' });
    expect(Math.abs(v - 3_999_000)).toBeLessThan(1_000);
  });
});

describe('compareCgt', () => {
  it('should_match_budget_example_michael_post_2027_gain', () => {
    // Given an asset worth $500,000 at 1 July 2027, sold two years later for $560,000, 2.5% inflation
    const r = compareCgt({
      purchaseDate: '2020-07-01',
      costBase: 500_000,
      valueAt2027: 500_000,
      saleDate: '2029-07-01',
      salePrice: 560_000,
      otherIncome: 250_000,
      inflation: 0.025,
    });
    // Then the post-2027 taxable gain is $34,688 (vs $30,000 under the 50% discount)
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.round(r.next.postGain)).toBe(34_688);
    expect(Math.round(r.old.taxableGain)).toBe(30_000);
    expect(r.next.preTaxable).toBe(0);
  });

  it('should_match_budget_example_jane_total_taxable_gain', () => {
    // Bought 1 Jul 2022 for $800,000, worth $1,131,371 at 1 Jul 2027, sold 1 Jul 2032 for $1.6m
    const r = compareCgt({
      purchaseDate: '2022-07-01',
      costBase: 800_000,
      valueAt2027: 1_131_371,
      saleDate: '2032-07-01',
      salePrice: 1_600_000,
      otherIncome: 250_000,
      inflation: 0.025,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.preTaxable).toBeCloseTo(165_685, -1);
    expect(Math.round(r.next.postGain)).toBe(319_958);
    expect(Math.round(r.next.taxableGain)).toBe(485_643);
    expect(Math.round(r.old.taxableGain)).toBe(400_000);
  });

  it('should_match_budget_example_zoe_shares_bought_after_july_2027', () => {
    const r = compareCgt({
      purchaseDate: '2027-07-01',
      costBase: 100,
      saleDate: '2032-07-01',
      salePrice: 125,
      otherIncome: 250_000,
      inflation: 0.025,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.round(r.next.indexedCostBase)).toBe(113);
    expect(Math.round(r.next.taxableGain)).toBe(12);
    expect(r.next.valueEstimated).toBe(false);
  });

  it('should_add_the_minimum_tax_top_up_for_a_low_income_seller', () => {
    // Given a retiree with $25,000 income selling shares bought after July 2027
    const r = compareCgt({ purchaseDate: '2027-07-01', costBase: 50_000, saleDate: '2030-07-01', salePrice: 70_000, otherIncome: 25_000, inflation: 0.025 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.topUp).toBeGreaterThan(0);
    // Then income tax plus top-up equals 30% of the post-2027 gain (to the dollar)
    expect(Math.abs(r.next.tax - r.next.postGain * 0.3)).toBeLessThan(1);
  });

  it('should_skip_the_minimum_tax_for_income_support_recipients', () => {
    const r = compareCgt({ purchaseDate: '2027-07-01', costBase: 50_000, saleDate: '2030-07-01', salePrice: 70_000, otherIncome: 25_000, inflation: 0.025, incomeSupport: true });
    expect(r.ok && r.next.topUp).toBe(0);
  });

  it('should_estimate_the_july_2027_value_when_none_is_given_and_say_so', () => {
    const r = compareCgt({ purchaseDate: '2017-07-01', costBase: 400_000, saleDate: '2037-07-01', salePrice: 1_600_000, otherIncome: 120_000, inflation: 0.025 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.valueEstimated).toBe(true);
    expect(r.notes.join(' ')).toContain('estimated');
    expect(r.next.valueAt2027).toBeCloseTo(800_000, -4);
  });

  it('should_tax_only_post_2027_growth_on_a_pre_cgt_asset_that_was_previously_exempt', () => {
    const r = compareCgt({ purchaseDate: '1984-01-01', costBase: 50_000, valueAt2027: 1_000_000, saleDate: '2030-07-01', salePrice: 1_500_000, otherIncome: 150_000, inflation: 0.025 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.old.tax).toBe(0);
    expect(r.next.preTaxable).toBe(0);
    expect(Math.round(r.next.postGain)).toBe(Math.round(1_500_000 - 1_000_000 * 1.025 ** 3));
  });

  it('should_keep_the_50_percent_discount_on_a_new_build_by_default_with_no_minimum_tax', () => {
    const r = compareCgt({ purchaseDate: '2027-09-01', costBase: 700_000, saleDate: '2032-09-01', salePrice: 900_000, otherIncome: 30_000, inflation: 0.025, newDwelling: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.taxableGain).toBe(100_000);
    expect(r.next.topUp).toBe(0);
  });

  it('should_let_a_pre_2027_loss_reduce_the_post_2027_gain', () => {
    // Bought for $600k, worth $500k at July 2027, sold for $560k two years later
    const r = compareCgt({ purchaseDate: '2024-07-01', costBase: 600_000, valueAt2027: 500_000, saleDate: '2029-07-01', salePrice: 560_000, otherIncome: 100_000, inflation: 0.025 });
    expect(r.ok && r.next.taxableGain).toBe(0);
  });

  describe('figures shown to the reader (regression: owner review, 20 Nov 2026)', () => {
    // Given the owner's scenario: $549,986 cost, $1,131,371 at July 2027, sold July 2032 for $1,499,986
    const r = compareCgt({
      purchaseDate: '2022-07-01',
      costBase: 549_986,
      valueAt2027: 1_131_371,
      saleDate: '2032-07-01',
      salePrice: 1_499_986,
      otherIncome: 150_000,
      inflation: 0.025,
    });

    it('should_report_the_full_capital_gain_separately_from_the_discounted_taxable_gain', () => {
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.capitalGain).toBe(950_000);
      expect(r.old.taxableGain).toBe(475_000);
      expect(r.old.tax).toBe(210_550);
      expect(Math.round(r.next.taxableGain)).toBe(510_636);
      expect(r.next.tax).toBe(226_586);
    });

    it('should_add_an_approximate_2_percent_medicare_levy_on_the_taxable_gain', () => {
      if (!r.ok) throw new Error('expected ok');
      expect(r.old.medicare).toBe(9_500);
      expect(r.old.total).toBe(220_050);
      expect(r.next.medicare).toBe(10_213);
      expect(r.next.total).toBe(236_799);
      expect(r.difference).toBe(236_799 - 220_050);
    });

    it('should_express_total_tax_as_a_share_of_the_full_capital_gain', () => {
      if (!r.ok) throw new Error('expected ok');
      expect(r.old.effectiveRate).toBeCloseTo(0.2316, 3);
      expect(r.next.effectiveRate).toBeCloseTo(0.2493, 3);
    });
  });

  it('should_report_zero_effective_rate_when_there_is_no_gain', () => {
    const r = compareCgt({ purchaseDate: '2027-08-01', costBase: 100_000, saleDate: '2030-08-01', salePrice: 90_000, otherIncome: 80_000, inflation: 0.025 });
    expect(r.ok && r.capitalGain).toBe(-10_000);
    expect(r.ok && r.old.effectiveRate).toBe(0);
    expect(r.ok && r.next.total).toBe(0);
  });

  it('should_reject_a_sale_before_the_new_rules_start', () => {
    const r = compareCgt({ purchaseDate: '2020-01-01', costBase: 1, saleDate: '2027-06-30', salePrice: 2, otherIncome: 0, inflation: 0.025 });
    expect(r).toEqual({ ok: false, error: 'Choose a sale date on or after 1 July 2027: earlier sales use the old rules.' });
  });

  it('should_reject_a_sale_before_purchase', () => {
    const r = compareCgt({ purchaseDate: '2030-01-01', costBase: 1, saleDate: '2029-07-01', salePrice: 2, otherIncome: 0, inflation: 0.025 });
    expect(r.ok).toBe(false);
  });

  it('should_give_no_discount_or_indexation_when_held_under_12_months', () => {
    const r = compareCgt({ purchaseDate: '2027-08-01', costBase: 100_000, saleDate: '2028-03-01', salePrice: 120_000, otherIncome: 200_000, inflation: 0.025 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.old.taxableGain).toBe(20_000);
    expect(r.next.taxableGain).toBe(20_000);
  });
});
