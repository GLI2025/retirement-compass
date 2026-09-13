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
  it('offers usable spending for defaults retiring at 50 with DWZ', () => {
    const inputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      retirementAge: 50,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 95, bufferAmount: 0 },
    };
    const results = calculateRetirement(inputs);
    const suggested = results.sustainableMonthlySpending!;
    expect(suggested).toBeGreaterThan(500);
    expect(suggested).toBeLessThan(inputs.monthlyExpenses);
    expect(Number.isInteger(suggested)).toBe(true);
    expect(results.checkpoints[0].monthlyNeed / Math.pow(1.03, 5)).toBeCloseTo(4600);
    expect(results.checkpoints[0].ssIncome).toBe(0);
    const adjusted = calculateRetirement({ ...inputs, monthlyExpenses: suggested });
    expect(adjusted.chartData.filter(p => p.age >= 50 && p.age < 95).every(p => p.balance > 0)).toBe(true);
    expect(adjusted.chartData.at(-1)!.balance).toBeLessThan(1);
    expect(calculateRetirement({ ...inputs, currentMortgagePayment: 0 }).chartData).toEqual(results.chartData);
  });

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

  it('never reduces requested spending and increases it only when affordable', () => {
    const dieWithZeroInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 95 },
    };

    expect(applySpendingRule(dieWithZeroInputs, context)).toBe(4000);
    expect(
      applySpendingRule(dieWithZeroInputs, {
        ...context,
        baselinePortfolioWithdrawal: 1000,
      }),
    ).toBeCloseTo(3244.79, 2);
  });

  it('shows early depletion rather than reducing requested spending', () => {
    const dieWithZeroInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      currentAge: 64,
      retirementAge: 65,
      monthlyExpenses: 2000,
      currentSavings: 12000,
      monthlyContribution: 0,
      employerContribution: 0,
      investmentStrategy: 'conservative',
      retirementStrategyEnabled: true,
      retirementStrategy: 'conservative',
      inflationEnabled: false,
      ssEnabled: false,
      housePayoffEnabled: false,
      currentMortgagePayment: 0,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 70 },
      monteCarloEnabled: false,
    };

    const results = calculateRetirement(dieWithZeroInputs);
    const retirementCheckpoint = results.checkpoints.find(({ age }) => age === 65);

    expect(results.chartData.at(-1)?.age).toBe(70);
    expect(results.chartData.at(-1)?.balance).toBeLessThan(1);
    expect(retirementCheckpoint?.fromPortfolio).toBe(2000);
    expect(retirementCheckpoint?.spendingGap).toBe(0);
    expect(retirementCheckpoint?.stressLevel).toBe('bad');
    expect(results.chartData.find(({ balance }) => balance < 1)?.age).toBeLessThan(70);
    expect(results.checkpoints.at(-1)?.isPlanEnd).toBe(true);
    expect(results.checkpoints.at(-1)?.stressLevel).toBe('bad');
  });

  it('preserves the selected ending buffer and calculates spending that fits', () => {
    const bufferedInputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      currentAge: 64,
      retirementAge: 65,
      monthlyExpenses: 2000,
      currentSavings: 12000,
      monthlyContribution: 0,
      employerContribution: 0,
      investmentStrategy: 'conservative',
      retirementStrategyEnabled: true,
      retirementStrategy: 'conservative',
      inflationEnabled: false,
      ssEnabled: false,
      housePayoffEnabled: false,
      currentMortgagePayment: 0,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 70, bufferAmount: 5000 },
      monteCarloEnabled: false,
    };

    const results = calculateRetirement(bufferedInputs);
    expect(results.sustainableMonthlySpending).toBeGreaterThan(0);
    expect(results.sustainableMonthlySpending).toBeLessThan(2000);

    const adjustedResults = calculateRetirement({
      ...bufferedInputs,
      monthlyExpenses: results.sustainableMonthlySpending ?? 0,
    });
    const endingBalance = adjustedResults.chartData.at(-1)?.balance ?? 0;

    expect(endingBalance).toBeCloseTo(5000, 0);
    expect(adjustedResults.chartData.slice(0, -1).every(({ balance }) => balance > 0)).toBe(true);
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
