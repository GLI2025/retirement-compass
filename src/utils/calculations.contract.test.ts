import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUTS } from '@/lib/defaults';
import type { CalculatorInputs, CalculatorResults } from '@/types/calculator';
import {
  calculateOtherIncome,
  calculateRetirement,
  calculateSSIncome,
  evaluatePlanPathSuccess,
  generateGuidance,
  REQUIRED_SAVINGS_SOLVER_DEFAULTS,
  simulateDeterministicRetirement,
  solveRequiredSavings,
} from '@/utils/calculations';

function contractInputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    ...DEFAULT_INPUTS,
    currentAge: 60,
    retirementAge: 62,
    monthlyExpenses: 3000,
    currentSavings: 500000,
    monthlyContribution: 0,
    employerContribution: 0,
    investmentStrategy: 'conservative',
    inflationEnabled: false,
    annualIncreaseEnabled: false,
    retirementStrategyEnabled: false,
    ssEnabled: false,
    housePayoffEnabled: false,
    currentMortgagePayment: 0,
    otherIncome: [],
    oneTimeDeposits: [],
    spendingRule: 'fixed',
    monteCarloEnabled: false,
    ...overrides,
  };
}

function balanceAt(results: CalculatorResults, age: number): number {
  const point = results.chartData.find((candidate) => candidate.age === age);
  expect(point, `expected a chart point at age ${age}`).toBeDefined();
  return point?.balance ?? 0;
}

function checkpointAt(results: CalculatorResults, age: number) {
  const checkpoint = results.checkpoints.find((candidate) => candidate.age === age);
  expect(checkpoint, `expected a checkpoint at age ${age}`).toBeDefined();
  return checkpoint!;
}

function projectMonthly(
  startingBalance: number,
  annualReturn: number,
  monthlyCashFlow: number,
  months: number,
): number {
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  let balance = startingBalance;
  for (let month = 0; month < months; month++) {
    balance = balance * (1 + monthlyReturn) + monthlyCashFlow;
  }
  return balance;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
}

function deterministicGrowth(): () => number {
  let firstValue = true;
  return () => {
    const value = firstValue ? 0.5 : 0.25;
    firstValue = !firstValue;
    return value;
  };
}

