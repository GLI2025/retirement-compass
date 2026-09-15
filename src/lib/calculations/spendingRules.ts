import type { CalculatorInputs, GuardrailsConfig, SpendingRule } from '@/types/calculator';

export const DEFAULT_RETIREMENT_GUARDRAILS: Readonly<GuardrailsConfig> = {
  lowerBand: 0.8,
  upperBand: 1.2,
  cutPct: 0.1,
  raisePct: 0.1,
};

export interface SpendingRuleContext {
  age: number;
  monthIndexFromRetirement: number; // 0 at retirement month
  remainingMonths: number;

  // balances
  portfolioBalance: number; // nominal dollars at this month
  retirementStartBalance: number; // nominal balance at retirement

  // baseline need
  baselinePortfolioWithdrawal: number; // nominal: expenses - income, floored at 0

  // assumed portfolio growth during retirement (monthly, nominal)
  assumedMonthlyReturn?: number;
}

function calculateWithdrawalRate(annualWithdrawal: number, balance: number): number {
  if (balance <= 0) return annualWithdrawal > 0 ? Infinity : 0;
  return annualWithdrawal / balance;
}

export function getDieWithZeroTargetBalance(inputs: CalculatorInputs): number {
  const bufferToday = Math.max(0, inputs.dieWithZero?.bufferAmount ?? 0);
  if (!inputs.inflationEnabled) return bufferToday;

  const targetAge = inputs.dieWithZero?.targetAge ?? inputs.retirementAge;
  const yearsToTarget = Math.max(0, targetAge - inputs.currentAge);
  const inflationRate = Math.max(0, inputs.inflationRate ?? 0) / 100;
  return bufferToday * Math.pow(1 + inflationRate, yearsToTarget);
}

// Main entry: returns the withdrawal to take from portfolio this month (nominal)
export function applySpendingRule(inputs: CalculatorInputs, ctx: SpendingRuleContext): number {
  const rule: SpendingRule = inputs.spendingRule ?? 'fixed';

  if (rule === 'fixed') {
    return Math.max(0, ctx.baselinePortfolioWithdrawal);
  }

  if (rule === 'guardrails') {
    const g = inputs.guardrails ?? DEFAULT_RETIREMENT_GUARDRAILS;

    const baselineMonthlyWithdrawal = Math.max(0, ctx.baselinePortfolioWithdrawal);

    // Target withdrawal rate is set at retirement:
    // annual baseline withdrawal / retirement-start balance
    const targetWithdrawalRate = calculateWithdrawalRate(
      baselineMonthlyWithdrawal * 12,
      ctx.retirementStartBalance
    );

    // Current withdrawal rate is based on today's baseline withdrawal need
    // annualized against today's portfolio balance.
    // This avoids circular logic where the rule would depend on its own output.
    const currentWithdrawalRate = calculateWithdrawalRate(
      baselineMonthlyWithdrawal * 12,
      ctx.portfolioBalance
    );

    const lowerGuardrail = targetWithdrawalRate * g.lowerBand;
    const upperGuardrail = targetWithdrawalRate * g.upperBand;

    let withdrawal = baselineMonthlyWithdrawal;

    if (currentWithdrawalRate > upperGuardrail) {
      withdrawal = baselineMonthlyWithdrawal * (1 - g.cutPct);
    } else if (currentWithdrawalRate < lowerGuardrail) {
      withdrawal = baselineMonthlyWithdrawal * (1 + g.raisePct);
    }

    return Math.max(0, withdrawal);
  }

  // Die With Zero keeps the chart tied to spending the user actually entered.
  // The target age and buffer determine whether that path succeeds. A separate
  // projection-backed solver estimates higher sustainable spending for the user
  // to test without silently increasing withdrawals in the displayed path.
  return Math.max(0, ctx.baselinePortfolioWithdrawal);
}
