import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUTS, DEFAULT_INFLATION_RATE } from '@/lib/defaults';
import {
  getHousingExportSummary,
  getHousingInputWarning,
  getMonthlyHousingCost,
  getNonHousingMonthlyExpensesToday,
  MAX_RENT_GROWTH_RATE,
  normalizeHousingInputs,
} from '@/lib/calculations/housing';
import type { CalculatorInputs } from '@/types/calculator';

function housingInputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    ...DEFAULT_INPUTS,
    currentAge: 60,
    retirementAge: 65,
    monthlyExpenses: 4000,
    housePayoffEnabled: true,
    housingPlan: 'own',
    housePayoffAge: 70,
    currentMortgagePayment: 1500,
    monthlyRent: 1800,
    rentGrowthRate: 3,
    ...overrides,
  };
}

describe('housing schedule defaults', () => {
  it('starts rent growth at the inflation-rate default while staying a separate input', () => {
    expect(DEFAULT_INPUTS.rentGrowthRate).toBe(DEFAULT_INFLATION_RATE);
    expect(DEFAULT_INPUTS.inflationRate).toBe(DEFAULT_INFLATION_RATE);
    expect(DEFAULT_INPUTS.housePayoffEnabled).toBe(false);
    expect(DEFAULT_INPUTS.housingPlan).toBe('own');
  });

  it('reports no housing cost and no carve-out while Housing Details is disabled', () => {
    const inputs = housingInputs({ housePayoffEnabled: false });

    expect(getMonthlyHousingCost(inputs, 60)).toBe(0);
    expect(getMonthlyHousingCost(inputs, 75)).toBe(0);
    expect(getMonthlyHousingCost(inputs, 90)).toBe(0);
    expect(getNonHousingMonthlyExpensesToday(inputs)).toBe(4000);
    expect(getHousingInputWarning(inputs)).toBeUndefined();
  });
});

describe('Own housing schedule', () => {
  it('keeps the mortgage payment fixed in nominal dollars until the payoff age', () => {
    const inputs = housingInputs({ inflationEnabled: true, inflationRate: 4 });

    expect(getMonthlyHousingCost(inputs, 60)).toBe(1500);
    expect(getMonthlyHousingCost(inputs, 65)).toBe(1500);
    expect(getMonthlyHousingCost(inputs, 69)).toBe(1500);
  });

  it('removes the mortgage payment beginning exactly at the payoff age', () => {
    const inputs = housingInputs();

    expect(getMonthlyHousingCost(inputs, 69)).toBe(1500);
    expect(getMonthlyHousingCost(inputs, 70)).toBe(0);
    expect(getMonthlyHousingCost(inputs, 71)).toBe(0);
  });

  it('allows a payoff age at or after retirement', () => {
    const atRetirement = housingInputs({ housePayoffAge: 65 });
    const afterRetirement = housingInputs({ housePayoffAge: 80 });

    expect(getMonthlyHousingCost(atRetirement, 64)).toBe(1500);
    expect(getMonthlyHousingCost(atRetirement, 65)).toBe(0);
    expect(getMonthlyHousingCost(afterRetirement, 79)).toBe(1500);
    expect(getMonthlyHousingCost(afterRetirement, 80)).toBe(0);
  });

  it('treats a payoff age at or before the current age as already paid off', () => {
    const atCurrentAge = housingInputs({ housePayoffAge: 60 });
    const beforeCurrentAge = housingInputs({ housePayoffAge: 40 });

    expect(normalizeHousingInputs(beforeCurrentAge).mortgagePayoffAge).toBe(60);
    expect(getMonthlyHousingCost(atCurrentAge, 60)).toBe(0);
    expect(getMonthlyHousingCost(beforeCurrentAge, 60)).toBe(0);
    expect(getMonthlyHousingCost(beforeCurrentAge, 90)).toBe(0);
    // Nothing is carved out of total expenses once the mortgage is gone.
    expect(getNonHousingMonthlyExpensesToday(atCurrentAge)).toBe(4000);
  });
});

