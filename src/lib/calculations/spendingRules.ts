import type { CalculatorInputs, SpendingRule } from '@/types/calculator';

export interface SpendingRuleContext {
  age: number;
  monthIndexFromRetirement: number; // 0 at retirement month
  remainingMonths: number;

  // balances
  portfolioBalance: number; // nominal dollars at this month
  retirementStartBalance: number; // nominal balance at retirement (reference)

  // baseline need
  baselinePortfolioWithdrawal: number; // nominal: expenses - income, floored at 0

  // NEW (optional): assumed portfolio growth during retirement (monthly, nominal)
  assumedMonthlyReturn?: number;
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

    if (ctx.portfolioBalance < lower) w *= (1 - g.cutPct);
    else if (ctx.portfolioBalance > upper) w *= (1 + g.raisePct);

    return Math.max(0, w);
  }

  // die_with_zero
  // Goal: spend up (if you can) so the balance trends toward ~0 by the target end month.
  const n = Math.max(1, ctx.remainingMonths);
  const r = ctx.assumedMonthlyReturn ?? 0;

  // Amortization payment that reaches ~0 at month n, assuming constant r
  // If r ~ 0: payment ≈ B / n
  // Else: payment = B * r / (1 - (1 + r)^(-n))
  const B = Math.max(0, ctx.portfolioBalance);

  const amortized =
    Math.abs(r) < 1e-9
      ? B / n
      : (B * r) / (1 - Math.pow(1 + r, -n));

  // DWZ “maximize spending” = at least baseline need, and higher if you can.
  return Math.max(0, Math.max(ctx.baselinePortfolioWithdrawal, amortized));
}