describe('main retirement calculator financial contracts', () => {
  it('accumulates savings and contributions monthly through retirement', () => {
    const inputs = contractInputs({
      currentSavings: 100000,
      monthlyContribution: 500,
      employerContribution: 100,
    });

    const results = calculateRetirement(inputs);
    const expectedAtRetirement = projectMonthly(100000, 0.04, 600, 24);

    expect(results.projectedAtRetirement).toBeCloseTo(expectedAtRetirement, 6);
    expect(balanceAt(results, 62)).toBeCloseTo(expectedAtRetirement, 6);
  });

  it('begins withdrawals at retirement and keeps applying investment growth during drawdown', () => {
    const inputs = contractInputs({
      currentAge: 60,
      retirementAge: 61,
      monthlyExpenses: 1000,
    });
    const noSpending = calculateRetirement({ ...inputs, monthlyExpenses: 0 });
    const results = calculateRetirement(inputs);
    const retirementBalance = projectMonthly(500000, 0.04, 0, 12);
    const expectedAfterFirstRetirementYear = projectMonthly(retirementBalance, 0.04, -1000, 12);

    expect(balanceAt(results, 61)).toBeCloseTo(retirementBalance, 6);
    expect(balanceAt(results, 61)).toBeCloseTo(balanceAt(noSpending, 61), 6);
    expect(balanceAt(results, 62)).toBeCloseTo(expectedAfterFirstRetirementYear, 6);
    expect(balanceAt(results, 62)).toBeGreaterThan(retirementBalance - 12000);
  });

  it('keeps Social Security at zero before claim and reduces the portfolio withdrawal at claim', () => {
    const inputs = contractInputs({
      retirementAge: 62,
      monthlyExpenses: 3000,
      ssEnabled: true,
      ssClaimAge: 67,
      ssMonthlyBenefit: 1200,
    });
    const results = calculateRetirement(inputs);

    expect(calculateSSIncome(inputs, 66)).toBe(0);
    expect(calculateSSIncome(inputs, 67)).toBe(1200);
    expect(checkpointAt(results, 65).ssIncome).toBe(0);
    expect(checkpointAt(results, 65).fromPortfolio).toBe(3000);
    expect(checkpointAt(results, 67).ssIncome).toBe(1200);
    expect(checkpointAt(results, 67).fromPortfolio).toBe(1800);
  });

  it('starts other income at its configured age and combines multiple active sources', () => {
    const inputs = contractInputs({
      monthlyExpenses: 3000,
      otherIncome: [
        {
          id: 'pension',
          label: 'Pension',
          monthlyAmount: 500,
          startAge: 64,
          hasCola: false,
        },
        {
          id: 'annuity',
          label: 'Annuity',
          monthlyAmount: 750,
          startAge: 65,
          hasCola: false,
        },
      ],
    });
    const results = calculateRetirement(inputs);

    expect(calculateOtherIncome(inputs, 63)).toBe(0);
    expect(calculateOtherIncome(inputs, 64)).toBe(500);
    expect(calculateOtherIncome(inputs, 65)).toBe(1250);
    expect(checkpointAt(results, 62).otherIncome).toBe(0);
    expect(checkpointAt(results, 62).fromPortfolio).toBe(3000);
    expect(checkpointAt(results, 65).otherIncome).toBe(1250);
    expect(checkpointAt(results, 65).fromPortfolio).toBe(1750);
  });

  it('applies a one-time deposit at the configured age and not before', () => {
    const baseline = contractInputs({
      currentAge: 60,
      retirementAge: 65,
      currentSavings: 100000,
    });
    const withoutDeposit = calculateRetirement(baseline);
    const withDeposit = calculateRetirement({
      ...baseline,
      oneTimeDeposits: [{
        id: 'deposit',
        type: 'other',
        label: 'Planned deposit',
        amount: 10000,
        ageReceived: 62,
      }],
    });

    expect(balanceAt(withDeposit, 61)).toBeCloseTo(balanceAt(withoutDeposit, 61), 6);
    expect(balanceAt(withDeposit, 62) - balanceAt(withoutDeposit, 62)).toBeCloseTo(10000, 6);
  });

  it('removes the mortgage payment from expenses at the payoff age', () => {
    const inputs = contractInputs({
      monthlyExpenses: 4000,
      housePayoffEnabled: true,
      housePayoffAge: 65,
      currentMortgagePayment: 1500,
    });
    const results = calculateRetirement(inputs);

    expect(checkpointAt(results, 62).monthlyNeed).toBe(4000);
    expect(checkpointAt(results, 62).fromPortfolio).toBe(4000);
    expect(checkpointAt(results, 65).monthlyNeed).toBe(2500);
    expect(checkpointAt(results, 65).fromPortfolio).toBe(2500);
  });

  it('keeps fixed spending and die-with-zero as distinct deterministic strategies', () => {
    const common = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 100000,
      monthlyExpenses: 500,
      dieWithZero: { targetAge: 70, bufferAmount: 0 },
    });
    const fixed = calculateRetirement({ ...common, spendingRule: 'fixed' });
    const dieWithZero = calculateRetirement({ ...common, spendingRule: 'die_with_zero' });

    expect(balanceAt(fixed, 70)).toBeGreaterThan(balanceAt(dieWithZero, 70));
    expect(balanceAt(dieWithZero, 70)).toBeLessThan(1);
    expect(dieWithZero.targetStatus).toBe('met');
  });

  it('includes the selected die-with-zero ending buffer in its deterministic target', () => {
    const common = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 100000,
      monthlyExpenses: 500,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 70, bufferAmount: 0 },
    });
    const noBuffer = calculateRetirement(common);
    const buffered = calculateRetirement({
      ...common,
      dieWithZero: { targetAge: 70, bufferAmount: 25000 },
    });

    expect(buffered.requiredSavings).toBeGreaterThan(noBuffer.requiredSavings);

    const fundedAtRetirement = calculateRetirement({
      ...common,
      currentSavings: buffered.requiredSavings / 1.04,
      dieWithZero: { targetAge: 70, bufferAmount: 25000 },
    });
    expect(balanceAt(fundedAtRetirement, 70)).toBeCloseTo(25000, 0);
    expect(fundedAtRetirement.targetStatus).toBe('met');
  });
});

describe('Monte Carlo test scaffolding', () => {
  it('replays the same simulation when supplied the same deterministic random sequence', () => {
    const inputs = contractInputs({
      currentAge: 79,
      retirementAge: 80,
      currentSavings: 300000,
      monthlyExpenses: 1000,
      monteCarloEnabled: true,
    });

    const first = calculateRetirement(inputs, { random: seededRandom(12345) });
    const replay = calculateRetirement(inputs, { random: seededRandom(12345) });

    expect(replay.chartData).toEqual(first.chartData);
    expect(replay.successProbability).toBe(first.successProbability);
  });
});

