import type { CalculatorInputs, SpendingRule } from '@/types/calculator';

export interface SpendingRuleContext {
  age: number;
  monthIndexFromRetirement: number; // 0 at retirement month
  remainingMonths: number;
  // balances
  portfolioBalance: number; // nominal dollars at this month
  retirementStartBalance: number; // nominal balance at retirement (reference)
  // baseline need
  baselinePortfolioWithdrawal: number; // nominal: expenses - (SS+pensions+other income), floored at 0
}

// Main entry: returns the withdrawal to take from portfolio this month (nominal)
export function applySpendingRule(inputs: CalculatorInputs, ctx: SpendingRuleContext): number {
  const rule: SpendingRule = inputs.spendingRule ?? 'fixed';

  if (rule === 'fixed') {
    return Math.max(0, ctx.baselinePortfolioWithdrawal);
  }

  if (rule === 'guardrails') {
    const g = inputs.guardrails ?? {
      lowerBand: 0.75,
      upperBand: 1.15,
      cutPct: 0.10,
      raisePct: 0.10
    };

    const lower = g.lowerBand * ctx.retirementStartBalance;
    const upper = g.upperBand * ctx.retirementStartBalance;

    let w = ctx.baselinePortfolioWithdrawal;

    // Simple, pension-friendly: one-step adjustment
    if (ctx.portfolioBalance < lower) w *= (1 - g.cutPct);
    else if (ctx.portfolioBalance > upper) w *= (1 + g.raisePct);

    return Math.max(0, w);
  }

  // die_with_zero
  // Simulator passes remainingMonths aligned to the plan end age (DWZ target).
  // We amortize the current balance evenly to reach ~0 by the target age.
  // This version *protects the plan end date* and may withdraw less than baseline if needed.
  const remaining = Math.max(1, ctx.remainingMonths);
  const amortized = ctx.portfolioBalance / remaining;

  // Withdraw the smaller of baseline need vs. amortized amount (cuts spending if necessary)
  return Math.max(0, Math.min(ctx.baselinePortfolioWithdrawal, amortized));
}