describe('Rent housing schedule', () => {
  it('grows rent from the current age using only the selected rent-growth rate', () => {
    const inputs = housingInputs({
      housingPlan: 'rent',
      monthlyRent: 1800,
      rentGrowthRate: 3,
      inflationEnabled: true,
      inflationRate: 7,
    });

    expect(getMonthlyHousingCost(inputs, 60)).toBeCloseTo(1800, 6);
    expect(getMonthlyHousingCost(inputs, 61)).toBeCloseTo(1800 * 1.03, 6);
    expect(getMonthlyHousingCost(inputs, 70)).toBeCloseTo(1800 * Math.pow(1.03, 10), 6);
    expect(getMonthlyHousingCost(inputs, 90)).toBeCloseTo(1800 * Math.pow(1.03, 30), 6);
  });

  it('keeps rent growth active when general lifestyle inflation is disabled', () => {
    const inflationOff = housingInputs({
      housingPlan: 'rent',
      inflationEnabled: false,
      rentGrowthRate: 3,
    });
    const inflationOn = housingInputs({
      housingPlan: 'rent',
      inflationEnabled: true,
      inflationRate: 3,
      rentGrowthRate: 3,
    });

    expect(getMonthlyHousingCost(inflationOff, 80)).toBeCloseTo(1800 * Math.pow(1.03, 20), 6);
    expect(getMonthlyHousingCost(inflationOff, 80))
      .toBeCloseTo(getMonthlyHousingCost(inflationOn, 80), 6);
  });

  it('does not apply the general inflation rate to rent', () => {
    const lowInflation = housingInputs({ housingPlan: 'rent', inflationRate: 1 });
    const highInflation = housingInputs({ housingPlan: 'rent', inflationRate: 9 });

    expect(getMonthlyHousingCost(lowInflation, 85))
      .toBeCloseTo(getMonthlyHousingCost(highInflation, 85), 6);
    expect(getMonthlyHousingCost(highInflation, 85))
      .toBeCloseTo(1800 * Math.pow(1.03, 25), 6);
  });

  it('holds rent flat when the selected rent-growth rate is zero', () => {
    const inputs = housingInputs({ housingPlan: 'rent', rentGrowthRate: 0 });

    expect(getMonthlyHousingCost(inputs, 60)).toBe(1800);
    expect(getMonthlyHousingCost(inputs, 90)).toBe(1800);
  });
});

describe('housing input normalization', () => {
  it('clamps negative mortgage, rent, and rent-growth entries', () => {
    const negatives = normalizeHousingInputs(housingInputs({
      currentMortgagePayment: -1500,
      monthlyRent: -1800,
      rentGrowthRate: -4,
    }));

    expect(negatives.monthlyMortgagePayment).toBe(0);
    expect(negatives.monthlyRent).toBe(0);
    expect(negatives.rentGrowthRate).toBe(0);
  });

  it('bounds the rent-growth rate without touching other assumptions', () => {
    const inputs = housingInputs({
      housingPlan: 'rent',
      rentGrowthRate: 400,
      inflationRate: 3,
    });
    const normalized = normalizeHousingInputs(inputs);

    expect(normalized.rentGrowthRate).toBe(MAX_RENT_GROWTH_RATE);
    expect(inputs.inflationRate).toBe(3);
    expect(getMonthlyHousingCost(inputs, 61))
      .toBeCloseTo(1800 * (1 + MAX_RENT_GROWTH_RATE / 100), 6);
  });

  it('never produces NaN from stale or missing housing inputs', () => {
    const stale = {
      ...housingInputs({ housingPlan: 'rent' }),
      currentAge: Number.NaN,
      monthlyExpenses: Number.NaN,
      monthlyRent: undefined,
      rentGrowthRate: undefined,
      housePayoffAge: undefined,
    } as unknown as CalculatorInputs;
    const normalized = normalizeHousingInputs(stale);

    expect(normalized.currentAge).toBe(DEFAULT_INPUTS.currentAge);
    expect(normalized.monthlyRent).toBe(0);
    expect(normalized.rentGrowthRate).toBe(DEFAULT_INPUTS.rentGrowthRate);
    expect(normalized.mortgagePayoffAge).toBe(DEFAULT_INPUTS.currentAge);
    expect(Number.isFinite(getMonthlyHousingCost(stale, 80))).toBe(true);
    expect(getNonHousingMonthlyExpensesToday(stale)).toBe(0);
  });
});