describe('corrected Monte Carlo success contract', () => {
  it('keeps a path failed after depletion even when a later deposit restores its balance', () => {
    const inputs = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 1000,
      monthlyExpenses: 1000,
      oneTimeDeposits: [{
        id: 'late-deposit',
        type: 'other',
        amount: 1000000,
        ageReceived: 70,
      }],
      monteCarloEnabled: true,
    });

    const results = calculateRetirement(inputs, { random: deterministicGrowth() });

    expect(balanceAt(results, 66)).toBe(0);
    expect(balanceAt(results, 70)).toBe(1000000);
    expect(balanceAt(results, results.planEndAge)).toBeGreaterThan(0);
    expect(results.successProbability).toBe(0);
  });

  it('fails a die-with-zero path that ends below its selected buffer', () => {
    const inputs = contractInputs({
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 90, bufferAmount: 500000 },
      inflationEnabled: false,
    });

    expect(evaluatePlanPathSuccess(inputs, {
      endingBalance: 499999,
      depletedBeforePlanEnd: false,
    })).toBe(false);
  });

  it('succeeds when a die-with-zero path reaches or exceeds its selected buffer', () => {
    const inputs = contractInputs({
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 90, bufferAmount: 500000 },
      inflationEnabled: false,
    });

    expect(evaluatePlanPathSuccess(inputs, {
      endingBalance: 500000,
      depletedBeforePlanEnd: false,
    })).toBe(true);
    expect(evaluatePlanPathSuccess(inputs, {
      endingBalance: 500001,
      depletedBeforePlanEnd: false,
    })).toBe(true);
  });

  it.each(['fixed', 'guardrails'] as const)(
    'counts surviving %s paths as successful',
    (spendingRule) => {
      const inputs = contractInputs({
        currentAge: 79,
        retirementAge: 80,
        currentSavings: 100000,
        monthlyExpenses: 0,
        spendingRule,
        monteCarloEnabled: true,
      });

      const results = calculateRetirement(inputs, { random: deterministicGrowth() });

      expect(results.requiredEndingBalance).toBe(0);
      expect(results.successProbability).toBe(1);
    },
  );
});

describe('today-dollar income contract', () => {
  it('keeps COLA-enabled other income at zero until start and grows it from current age', () => {
    const inputs = contractInputs({
      inflationEnabled: true,
      inflationRate: 3,
      otherIncome: [{
        id: 'pension',
        label: 'Pension',
        monthlyAmount: 1000,
        startAge: 65,
        hasCola: true,
      }],
    });

    expect(calculateOtherIncome(inputs, 64)).toBe(0);
    expect(calculateOtherIncome(inputs, 65)).toBeCloseTo(1000 * Math.pow(1.03, 5), 6);
  });

  it('keeps non-COLA other income nominal after its start age', () => {
    const inputs = contractInputs({
      inflationEnabled: true,
      inflationRate: 3,
      otherIncome: [{
        id: 'pension',
        label: 'Pension',
        monthlyAmount: 1000,
        startAge: 65,
        hasCola: false,
      }],
    });

    expect(calculateOtherIncome(inputs, 64)).toBe(0);
    expect(calculateOtherIncome(inputs, 65)).toBe(1000);
    expect(calculateOtherIncome(inputs, 75)).toBe(1000);
  });

  it('treats COLA-enabled Social Security as today-dollar income at claim age', () => {
    const inputs = contractInputs({
      inflationEnabled: true,
      inflationRate: 3,
      ssEnabled: true,
      ssClaimAge: 67,
      ssMonthlyBenefit: 1200,
      applyInflationToSS: true,
    });

    expect(calculateSSIncome(inputs, 66)).toBe(0);
    expect(calculateSSIncome(inputs, 67)).toBeCloseTo(1200 * Math.pow(1.03, 7), 6);
  });
});

