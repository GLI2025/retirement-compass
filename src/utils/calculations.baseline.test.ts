import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUTS } from '@/lib/defaults';
import { applySpendingRule } from '@/lib/calculations/spendingRules';
import type { CalculatorInputs } from '@/types/calculator';
import { calculateRetirement, generateGuidance } from '@/utils/calculations';

const roundDollars = (value: number) => Math.round(value);
const roundRate = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(6)) : String(value);

function summarize(inputs: CalculatorInputs) {
  const results = calculateRetirement(inputs);
  const endingPoint = results.chartData[results.chartData.length - 1];

  return {
    requiredSavings: roundDollars(results.requiredSavings),
    projectedAtRetirement: roundDollars(results.projectedAtRetirement),
    gap: roundDollars(results.gap),
    isOnTrack: results.isOnTrack,
    chartYears: results.chartData.length,
    endingAge: endingPoint?.age,
    endingBalance: roundDollars(endingPoint?.balance ?? 0),
    checkpoints: results.checkpoints.map((checkpoint) => ({
      age: checkpoint.age,
      monthlyNeed: roundDollars(checkpoint.monthlyNeed),
      ssIncome: roundDollars(checkpoint.ssIncome),
      otherIncome: roundDollars(checkpoint.otherIncome),
      fromPortfolio: roundDollars(checkpoint.fromPortfolio),
      portfolioBalance: roundDollars(checkpoint.portfolioBalance),
      withdrawalRate: roundRate(checkpoint.withdrawalRate),
      stressLevel: checkpoint.stressLevel,
      guardrailAction: checkpoint.guardrailAction,
    })),
  };
}

describe('retirement calculator baselines', () => {
  it('preserves the default calculator result', () => {
    expect(summarize(DEFAULT_INPUTS)).toMatchSnapshot();
  });

  it('preserves an early-retirement result with Social Security', () => {
    const inputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      currentAge: 44,
      retirementAge: 50,
      monthlyExpenses: 6500,
      currentSavings: 950000,
      monthlyContribution: 2500,
      employerContribution: 300,
      investmentStrategy: 'growth',
      inflationRate: 2.5,
      ssClaimAge: 67,
      ssMonthlyBenefit: 3600,
      currentMortgagePayment: 1700,
      housePayoffEnabled: true,
      housePayoffAge: 65,
    };

    expect(summarize(inputs)).toMatchSnapshot();
  });

  it('preserves income, deposit, contribution-growth, and glidepath behavior', () => {
    const inputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      currentAge: 40,
      retirementAge: 60,
      monthlyExpenses: 8000,
      currentSavings: 400000,
      monthlyContribution: 3000,
      employerContribution: 500,
      investmentStrategy: 'balanced',
      annualIncreaseEnabled: true,
      annualIncreaseRate: 3,
      retirementStrategyEnabled: true,
      retirementStrategy: 'moderate',
      ssClaimAge: 67,
      ssMonthlyBenefit: 3000,
      housePayoffEnabled: true,
      housePayoffAge: 65,
      currentMortgagePayment: 2500,
      otherIncome: [
        {
          id: 'pension',
          label: 'Pension',
          monthlyAmount: 2500,
          startAge: 60,
          hasCola: false,
        },
      ],
      oneTimeDeposits: [
        {
          id: 'deposit',
          type: 'other',
          label: 'Planned deposit',
          amount: 100000,
          ageReceived: 50,
        },
      ],
    };

    expect(summarize(inputs)).toMatchSnapshot();
  });
});

describe('spending-rule baselines', () => {
  const context = {
    age: 70,
    monthIndexFromRetirement: 60,
    remainingMonths: 240,
    portfolioBalance: 500000,
    retirementStartBalance: 1000000,
    baselinePortfolioWithdrawal: 4000,
    assumedMonthlyReturn: 0.004,
  };

  it('keeps fixed spending equal to the baseline need', () => {
    expect(applySpendingRule(DEFAULT_INPUTS, context)).toBe(4000);
  });

  it('keeps the configured guardrail cut and raise behavior', () => {
    const guardrailInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      spendingRule: 'guardrails',
      guardrails: {
        lowerBand: 0.75,
        upperBand: 1.15,
        cutPct: 0.1,
        raisePct: 0.1,
      },
    };

    expect(applySpendingRule(guardrailInputs, context)).toBe(3600);
    expect(
      applySpendingRule(guardrailInputs, {
        ...context,
        portfolioBalance: 2000000,
      }),
    ).toBe(4400);
  });

  it('keeps die-with-zero spending at least as high as baseline need', () => {
    const dieWithZeroInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 95 },
    };

    expect(applySpendingRule(dieWithZeroInputs, context)).toBeCloseTo(4000, 2);
    expect(
      applySpendingRule(dieWithZeroInputs, {
        ...context,
        baselinePortfolioWithdrawal: 1000,
      }),
    ).toBeCloseTo(3244.79, 2);
  });
});

describe('age validation regressions', () => {
  it('normalizes retirement to at least one year after current age', () => {
    const invalidInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      currentAge: 80,
      retirementAge: 67,
    };

    const results = calculateRetirement(invalidInputs);

    expect(results.chartData[0]?.age).toBe(79);
    expect(results.checkpoints.some((checkpoint) => checkpoint.age === 80)).toBe(true);
  });

  it('never recommends a negative monthly savings increase', () => {
    const invalidInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      currentAge: 80,
      retirementAge: 67,
    };

    const results = calculateRetirement(invalidInputs);
    const guidance = generateGuidance(invalidInputs, results);
    const savingsGuidance = guidance.find((item) => item.type === 'savings');

    expect(savingsGuidance).toBeDefined();
    expect(savingsGuidance?.description).not.toMatch(/\$-/);
    expect(savingsGuidance?.value).not.toMatch(/\+\$-/);
  });
});