describe('housing and total monthly expenses', () => {
  it('carves housing out of total expenses instead of adding it on top', () => {
    const own = housingInputs();
    const rent = housingInputs({ housingPlan: 'rent' });

    expect(getNonHousingMonthlyExpensesToday(own)).toBe(4000 - 1500);
    expect(getNonHousingMonthlyExpensesToday(rent)).toBe(4000 - 1800);
  });

  it('warns and floors non-housing spending at zero when housing exceeds total expenses', () => {
    const own = housingInputs({ monthlyExpenses: 1200, currentMortgagePayment: 1500 });
    const rent = housingInputs({
      housingPlan: 'rent',
      monthlyExpenses: 1200,
      monthlyRent: 1800,
    });

    expect(getNonHousingMonthlyExpensesToday(own)).toBe(0);
    expect(getNonHousingMonthlyExpensesToday(rent)).toBe(0);
    expect(getHousingInputWarning(own)).toContain('mortgage payment of $1,500');
    expect(getHousingInputWarning(own)).toContain('total monthly expenses of $1,200');
    expect(getHousingInputWarning(rent)).toContain('rent of $1,800');
    expect(getHousingInputWarning(own)).toContain('Monthly Expenses includes housing');
  });

  it('does not warn when housing fits inside total expenses', () => {
    expect(getHousingInputWarning(housingInputs())).toBeUndefined();
    expect(getHousingInputWarning(housingInputs({ housingPlan: 'rent' }))).toBeUndefined();
  });
});

describe('housing export summary', () => {
  it('states the fixed-nominal basis and general-expense treatment for Own', () => {
    const summary = getHousingExportSummary(housingInputs());

    expect(summary.enabled).toBe(true);
    expect(summary.plan).toBe('own');
    expect(summary.lines).toContain('Housing plan: Own');
    expect(summary.lines.join(' ')).toContain(
      'Monthly mortgage payment (fixed nominal dollars): $1,500',
    );
    expect(summary.lines.join(' ')).toContain('Mortgage payoff age: 70');
    expect(summary.lines.join(' ')).toContain(
      'Property taxes, insurance, HOA, maintenance, and utilities',
    );
    expect(summary.lines.join(' ')).toContain('follow the selected lifestyle-inflation treatment');
  });

  it("states the today's-dollar basis and selected growth rate for Rent", () => {
    const summary = getHousingExportSummary(housingInputs({
      housingPlan: 'rent',
      monthlyRent: 1800,
      rentGrowthRate: 3.5,
    }));

    expect(summary.enabled).toBe(true);
    expect(summary.plan).toBe('rent');
    expect(summary.lines).toContain('Housing plan: Rent');
    expect(summary.lines.join(' ')).toContain("Monthly rent (today's dollars): $1,800");
    expect(summary.lines.join(' ')).toContain('Rent increase: 3.5% per year');
    expect(summary.lines.join(' ')).toContain('annual selected growth rate');
  });

  it('reports that housing is not modeled when Housing Details is disabled', () => {
    const summary = getHousingExportSummary(housingInputs({ housePayoffEnabled: false }));

    expect(summary.enabled).toBe(false);
    expect(summary.lines.join(' ')).toContain('Housing Details: not used');
    expect(summary.lines.join(' ')).toContain('general lifestyle spending');
  });
});