describe('projection-backed spending guidance', () => {
  it('recommends a practical spending level that survives the monthly projection', () => {
    const inputs = contractInputs({
      currentAge: 60,
      retirementAge: 65,
      currentSavings: 300000,
      monthlyExpenses: 3000,
    });
    const results = calculateRetirement(inputs);
    const supportedMonthly = results.sustainableMonthlySpending ?? 0;
    const practicalMonthly = Math.floor(supportedMonthly / 100) * 100;
    const guidance = generateGuidance(inputs, results);
    const spendingGuidance = guidance.find(item => item.type === 'expenses');
    const rerun = calculateRetirement({ ...inputs, monthlyExpenses: practicalMonthly });

    expect(supportedMonthly).toBeGreaterThan(0);
    expect(supportedMonthly).toBeLessThan(inputs.monthlyExpenses);
    expect(rerun.chartData.slice(0, -1).every(point => point.balance > 0)).toBe(true);
    expect(spendingGuidance?.description).toContain('$36,000/year');
    expect(spendingGuidance?.description).toContain(
      `$${(practicalMonthly * 12).toLocaleString()}/year`,
    );
    expect(spendingGuidance?.description).toContain('estimated reduction');
    expect(spendingGuidance?.description).not.toContain('close the gap');
  });
});

