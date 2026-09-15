import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUTS, DEFAULT_LIFE_EXPECTANCY } from '@/lib/defaults';
import {
  applySpendingRule,
  DEFAULT_RETIREMENT_GUARDRAILS,
  getDieWithZeroTargetBalance,
  getNormalizedDieWithZeroTargetAge,
} from '@/lib/calculations/spendingRules';
import {
  getHousingInputWarning,
  getMonthlyHousingCost,
} from '@/lib/calculations/housing';
import { STRATEGIES, type CalculatorInputs, type CalculatorResults } from '@/types/calculator';
import {
  findDisplayedDepletionAge,
  getFundingPresentation,
} from '@/utils/resultPresentation';
import {
  calculateOtherIncome,
  calculateRetirement,
  MONTE_CARLO_RUNS,
  calculateSSIncome,
  evaluatePlanPathSuccess,
  generateGuidance,
  getRetirementCashFlow,
  percentileIndex,
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

function expectedReturnRandom(strategy: CalculatorInputs['investmentStrategy']): () => number {
  const allocation = STRATEGIES[strategy];
  const annualVolatility = Math.sqrt(
    allocation.stockAllocation ** 2 * 0.18 ** 2
      + allocation.bondAllocation ** 2 * 0.05 ** 2,
  );
  const monthlyVolatility = annualVolatility / Math.sqrt(12);
  const zScore = monthlyVolatility / 2;
  const firstBoxMullerValue = Math.exp(-(zScore ** 2) / 2);
  let firstValue = true;

  return () => {
    if (firstValue) {
      firstValue = false;
      return firstBoxMullerValue;
    }

    firstValue = true;
    return 0;
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

  it('keeps fixed spending and die-with-zero distinct through their plan targets', () => {
    const common = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 100000,
      monthlyExpenses: 500,
      dieWithZero: { targetAge: 70, bufferAmount: 0 },
    });
    const fixed = calculateRetirement({ ...common, spendingRule: 'fixed' });
    const dieWithZero = calculateRetirement({ ...common, spendingRule: 'die_with_zero' });

    expect(balanceAt(fixed, 70)).toBeCloseTo(balanceAt(dieWithZero, 70), 6);
    expect(fixed.planEndAge).toBe(90);
    expect(dieWithZero.planEndAge).toBe(70);
    expect(dieWithZero.requiredSavings).toBeLessThan(fixed.requiredSavings);
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

describe('Guardrails and result-presentation contracts', () => {
  it('uses one canonical default for Guardrails calculations and checkpoint bands', () => {
    const inputs = contractInputs({
      spendingRule: 'guardrails',
      guardrails: undefined,
    });
    const results = calculateRetirement(inputs);
    const retirementCheckpoint = checkpointAt(results, inputs.retirementAge);
    const withdrawal = applySpendingRule(inputs, {
      age: inputs.retirementAge,
      monthIndexFromRetirement: 0,
      remainingMonths: 12,
      portfolioBalance: results.projectedAtRetirement,
      retirementStartBalance: results.projectedAtRetirement,
      baselinePortfolioWithdrawal: retirementCheckpoint.monthlyNeed,
    });

    expect(DEFAULT_RETIREMENT_GUARDRAILS).toEqual({
      lowerBand: 0.8,
      upperBand: 1.2,
      cutPct: 0.1,
      raisePct: 0.1,
    });
    expect(withdrawal).toBe(retirementCheckpoint.monthlyNeed);
    expect(retirementCheckpoint.lowerGuardrailRate).toBeCloseTo(
      retirementCheckpoint.targetWithdrawalRate! * DEFAULT_RETIREMENT_GUARDRAILS.lowerBand,
    );
    expect(retirementCheckpoint.upperGuardrailRate).toBeCloseTo(
      retirementCheckpoint.targetWithdrawalRate! * DEFAULT_RETIREMENT_GUARDRAILS.upperBand,
    );
  });

  it('presents a healthy within-band Guardrails checkpoint as good', () => {
    const inputs = contractInputs({
      spendingRule: 'guardrails',
      guardrails: undefined,
    });
    const checkpoint = checkpointAt(calculateRetirement(inputs), inputs.retirementAge);

    expect(checkpoint.guardrailAction).toBe('none');
    expect(checkpoint.stressLevel).toBe('good');
    expect(checkpoint.spendingGapKind).toBeUndefined();
  });

  it('identifies an intentional Guardrails cut without calling it an unfunded gap', () => {
    const inputs = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 500_000,
      monthlyExpenses: 4_000,
      spendingRule: 'guardrails',
      guardrails: undefined,
    });
    const cutCheckpoint = calculateRetirement(inputs).checkpoints.find(
      checkpoint => checkpoint.guardrailAction === 'cut' && checkpoint.portfolioBalance > 0,
    );

    expect(cutCheckpoint).toBeDefined();
    expect(cutCheckpoint?.spendingGap).toBeGreaterThan(0);
    expect(cutCheckpoint?.spendingGapKind).toBe('guardrail-adjustment');
    expect(cutCheckpoint?.stressLevel).toBe('warn');
  });

  it('keeps checkpoints deterministic when Monte Carlo is enabled', () => {
    const inputs = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 500_000,
      monthlyExpenses: 4_000,
      spendingRule: 'guardrails',
      guardrails: undefined,
    });
    const deterministic = calculateRetirement(inputs);
    const monteCarlo = calculateRetirement(
      { ...inputs, monteCarloEnabled: true },
      { random: seededRandom(17) },
    );

    expect(monteCarlo.checkpoints).toEqual(deterministic.checkpoints);
    expect(monteCarlo.chartData).not.toEqual(deterministic.chartData);
  });

  it('uses complete funded status—not gap sign—for screen and PDF presentation', () => {
    expect(getFundingPresentation({ isOnTrack: false, gap: 10_000 })).toEqual({
      isFunded: false,
      label: 'Gap',
      amount: 10_000,
      sign: '-',
    });
    expect(getFundingPresentation({ isOnTrack: true, gap: 10_000 })).toEqual({
      isFunded: true,
      label: 'Surplus',
      amount: 10_000,
      sign: '+',
    });
  });

  it.each(['fixed', 'guardrails'] as const)(
    'reports displayed-path depletion for %s spending before plan end',
    spendingRule => {
      const inputs = contractInputs({
        currentAge: 64,
        retirementAge: 65,
        currentSavings: 10_000,
        monthlyExpenses: 4_000,
        spendingRule,
        guardrails: spendingRule === 'guardrails' ? undefined : DEFAULT_RETIREMENT_GUARDRAILS,
      });
      const results = calculateRetirement(inputs);

      expect(findDisplayedDepletionAge(
        results.chartData,
        inputs.retirementAge,
        results.planEndAge,
      )).toBeDefined();
    },
  );
});

