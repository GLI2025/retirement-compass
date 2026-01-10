import type { CalculatorInputs, SpendingRule } from '@/types/calculator';

export interface SpendingRuleContext {
  age: number;
  monthIndexFromRetirement: number;  // 0 at retirement month
  remainingMonths: number;
  // balances
  portfolioBalance: number;          // nominal dollars at this month
  retirementStartBalance: number;    // nominal balance at retirement (reference)
  // baseline need
  baselinePortfolioWithdrawal: number; // nominal: expenses - (SS+pensions+other income), floored at 0
}

// Main entry: returns the withdrawal to take from portfolio this month (nominal)
export function applySpendingRule(
  inputs: CalculatorInputs,
  ctx: SpendingRuleContext
): number {
  const rule: SpendingRule = inputs.spendingRule ?? 'fixed';

  if (rule === 'fixed') {
    return Math.max(0, ctx.baselinePortfolioWithdrawal);
  }

  if (rule === 'guardrails') {
    const g = inputs.guardrails ?? { lowerBand: 0.75, upperBand: 1.15, cutPct: 0.10, raisePct: 0.10 };
    const lower = g.lowerBand * ctx.retirementStartBalance;
    const upper = g.upperBand * ctx.retirementStartBalance;

    let w = ctx.baselinePortfolioWithdrawal;

    // Simple, pension-friendly: one-step adjustment, no fancy bands
  if (ctx.portfolioBalance < lower) w *= (1 - g.cutPct);
else if (ctx.portfolioBalance > upper) w *= (1 + g.raisePct);


    return Math.max(0, w);
  }

    // die_with_zero
  const targetAge = inputs.dieWithZero?.targetAge ?? 95;

  // If target age is not in the future relative to this month, fall back to baseline
  if (targetAge <= ctx.age) return Math.max(0, ctx.baselinePortfolioWithdrawal);

  // Months left until targetAge (approx)
  // We don't have "month-of-year age", so we treat ages as year buckets and use monthIndexFromRetirement.
  // This gives a clean countdown from retirement month onward.
  const monthsLeftToTarget =
    (targetAge - ctx.age) * 12 - (ctx.monthIndexFromRetirement % 12);

  const remaining = Math.max(1, monthsLeftToTarget);
  const amortized = ctx.portfolioBalance / remaining;

  return Math.max(0, Math.max(ctx.baselinePortfolioWithdrawal, amortized));