describe('unified required-savings contracts', () => {
  const retirementInputs = (overrides: Partial<CalculatorInputs> = {}) => contractInputs({
    currentAge: 64,
    retirementAge: 65,
    currentSavings: 0,
    monthlyExpenses: 2500,
    ...overrides,
  });

  it('solves fixed spending with a balance that remains funded exactly through plan end', () => {
    const inputs = retirementInputs();
    const solution = solveRequiredSavings(inputs);
    const outcome = simulateDeterministicRetirement(inputs, solution.requiredSavings);

    expect(solution.status).toBe('solved');
    expect(outcome.depletedBeforeTarget).toBe(false);
    expect(evaluatePlanPathSuccess(inputs, {
      endingBalance: outcome.planEndBalance,
      depletedBeforePlanEnd: outcome.depletedBeforeTarget,
    })).toBe(true);
    expect(outcome.planEndBalance).toBeLessThan(1);
  });

  it('fails a fixed-spending balance meaningfully below the solved requirement', () => {
    const inputs = retirementInputs();
    const solution = solveRequiredSavings(inputs);
    const outcome = simulateDeterministicRetirement(
      inputs,
      solution.requiredSavings - 10_000,
    );

    expect(outcome.depletedBeforeTarget).toBe(true);
    expect(evaluatePlanPathSuccess(inputs, {
      endingBalance: outcome.planEndBalance,
      depletedBeforePlanEnd: outcome.depletedBeforeTarget,
    })).toBe(false);
  });

  it('runs guardrail adjustments while solving the guardrails requirement', () => {
    const inputs = retirementInputs({
      monthlyExpenses: 4000,
      spendingRule: 'guardrails',
      guardrails: { lowerBand: 0.75, upperBand: 1.15, cutPct: 0.1, raisePct: 0.1 },
    });
    const solution = solveRequiredSavings(inputs);
    const outcome = simulateDeterministicRetirement(inputs, solution.requiredSavings);

    expect(solution.status).toBe('solved');
    expect(outcome.depletedBeforeTarget).toBe(false);
    expect(outcome.guardrailAdjustmentMonths).toBeGreaterThan(0);
  });

  it('solves Die With Zero to the inflation-adjusted selected ending buffer', () => {
    const inputs = retirementInputs({
      spendingRule: 'die_with_zero',
      inflationEnabled: true,
      inflationRate: 3,
      dieWithZero: { targetAge: 90, bufferAmount: 100_000 },
    });
    const solution = solveRequiredSavings(inputs);
    const outcome = simulateDeterministicRetirement(inputs, solution.requiredSavings);
    const results = calculateRetirement(inputs);

    expect(solution.status).toBe('solved');
    expect(outcome.depletedBeforeTarget).toBe(false);
    expect(outcome.planEndBalance).toBeGreaterThanOrEqual(
      results.requiredEndingBalance - solution.convergenceTolerance,
    );
  });

  it('reduces Required Savings when Social Security begins later in retirement', () => {
    const withoutSocialSecurity = retirementInputs({ monthlyExpenses: 4000 });
    const withSocialSecurity = {
      ...withoutSocialSecurity,
      ssEnabled: true,
      ssClaimAge: 70,
      ssMonthlyBenefit: 1800,
    };

    expect(solveRequiredSavings(withSocialSecurity).requiredSavings)
      .toBeLessThan(solveRequiredSavings(withoutSocialSecurity).requiredSavings);
  });

  it('reduces Required Savings when other income begins later in retirement', () => {
    const withoutOtherIncome = retirementInputs({ monthlyExpenses: 4000 });
    const withOtherIncome = {
      ...withoutOtherIncome,
      otherIncome: [{
        id: 'pension',
        label: 'Pension',
        monthlyAmount: 1500,
        startAge: 70,
        hasCola: false,
      }],
    };

    expect(solveRequiredSavings(withOtherIncome).requiredSavings)
      .toBeLessThan(solveRequiredSavings(withoutOtherIncome).requiredSavings);
  });

  it('uses a post-retirement deposit but never resurrects an earlier depleted path', () => {
    const withoutDeposit = retirementInputs({ monthlyExpenses: 3000 });
    const withDeposit = {
      ...withoutDeposit,
      oneTimeDeposits: [{
        id: 'later',
        type: 'other' as const,
        label: 'Later deposit',
        amount: 150_000,
        ageReceived: 70,
      }],
    };
    const depletedThenRestored = simulateDeterministicRetirement({
      ...withDeposit,
      oneTimeDeposits: [{
        id: 'large-later',
        type: 'other',
        label: 'Large later deposit',
        amount: 1_000_000,
        ageReceived: 70,
      }],
    }, 1000);

    expect(solveRequiredSavings(withDeposit).requiredSavings)
      .toBeLessThan(solveRequiredSavings(withoutDeposit).requiredSavings);
    expect(depletedThenRestored.depletedBeforeTarget).toBe(true);
    expect(depletedThenRestored.planEndBalance).toBeGreaterThan(0);
  });

  it('reduces Required Savings after a mortgage payoff lowers expenses', () => {
    const mortgageContinues = retirementInputs({ monthlyExpenses: 5000 });
    const mortgagePaidOff = retirementInputs({
      monthlyExpenses: 5000,
      housePayoffEnabled: true,
      housePayoffAge: 70,
      currentMortgagePayment: 1500,
    });

    expect(solveRequiredSavings(mortgagePaidOff).requiredSavings)
      .toBeLessThan(solveRequiredSavings(mortgageContinues).requiredSavings);
  });

  it('uses the chart retirement balance as Projected Savings', () => {
    const results = calculateRetirement(contractInputs({
      currentAge: 60,
      retirementAge: 65,
      currentSavings: 100_000,
      monthlyContribution: 600,
      oneTimeDeposits: [{
        id: 'retirement-deposit',
        type: 'other',
        label: 'Retirement deposit',
        amount: 25_000,
        ageReceived: 65,
      }],
    }));

    expect(balanceAt(results, 65)).toBeCloseTo(results.projectedAtRetirement, 6);
  });

  it.each([
    ['funded', 1_000_000, true],
    ['underfunded', 50_000, false],
  ] as const)('keeps the %s gap and headline status aligned with the deterministic chart', (_label, currentSavings, expectedFunded) => {
    const results = calculateRetirement(retirementInputs({ currentSavings }));

    expect(results.deterministicFunded).toBe(expectedFunded);
    expect(results.isOnTrack).toBe(expectedFunded);
    expect(results.gap >= 0).toBe(expectedFunded);
    expect(results.gap).toBeCloseTo(
      results.projectedAtRetirement - results.requiredSavings,
      6,
    );
    expect(results.depletionAge === undefined).toBe(expectedFunded);
    expect(results.planEndBalance).toBeCloseTo(balanceAt(results, results.planEndAge), 6);
  });

  it('honors solver bounds, convergence tolerance, and no-solution behavior', () => {
    const inputs = retirementInputs();
    const tolerance = 1;
    const solution = solveRequiredSavings(inputs, { convergenceTolerance: tolerance });
    const solvedOutcome = simulateDeterministicRetirement(inputs, solution.requiredSavings);
    const belowTolerance = simulateDeterministicRetirement(
      inputs,
      Math.max(0, solution.requiredSavings - tolerance * 2),
    );
    const noSolution = solveRequiredSavings(
      retirementInputs({ monthlyExpenses: 10_000_000 }),
      { maximumBalance: 100_000 },
    );

    expect(solution.iterations).toBeLessThanOrEqual(
      REQUIRED_SAVINGS_SOLVER_DEFAULTS.maximumIterations,
    );
    expect(solvedOutcome.depletedBeforeTarget).toBe(false);
    expect(belowTolerance.depletedBeforeTarget).toBe(true);
    expect(noSolution).toMatchObject({
      requiredSavings: 100_000,
      maximumBalance: 100_000,
      status: 'no-solution',
    });
  });
});