describe('Monte Carlo test scaffolding', () => {
  it('uses conventional percentile indexes based on n - 1', () => {
    expect(percentileIndex(1000, 0.1)).toBe(99);
    expect(percentileIndex(1000, 0.5)).toBe(499);
    expect(percentileIndex(1000, 0.9)).toBe(899);
  });

  it('uses exactly one 1,000-path set with no random draws at the plan-end boundary', () => {
    let randomCalls = 0;
    const random = () => {
      randomCalls += 1;
      return 0.5;
    };
    const inputs = contractInputs({
      currentAge: 79,
      retirementAge: 80,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 81, bufferAmount: 0 },
      monteCarloEnabled: true,
    });

    const results = calculateRetirement(inputs, { random });
    const simulatedYears = results.planEndAge - inputs.currentAge;

    expect(MONTE_CARLO_RUNS).toBe(1000);
    expect(randomCalls).toBe(simulatedYears * 12 * 2 * MONTE_CARLO_RUNS);
  });

  it('matches the deterministic two-year path and funded status at Required Savings', () => {
    const plan = contractInputs({
      currentAge: 79,
      retirementAge: 80,
      currentSavings: 0,
      monthlyExpenses: 3000,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 81, bufferAmount: 0 },
    });
    const solution = solveRequiredSavings(plan);
    const annualReturn = STRATEGIES[plan.investmentStrategy].expectedReturn;
    const inputs = {
      ...plan,
      currentSavings: solution.requiredSavings / (1 + annualReturn),
    };
    const deterministic = calculateRetirement(inputs);
    const monteCarlo = calculateRetirement(
      { ...inputs, monteCarloEnabled: true },
      { random: expectedReturnRandom(inputs.investmentStrategy) },
    );

    expect(solution.status).toBe('solved');
    expect(deterministic.projectedAtRetirement).toBeCloseTo(solution.requiredSavings, 6);
    expect(deterministic.deterministicFunded).toBe(true);
    expect(deterministic.chartData.map(point => point.age)).toEqual([79, 80, 81]);
    expect(monteCarlo.chartData.map(point => point.age)).toEqual([79, 80, 81]);
    for (const age of [79, 80, 81]) {
      expect(balanceAt(monteCarlo, age)).toBeCloseTo(balanceAt(deterministic, age), 5);
    }
    expect(monteCarlo.successProbability).toBe(1);
  });

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

  it('keeps a zero retirement balance anchored at retirement when a later deposit arrives', () => {
    const inputs = contractInputs({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 0,
      monthlyExpenses: 1000,
      spendingRule: 'guardrails',
      guardrails: undefined,
      oneTimeDeposits: [{
        id: 'later-deposit',
        type: 'other',
        amount: 100_000,
        ageReceived: 66,
      }],
    });
    const deterministic = calculateRetirement(inputs);
    const monteCarlo = calculateRetirement(
      { ...inputs, monteCarloEnabled: true },
      { random: expectedReturnRandom(inputs.investmentStrategy) },
    );

    expect(monteCarlo.chartData.map(point => point.age))
      .toEqual(deterministic.chartData.map(point => point.age));
    for (const point of deterministic.chartData) {
      expect(balanceAt(monteCarlo, point.age)).toBeCloseTo(point.balance, 6);
    }
    expect(monteCarlo.checkpoints).toEqual(deterministic.checkpoints);
  });
});

