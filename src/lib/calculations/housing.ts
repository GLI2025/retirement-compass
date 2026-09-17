/**
 * Plain-English guide
 *
 * Purpose: Provides one shared housing-cost schedule for the main Retirement
 * Calculator and prepares matching housing descriptions for the PDF export.
 *
 * Inputs/outputs: It receives housing fields from CalculatorInputs, normalizes
 * invalid values, and returns the housing cost at a requested age. An owned
 * mortgage stays fixed in nominal dollars until payoff. Rent starts in today's
 * dollars and grows only by the selected rent-growth rate.
 *
 * Important behavior: Monthly Expenses already includes housing, so this file
 * removes today's housing portion before the general lifestyle inflation is
 * applied. calculations.ts, HousingSection, and ExportPDFButton depend on it;
 * deterministic, Required Savings, sustainable spending, and Monte Carlo paths
 * therefore use the same housing schedule.
 *
 * Financial impact: High. Double-counting housing or shifting payoff/growth
 * timing would change withdrawals and all downstream retirement results.
 */
import type { CalculatorInputs, HousingPlan } from '@/types/calculator';
import { DEFAULT_INPUTS } from '@/lib/defaults';

// Rent growth is a housing assumption, not a market assumption, so it is
// bounded on its own without touching inflation or return assumptions.
export const MAX_RENT_GROWTH_RATE = 15;

export interface NormalizedHousing {
  enabled: boolean;
  plan: HousingPlan;
  currentAge: number;
  monthlyMortgagePayment: number; // fixed nominal dollars while owed
  mortgagePayoffAge: number; // never earlier than currentAge
  monthlyRent: number; // today's dollars at currentAge
  rentGrowthRate: number; // %, 0..MAX_RENT_GROWTH_RATE
}

export interface HousingExportSummary {
  enabled: boolean;
  plan: HousingPlan;
  lines: string[];
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function nonNegative(value: number | undefined): number {
  return Math.max(0, finiteOr(value, 0));
}

function formatDollars(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatRate(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * Single normalization point for housing inputs. The calculation layer and the
 * UI both read from here so stale or hand-edited inputs cannot reach the
 * projection as negative amounts, NaN, or a payoff age before the current age.
 */
export function normalizeHousingInputs(inputs: CalculatorInputs): NormalizedHousing {
  const currentAge = Math.round(finiteOr(inputs.currentAge, DEFAULT_INPUTS.currentAge));

  const requestedPayoffAge = Math.round(finiteOr(inputs.housePayoffAge, currentAge));

  return {
    enabled: inputs.housePayoffEnabled === true,
    plan: inputs.housingPlan === 'rent' ? 'rent' : 'own',
    currentAge,
    monthlyMortgagePayment: nonNegative(inputs.currentMortgagePayment),
    // Payoff at the current age means the mortgage is already paid off.
    mortgagePayoffAge: Math.max(currentAge, requestedPayoffAge),
    monthlyRent: nonNegative(inputs.monthlyRent),
    rentGrowthRate: Math.min(
      MAX_RENT_GROWTH_RATE,
      Math.max(0, finiteOr(inputs.rentGrowthRate, DEFAULT_INPUTS.rentGrowthRate)),
    ),
  };
}

/**
 * The shared monthly housing-cost schedule, in nominal dollars at `age`.
 *
 * Own: the entered payment is fixed nominal from the current age until, but not
 * including, the payoff age.
 * Rent: the entered rent is today's dollars at the current age and grows only
 * by the selected rent-growth rate, independent of the general inflation toggle.
 */
export function monthlyHousingCostAt(housing: NormalizedHousing, age: number): number {
  if (!housing.enabled) return 0;

  if (housing.plan === 'rent') {
    const yearsOfGrowth = Math.max(0, age - housing.currentAge);
    return housing.monthlyRent * Math.pow(1 + housing.rentGrowthRate / 100, yearsOfGrowth);
  }

  return age < housing.mortgagePayoffAge ? housing.monthlyMortgagePayment : 0;
}

export function getMonthlyHousingCost(inputs: CalculatorInputs, age: number): number {
  return monthlyHousingCostAt(normalizeHousingInputs(inputs), age);
}

/**
 * Monthly Expenses is the user's total lifestyle spending including housing, so
 * the housing portion is carved out of it rather than added on top. Floored at
 * zero: housing above total expenses is reported as a validation warning
 * instead of becoming negative non-housing spending.
 */
export function getNonHousingMonthlyExpensesToday(inputs: CalculatorInputs): number {
  const housing = normalizeHousingInputs(inputs);
  const totalExpenses = nonNegative(inputs.monthlyExpenses);

  return Math.max(0, totalExpenses - monthlyHousingCostAt(housing, housing.currentAge));
}

/**
 * Warning shown when the entered housing cost exceeds total monthly expenses.
 * Housing is part of that total, so the projection cannot represent the entry.
 */
export function getHousingInputWarning(inputs: CalculatorInputs): string | undefined {
  const housing = normalizeHousingInputs(inputs);
  if (!housing.enabled) return undefined;

  const housingToday = monthlyHousingCostAt(housing, housing.currentAge);
  const totalExpenses = nonNegative(inputs.monthlyExpenses);
  if (housingToday <= totalExpenses) return undefined;

  const label = housing.plan === 'rent' ? 'rent' : 'mortgage payment';

  return `Your monthly ${label} of ${formatDollars(housingToday)} is more than your total`
    + ` monthly expenses of ${formatDollars(totalExpenses)}. Monthly Expenses includes housing,`
    + ` so raise total monthly expenses or lower the housing amount. Until then, non-housing`
    + ` spending is treated as $0 rather than a negative amount.`;
}

/**
 * Housing lines for the PDF/export payload. Every amount states its dollar
 * basis so an exported plan cannot be misread as all-nominal or all-real.
 */
export function getHousingExportSummary(inputs: CalculatorInputs): HousingExportSummary {
  const housing = normalizeHousingInputs(inputs);

  if (!housing.enabled) {
    return {
      enabled: false,
      plan: housing.plan,
      lines: [
        'Housing Details: not used. All monthly expenses are treated as general'
          + " lifestyle spending in today's dollars.",
      ],
    };
  }

  if (housing.plan === 'rent') {
    return {
      enabled: true,
      plan: 'rent',
      lines: [
        'Housing plan: Rent',
        `Monthly rent (today's dollars): ${formatDollars(housing.monthlyRent)}`,
        `Rent increase: ${formatRate(housing.rentGrowthRate)} per year (annual selected growth`
          + ' rate, applied from your current age)',
      ],
    };
  }

  return {
    enabled: true,
    plan: 'own',
    lines: [
      'Housing plan: Own',
      `Monthly mortgage payment (fixed nominal dollars): ${formatDollars(housing.monthlyMortgagePayment)}`,
      `Mortgage payoff age: ${housing.mortgagePayoffAge} (payment removed beginning at this age)`,
      "Property taxes, insurance, HOA, maintenance, and utilities stay in monthly expenses"
        + " (today's dollars) and follow the selected lifestyle-inflation treatment.",
    ],
  };
}