describe('Die With Zero target normalization', () => {
  it('uses the clamped plan-end age for both the horizon and buffer target', () => {
    const inputs = contractInputs({
      currentAge: 79,
      retirementAge: 80,
      inflationEnabled: true,
      inflationRate: 3,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 10, bufferAmount: 100_000 },
    });
    const normalizedTargetAge = getNormalizedDieWithZeroTargetAge(inputs);
    const results = calculateRetirement(inputs);

    expect(normalizedTargetAge).toBe(81);
    expect(results.planEndAge).toBe(normalizedTargetAge);
    expect(results.requiredEndingBalance).toBeCloseTo(
      getDieWithZeroTargetBalance(inputs),
      6,
    );
    expect(results.requiredEndingBalance).toBeCloseTo(100_000 * 1.03 ** 2, 6);
  });

  it('preserves the life-expectancy fallback when DWZ target age is omitted', () => {
    const inputs = contractInputs({
      currentAge: 60,
      retirementAge: 65,
      spendingRule: 'die_with_zero',
      dieWithZero: undefined,
    });

    expect(calculateRetirement(inputs).planEndAge).toBe(DEFAULT_LIFE_EXPECTANCY);
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

describe('Phase 4B preview contradiction regression', () => {
  const previewInputs: CalculatorInputs = {
    ...DEFAULT_INPUTS,
    currentAge: 44,
    retirementAge: 50,
    monthlyExpenses: 5800,
    currentSavings: 950_000,
    monthlyContribution: 800,
    employerContribution: 200,
    investmentStrategy: 'growth',
    inflationEnabled: true,
    inflationRate: 3,
    annualIncreaseEnabled: false,
    retirementStrategyEnabled: false,
    ssEnabled: true,
    ssClaimAge: 67,
    ssMonthlyBenefit: 2000,
    applyInflationToSS: true,
    housePayoffEnabled: false,
    otherIncome: [{
      id: 'preview-income',
      label: 'Other income',
      monthlyAmount: 2300,
      startAge: 44,
      hasCola: true,
    }],
    oneTimeDeposits: [],
    spendingRule: 'die_with_zero',
    dieWithZero: { targetAge: 95, bufferAmount: 0 },
    monteCarloEnabled: false,
  };

  it('keeps the deterministic status, spending suggestion, and retirement income math aligned', () => {
    const results = calculateRetirement(previewInputs);
    const retirementCheckpoint = checkpointAt(results, 50);
    const age67Checkpoint = checkpointAt(results, 67);
    const retirementCashFlow = getRetirementCashFlow(previewInputs, 50);
    const age67CashFlow = getRetirementCashFlow(previewInputs, 67);
    const retirementInflationFactor = Math.pow(1.03, 6);
    const age67InflationFactor = Math.pow(1.03, 23);

    expect(results.projectedAtRetirement).toBeCloseTo(1_514_254, -1);
    expect(results.projectedAtRetirement).toBeGreaterThan(results.requiredSavings);
    expect(results.gap).toBeGreaterThan(0);
    expect(results.isOnTrack).toBe(true);
    expect(results.deterministicFunded).toBe(true);
    expect(results.depletionAge).toBeUndefined();
    expect(results.planEndAge).toBe(95);
    expect(results.planEndBalance).toBeGreaterThan(0);

    expect(results.sustainableMonthlySpending).toBeGreaterThan(previewInputs.monthlyExpenses);
    const suggestedPlan = calculateRetirement({
      ...previewInputs,
      monthlyExpenses: results.sustainableMonthlySpending!,
    });
    expect(suggestedPlan.deterministicFunded).toBe(true);

    expect(retirementCashFlow.monthlyExpenses / retirementInflationFactor).toBeCloseTo(5800, 6);
    expect(retirementCashFlow.otherIncome / retirementInflationFactor).toBeCloseTo(2300, 6);
    expect(retirementCashFlow.ssIncome).toBe(0);
    expect(retirementCashFlow.requestedPortfolioWithdrawal / retirementInflationFactor)
      .toBeCloseTo(3500, 6);
    expect(retirementCheckpoint.fromPortfolio)
      .toBeCloseTo(retirementCashFlow.requestedPortfolioWithdrawal, 6);

    expect(age67CashFlow.ssIncome / age67InflationFactor).toBeCloseTo(2000, 6);
    expect(age67CashFlow.otherIncome / age67InflationFactor).toBeCloseTo(2300, 6);
    expect(age67Checkpoint.ssIncome).toBeCloseTo(age67CashFlow.ssIncome, 6);
    expect(age67Checkpoint.otherIncome).toBeCloseTo(age67CashFlow.otherIncome, 6);
  });

  it('does not recommend spending above an entered amount that fails deterministically', () => {
    const underfunded = calculateRetirement({
      ...previewInputs,
      currentSavings: 250_000,
    });

    expect(underfunded.deterministicFunded).toBe(false);
    expect(underfunded.sustainableMonthlySpending)
      .toBeLessThanOrEqual(previewInputs.monthlyExpenses);
  });

  it('uses the deterministic cash-flow schedule when Monte Carlo returns equal the expected return', () => {
    const deterministic = calculateRetirement(previewInputs);
    const monteCarlo = calculateRetirement(
      { ...previewInputs, monteCarloEnabled: true },
      { random: expectedReturnRandom('growth') },
    );

    expect(monteCarlo.requiredSavings).toBeCloseTo(deterministic.requiredSavings, 6);
    expect(monteCarlo.projectedAtRetirement).toBeCloseTo(deterministic.projectedAtRetirement, 6);
    expect(monteCarlo.gap).toBeCloseTo(deterministic.gap, 6);
    expect(monteCarlo.successProbability).toBe(1);
    expect(balanceAt(monteCarlo, 50)).toBeCloseTo(balanceAt(deterministic, 50), 4);
    expect(balanceAt(monteCarlo, 67)).toBeCloseTo(balanceAt(deterministic, 67), 4);
    expect(balanceAt(monteCarlo, 95)).toBeCloseTo(balanceAt(deterministic, 95), 4);
    expect(checkpointAt(monteCarlo, 50).fromPortfolio)
      .toBeCloseTo(checkpointAt(deterministic, 50).fromPortfolio, 6);
    expect(checkpointAt(monteCarlo, 67).fromPortfolio)
      .toBeCloseTo(checkpointAt(deterministic, 67).fromPortfolio, 6);
    expect(checkpointAt(monteCarlo, 50).otherIncome)
      .toBeCloseTo(getRetirementCashFlow(previewInputs, 50).otherIncome, 6);
    expect(checkpointAt(monteCarlo, 50).ssIncome).toBe(0);
    expect(checkpointAt(monteCarlo, 67).ssIncome)
      .toBeCloseTo(getRetirementCashFlow(previewInputs, 67).ssIncome, 6);
  });

  it('solves a passing retirement balance while a slightly lower balance fails', () => {
    const solution = solveRequiredSavings(previewInputs);
    const solvedPath = simulateDeterministicRetirement(
      previewInputs,
      solution.requiredSavings,
    );
    const lowerPath = simulateDeterministicRetirement(
      previewInputs,
      solution.requiredSavings - 1000,
    );

    expect(solution.status).toBe('solved');
    expect(evaluatePlanPathSuccess(previewInputs, {
      endingBalance: solvedPath.planEndBalance,
      depletedBeforePlanEnd: solvedPath.depletedBeforeTarget,
    })).toBe(true);
    expect(evaluatePlanPathSuccess(previewInputs, {
      endingBalance: lowerPath.planEndBalance,
      depletedBeforePlanEnd: lowerPath.depletedBeforeTarget,
    })).toBe(false);
  });
});

describe('housing details cash-flow contracts', () => {
  const housingInputs = (overrides: Partial<CalculatorInputs> = {}) => contractInputs({
    currentAge: 60,
    retirementAge: 62,
    monthlyExpenses: 4000,
    currentSavings: 800_000,
    inflationEnabled: true,
    inflationRate: 3,
    housePayoffEnabled: true,
    housingPlan: 'own',
    housePayoffAge: 70,
    currentMortgagePayment: 1500,
    monthlyRent: 1500,
    rentGrowthRate: 3,
    ...overrides,
  });

  const expensesAt = (inputs: CalculatorInputs, age: number) =>
    getRetirementCashFlow(inputs, age).monthlyExpenses;

  it('treats every entered dollar as general lifestyle spending while Housing Details is off', () => {
    const inputs = housingInputs({ housePayoffEnabled: false });

    expect(expensesAt(inputs, 60)).toBeCloseTo(4000, 6);
    expect(expensesAt(inputs, 70)).toBeCloseTo(4000 * Math.pow(1.03, 10), 6);
    expect(expensesAt(inputs, 90)).toBeCloseTo(4000 * Math.pow(1.03, 30), 6);
  });

  it('keeps the default plan identical when housing fields are missing from stale inputs', () => {
    const staleInputs = { ...DEFAULT_INPUTS } as Record<string, unknown>;
    delete staleInputs.housingPlan;
    delete staleInputs.monthlyRent;
    delete staleInputs.rentGrowthRate;

    expect(calculateRetirement(staleInputs as unknown as CalculatorInputs))
      .toEqual(calculateRetirement(DEFAULT_INPUTS));
  });

  it('adds a fixed nominal mortgage to inflated non-housing spending until payoff', () => {
    const inputs = housingInputs();
    const nonHousingToday = 4000 - 1500;

    expect(expensesAt(inputs, 60)).toBeCloseTo(nonHousingToday + 1500, 6);
    expect(expensesAt(inputs, 62)).toBeCloseTo(nonHousingToday * Math.pow(1.03, 2) + 1500, 6);
    expect(expensesAt(inputs, 69)).toBeCloseTo(nonHousingToday * Math.pow(1.03, 9) + 1500, 6);
  });

  it('removes the mortgage from the cash flow beginning exactly at the payoff age', () => {
    const inputs = housingInputs();
    const nonHousingToday = 4000 - 1500;

    expect(expensesAt(inputs, 69)).toBeCloseTo(nonHousingToday * Math.pow(1.03, 9) + 1500, 6);
    expect(expensesAt(inputs, 70)).toBeCloseTo(nonHousingToday * Math.pow(1.03, 10), 6);
    expect(expensesAt(inputs, 71)).toBeCloseTo(nonHousingToday * Math.pow(1.03, 11), 6);
  });

  it('holds non-housing spending flat while owning when general inflation is disabled', () => {
    const inputs = housingInputs({ inflationEnabled: false });

    expect(expensesAt(inputs, 62)).toBeCloseTo(4000, 6);
    expect(expensesAt(inputs, 69)).toBeCloseTo(4000, 6);
    expect(expensesAt(inputs, 70)).toBeCloseTo(2500, 6);
  });

  it('grows rent by its own rate on top of inflated non-housing spending', () => {
    const inputs = housingInputs({
      housingPlan: 'rent',
      monthlyRent: 1500,
      rentGrowthRate: 4,
      inflationRate: 2,
    });
    const nonHousingToday = 4000 - 1500;

    expect(expensesAt(inputs, 60)).toBeCloseTo(nonHousingToday + 1500, 6);
    expect(expensesAt(inputs, 62)).toBeCloseTo(
      nonHousingToday * Math.pow(1.02, 2) + 1500 * Math.pow(1.04, 2),
      6,
    );
    expect(expensesAt(inputs, 85)).toBeCloseTo(
      nonHousingToday * Math.pow(1.02, 25) + 1500 * Math.pow(1.04, 25),
      6,
    );
  });

  it('keeps rent growing in the cash flow when general inflation is disabled', () => {
    const inputs = housingInputs({
      housingPlan: 'rent',
      inflationEnabled: false,
      monthlyRent: 1500,
      rentGrowthRate: 4,
    });

    expect(expensesAt(inputs, 85)).toBeCloseTo(2500 + 1500 * Math.pow(1.04, 25), 6);
  });

  it('does not let the general inflation rate change the rent portion', () => {
    const lowInflation = housingInputs({ housingPlan: 'rent', inflationRate: 1 });
    const highInflation = housingInputs({ housingPlan: 'rent', inflationRate: 9 });
    const rentAt85 = 1500 * Math.pow(1.03, 25);

    expect(expensesAt(lowInflation, 85) - 2500 * Math.pow(1.01, 25)).toBeCloseTo(rentAt85, 6);
    expect(expensesAt(highInflation, 85) - 2500 * Math.pow(1.09, 25)).toBeCloseTo(rentAt85, 6);
  });

  it('solves Required Savings against the Own schedule', () => {
    const payoffAt70 = solveRequiredSavings(housingInputs({ housePayoffAge: 70 }));
    const payoffAt80 = solveRequiredSavings(housingInputs({ housePayoffAge: 80 }));
    const housingOff = solveRequiredSavings(housingInputs({ housePayoffEnabled: false }));
    const solvedPath = simulateDeterministicRetirement(
      housingInputs({ housePayoffAge: 70 }),
      payoffAt70.requiredSavings,
    );

    expect(payoffAt70.status).toBe('solved');
    expect(payoffAt70.requiredSavings).toBeLessThan(payoffAt80.requiredSavings);
    // A fixed nominal mortgage costs less than inflating that same portion forever.
    expect(payoffAt80.requiredSavings).toBeLessThan(housingOff.requiredSavings);
    expect(solvedPath.depletedBeforeTarget).toBe(false);
    expect(solvedPath.planEndBalance).toBeLessThan(1);
  });

  it('solves Required Savings against the Rent schedule', () => {
    const rentInputs = (rentGrowthRate: number) =>
      housingInputs({ housingPlan: 'rent', rentGrowthRate });
    const slowGrowth = solveRequiredSavings(rentInputs(2));
    const fastGrowth = solveRequiredSavings(rentInputs(6));
    const solvedPath = simulateDeterministicRetirement(
      rentInputs(6),
      fastGrowth.requiredSavings,
    );

    expect(slowGrowth.status).toBe('solved');
    expect(fastGrowth.requiredSavings).toBeGreaterThan(slowGrowth.requiredSavings);
    expect(solvedPath.depletedBeforeTarget).toBe(false);
    expect(solvedPath.planEndBalance).toBeLessThan(1);
  });

  it('requires more savings to rent with sustained growth than to pay off an equal mortgage', () => {
    const own = housingInputs({
      housingPlan: 'own',
      currentMortgagePayment: 1500,
      housePayoffAge: 70,
    });
    const rent = housingInputs({
      housingPlan: 'rent',
      monthlyRent: 1500,
      rentGrowthRate: 3,
    });

    expect(expensesAt(own, 60)).toBeCloseTo(expensesAt(rent, 60), 6);
    expect(solveRequiredSavings(rent).requiredSavings)
      .toBeGreaterThan(solveRequiredSavings(own).requiredSavings);
  });

  it('solves sustainable spending against the identical housing schedule', () => {
    const inputs = housingInputs({ currentSavings: 300_000 });
    const results = calculateRetirement(inputs);
    const supported = results.sustainableMonthlySpending ?? 0;
    const rerun = calculateRetirement({ ...inputs, monthlyExpenses: supported });
    const fasterRentGrowth = calculateRetirement({
      ...inputs,
      housingPlan: 'rent',
      rentGrowthRate: 6,
    });

    expect(results.sustainableSpendingStatus).toBe('solved');
    expect(supported).toBeGreaterThan(0);
    expect(supported).toBeLessThan(inputs.monthlyExpenses);
    // Total spending always carries the selected housing cost.
    expect(supported).toBeGreaterThanOrEqual(getMonthlyHousingCost(inputs, inputs.currentAge));
    expect(rerun.deterministicFunded).toBe(true);
    expect(fasterRentGrowth.sustainableMonthlySpending ?? 0).toBeLessThan(supported);
  });

  it('reports an unsupported housing cost instead of a $0 lifestyle budget', () => {
    const inputs = housingInputs({
      currentSavings: 50_000,
      monthlyExpenses: 3500,
      housingPlan: 'rent',
      monthlyRent: 3000,
      rentGrowthRate: 5,
    });
    const results = calculateRetirement(inputs);
    const guidance = generateGuidance(inputs, results);
    const spendingGuidance = guidance.find(item => item.type === 'expenses');

    expect(results.deterministicFunded).toBe(false);
    expect(results.sustainableSpendingStatus).toBe('housing-not-supported');
    expect(results.sustainableMonthlySpending).toBeUndefined();
    expect(spendingGuidance?.description)
      .toContain('selected housing cost alone is not supported');
    expect(spendingGuidance?.description).not.toContain('$0');
    expect(spendingGuidance?.value).toBeUndefined();
    expect(guidance.every(item => !(item.value ?? '').includes('$0'))).toBe(true);
  });

  it('feeds housing-inclusive monthly need into main-calculator Guardrails', () => {
    const inputs = housingInputs({ spendingRule: 'guardrails', currentSavings: 900_000 });
    const results = calculateRetirement(inputs);
    const checkpoint = checkpointAt(results, 65);
    const cashFlow = getRetirementCashFlow(inputs, 65);
    const rentResults = calculateRetirement({
      ...inputs,
      housingPlan: 'rent',
      rentGrowthRate: 6,
    });

    expect(checkpoint.monthlyNeed).toBeCloseTo(cashFlow.monthlyExpenses, 6);
    expect(checkpoint.monthlyNeed).toBeCloseTo(2500 * Math.pow(1.03, 5) + 1500, 6);
    expect(checkpoint.lowerGuardrailRate)
      .toBeCloseTo((checkpoint.targetWithdrawalRate ?? 0) * DEFAULT_RETIREMENT_GUARDRAILS.lowerBand, 9);
    expect(checkpoint.upperGuardrailRate)
      .toBeCloseTo((checkpoint.targetWithdrawalRate ?? 0) * DEFAULT_RETIREMENT_GUARDRAILS.upperBand, 9);
    // Faster-growing housing raises the need that the guardrail bands are measured against.
    expect(checkpointAt(rentResults, 82).monthlyNeed)
      .toBeGreaterThan(checkpointAt(results, 82).monthlyNeed);
    expect(checkpointAt(rentResults, 82).targetWithdrawalRate ?? 0)
      .toBeGreaterThan(checkpointAt(results, 82).targetWithdrawalRate ?? 0);
  });

  it.each([
    ['own', 'own' as const],
    ['rent', 'rent' as const],
  ])('matches deterministic and Monte Carlo paths for %s housing', (_label, housingPlan) => {
    // Funded on both plans so the compared balances stay above zero at plan end.
    const inputs = housingInputs({ housingPlan, currentSavings: 1_500_000 });
    const deterministic = calculateRetirement(inputs);
    const monteCarlo = calculateRetirement(
      { ...inputs, monteCarloEnabled: true },
      { random: expectedReturnRandom('conservative') },
    );

    expect(monteCarlo.requiredSavings).toBeCloseTo(deterministic.requiredSavings, 6);
    expect(monteCarlo.projectedAtRetirement).toBeCloseTo(deterministic.projectedAtRetirement, 6);
    expect(deterministic.deterministicFunded).toBe(true);
    expect(monteCarlo.successProbability).toBe(1);
    expect(balanceAt(monteCarlo, 62)).toBeCloseTo(balanceAt(deterministic, 62), 4);
    expect(balanceAt(monteCarlo, 70)).toBeCloseTo(balanceAt(deterministic, 70), 4);
    expect(balanceAt(monteCarlo, 90)).toBeCloseTo(balanceAt(deterministic, 90), 4);
    expect(balanceAt(deterministic, 90)).toBeGreaterThan(0);
    expect(checkpointAt(monteCarlo, 70).monthlyNeed)
      .toBeCloseTo(checkpointAt(deterministic, 70).monthlyNeed, 6);
  });

  it('normalizes invalid payoff ages and negative housing inputs inside the projection', () => {
    const payoffBeforeCurrentAge = housingInputs({ housePayoffAge: 20 });
    const payoffAtCurrentAge = housingInputs({ housePayoffAge: 60 });
    const housingOff = housingInputs({ housePayoffEnabled: false });
    const negativeRent = housingInputs({ housingPlan: 'rent', monthlyRent: -1800 });

    // Payoff at or before the current age means the mortgage is already gone.
    expect(expensesAt(payoffBeforeCurrentAge, 70)).toBeCloseTo(expensesAt(housingOff, 70), 6);
    expect(expensesAt(payoffAtCurrentAge, 70)).toBeCloseTo(expensesAt(housingOff, 70), 6);
    expect(solveRequiredSavings(payoffBeforeCurrentAge).requiredSavings)
      .toBeCloseTo(solveRequiredSavings(payoffAtCurrentAge).requiredSavings, 6);

    expect(expensesAt(negativeRent, 80)).toBeCloseTo(expensesAt(housingOff, 80), 6);
    expect(Number.isFinite(calculateRetirement(negativeRent).requiredSavings)).toBe(true);
  });

  it('never creates negative non-housing spending when housing exceeds total expenses', () => {
    const own = housingInputs({ monthlyExpenses: 1200, currentMortgagePayment: 1500 });
    const rent = housingInputs({
      housingPlan: 'rent',
      monthlyExpenses: 1200,
      monthlyRent: 1800,
      rentGrowthRate: 3,
    });

    expect(expensesAt(own, 62)).toBeCloseTo(1500, 6);
    expect(expensesAt(own, 70)).toBe(0);
    expect(expensesAt(rent, 62)).toBeCloseTo(1800 * Math.pow(1.03, 2), 6);
    expect(getHousingInputWarning(own)).toBeTruthy();
    expect(getHousingInputWarning(rent)).toBeTruthy();
  });
});
