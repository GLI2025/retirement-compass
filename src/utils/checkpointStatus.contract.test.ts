import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUTS } from '@/lib/defaults';
import type { CalculatorInputs, CalculatorResults, IncomeCheckpoint } from '@/types/calculator';
import {
  calculateRetirement,
  getRetirementCashFlow,
  solveRequiredSavings,
} from '@/utils/calculations';

// Old heuristic thresholds: a snapshot withdrawal rate at or above these used to
// color a Fixed-spending checkpoint amber or red regardless of funded status.
const RETIRED_WARN_THRESHOLD = 0.04;
const RETIRED_BAD_THRESHOLD = 0.06;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
}

function drawdownInputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    ...DEFAULT_INPUTS,
    currentAge: 64,
    retirementAge: 65,
    monthlyContribution: 0,
    employerContribution: 0,
    inflationEnabled: false,
    ssEnabled: false,
    monteCarloEnabled: false,
    ...overrides,
  };
}

function checkpointsAtOrAfter(results: CalculatorResults, age: number): IncomeCheckpoint[] {
  return results.checkpoints.filter(checkpoint => checkpoint.age >= age);
}

function checkpointsBefore(results: CalculatorResults, age: number): IncomeCheckpoint[] {
  return results.checkpoints.filter(checkpoint => checkpoint.age < age);
}

function stressLevels(checkpoints: IncomeCheckpoint[]): string[] {
  return checkpoints.map(checkpoint => checkpoint.stressLevel);
}

function balanceAt(results: CalculatorResults, age: number): number {
  return results.chartData.find(point => point.age === age)?.balance ?? Number.NaN;
}

// Default plan shape, funded through plan end: the deterministic surplus and the
// On Track headline coexist with snapshot withdrawal rates far above the old
// heuristic thresholds.
const fundedDefaultPlan: CalculatorInputs = { ...DEFAULT_INPUTS, currentSavings: 130_000 };

// Fixed spending that runs out mid-retirement.
const depletingFixedPlan = drawdownInputs({
  currentSavings: 300_000,
  monthlyExpenses: 5_000,
});

// Guardrails plan funded through plan end that still takes a planned cut later.
const fundedGuardrailsPlan: CalculatorInputs = {
  ...DEFAULT_INPUTS,
  currentAge: 64,
  retirementAge: 65,
  currentSavings: 700_000,
  monthlyContribution: 0,
  employerContribution: 0,
  monthlyExpenses: 4_500,
  ssEnabled: true,
  ssClaimAge: 70,
  ssMonthlyBenefit: 2_000,
  spendingRule: 'guardrails',
  monteCarloEnabled: false,
};

describe('Fixed-spending checkpoint status follows funded status, not a withdrawal rate', () => {
  it('keeps every checkpoint of a funded default-shaped plan green above the old rate thresholds', () => {
    const results = calculateRetirement(fundedDefaultPlan);
    const rates = results.checkpoints.map(checkpoint => checkpoint.withdrawalRate);

    expect(results.isOnTrack).toBe(true);
    expect(results.deterministicFunded).toBe(true);
    expect(results.gap).toBeGreaterThan(0);
    expect(results.depletionAge).toBeUndefined();
    expect(results.planEndBalance).toBeGreaterThan(0);

    // The retirement checkpoint alone clears the old amber and red thresholds,
    // and later snapshots run far higher while the plan is still funded.
    expect(rates[0]).toBeGreaterThan(RETIRED_WARN_THRESHOLD);
    expect(rates[0]).toBeGreaterThan(RETIRED_BAD_THRESHOLD * 0.99);
    expect(Math.max(...rates)).toBeGreaterThan(RETIRED_BAD_THRESHOLD);
    expect(stressLevels(results.checkpoints).every(level => level === 'good')).toBe(true);
  });

  it.each([
    ['default shape with a small surplus', fundedDefaultPlan],
    ['default shape with a large surplus', { ...DEFAULT_INPUTS, currentSavings: 400_000 }],
    ['no-inflation drawdown plan', drawdownInputs({
      currentSavings: 1_200_000,
      monthlyExpenses: 3_000,
    })],
    ['plan funded to the dollar', {
      ...drawdownInputs({ currentSavings: 0, monthlyExpenses: 2_500 }),
      currentSavings: solveRequiredSavings(
        drawdownInputs({ currentSavings: 0, monthlyExpenses: 2_500 }),
      ).requiredSavings / 1.06,
    }],
  ] as const)('never pairs a green On Track headline with a red or amber checkpoint (%s)', (_label, inputs) => {
    const results = calculateRetirement(inputs);

    expect(results.isOnTrack).toBe(true);
    expect(results.deterministicFunded).toBe(true);
    expect(results.checkpoints.length).toBeGreaterThan(0);
    expect(stressLevels(results.checkpoints)).toEqual(
      results.checkpoints.map(() => 'good'),
    );
  });

  it('is amber before projected depletion and red at or after it', () => {
    const results = calculateRetirement(depletingFixedPlan);
    const depletionAge = results.depletionAge!;

    expect(results.isOnTrack).toBe(false);
    expect(depletionAge).toBeGreaterThan(65);
    expect(depletionAge).toBeLessThan(results.planEndAge);
    expect(checkpointsBefore(results, depletionAge).length).toBeGreaterThan(0);
    expect(stressLevels(checkpointsBefore(results, depletionAge))).toEqual(
      checkpointsBefore(results, depletionAge).map(() => 'warn'),
    );
    expect(checkpointsAtOrAfter(results, depletionAge).length).toBeGreaterThan(0);
    expect(stressLevels(checkpointsAtOrAfter(results, depletionAge))).toEqual(
      checkpointsAtOrAfter(results, depletionAge).map(() => 'bad'),
    );
  });

  it('keeps checkpoints red after premature depletion even when a later deposit restores the balance', () => {
    const withLateDeposit = calculateRetirement({
      ...depletingFixedPlan,
      oneTimeDeposits: [{
        id: 'late-deposit',
        type: 'other',
        label: 'Late deposit',
        amount: 3_000_000,
        ageReceived: 85,
      }],
    });
    const depletionAge = withLateDeposit.depletionAge!;
    const restored = checkpointsAtOrAfter(withLateDeposit, 85);

    expect(depletionAge).toBeLessThan(85);
    expect(balanceAt(withLateDeposit, 85)).toBeGreaterThan(0);
    expect(withLateDeposit.planEndBalance).toBeGreaterThan(0);
    expect(withLateDeposit.deterministicFunded).toBe(false);
    expect(restored.length).toBeGreaterThan(0);
    expect(restored.every(checkpoint => checkpoint.portfolioBalance > 0)).toBe(true);
    expect(stressLevels(restored)).toEqual(restored.map(() => 'bad'));
  });
});

describe('Guardrails checkpoint status', () => {
  it('keeps healthy Guardrails checkpoints green on a funded path', () => {
    const results = calculateRetirement(fundedGuardrailsPlan);
    const healthy = results.checkpoints.filter(
      checkpoint => checkpoint.guardrailAction !== 'cut',
    );

    expect(results.isOnTrack).toBe(true);
    expect(results.deterministicFunded).toBe(true);
    expect(results.depletionAge).toBeUndefined();
    expect(healthy.length).toBeGreaterThan(0);
    expect(stressLevels(healthy)).toEqual(healthy.map(() => 'good'));
  });

  it('keeps an intentional Guardrails cut green on a funded path', () => {
    const results = calculateRetirement(fundedGuardrailsPlan);
    const cuts = results.checkpoints.filter(
      checkpoint => checkpoint.guardrailAction === 'cut',
    );

    expect(results.deterministicFunded).toBe(true);
    expect(cuts.length).toBeGreaterThan(0);
    expect(cuts.every(checkpoint => checkpoint.portfolioBalance > 0)).toBe(true);
    expect(cuts.every(checkpoint => checkpoint.spendingGapKind === 'guardrail-adjustment')).toBe(true);
    expect(stressLevels(cuts)).toEqual(cuts.map(() => 'good'));
  });

  it('turns Guardrails checkpoints red at actual depletion instead of hiding the failure', () => {
    const results = calculateRetirement(drawdownInputs({
      currentSavings: 300_000,
      monthlyExpenses: 5_000,
      spendingRule: 'guardrails',
    }));
    const depletionAge = results.depletionAge!;
    const beforeDepletion = checkpointsBefore(results, depletionAge);
    const afterDepletion = checkpointsAtOrAfter(results, depletionAge);

    expect(results.deterministicFunded).toBe(false);
    expect(depletionAge).toBeLessThan(results.planEndAge);
    expect(afterDepletion.length).toBeGreaterThan(0);
    expect(stressLevels(afterDepletion)).toEqual(afterDepletion.map(() => 'bad'));
    // A normal or raise action on a path that fails later is not presented as healthy.
    expect(beforeDepletion.some(checkpoint => checkpoint.guardrailAction === 'none')).toBe(true);
    expect(stressLevels(beforeDepletion)).toEqual(beforeDepletion.map(() => 'warn'));
  });
});

describe('Die With Zero checkpoint status', () => {
  const dieWithZeroPlan = (overrides: Partial<CalculatorInputs> = {}) => drawdownInputs({
    currentSavings: 1_000_000,
    monthlyExpenses: 4_000,
    spendingRule: 'die_with_zero',
    dieWithZero: { targetAge: 85, bufferAmount: 0 },
    ...overrides,
  });

  it('keeps a funded Die With Zero path green through its target age', () => {
    const results = calculateRetirement(dieWithZeroPlan());

    expect(results.targetStatus).toBe('met');
    expect(results.isOnTrack).toBe(true);
    expect(results.planEndAge).toBe(85);
    expect(stressLevels(results.checkpoints)).toEqual(
      results.checkpoints.map(() => 'good'),
    );
  });

  it('keeps an ending-buffer shortfall amber without premature depletion', () => {
    const results = calculateRetirement(dieWithZeroPlan({
      dieWithZero: { targetAge: 85, bufferAmount: 2_000_000 },
    }));

    expect(results.targetStatus).toBe('buffer-short');
    expect(results.depletionAge).toBeUndefined();
    expect(results.planEndBalance).toBeGreaterThan(0);
    expect(stressLevels(results.checkpoints)).toEqual(
      results.checkpoints.map(() => 'warn'),
    );
    expect(results.checkpoints.at(-1)?.targetStatus).toBe('buffer-short');
  });

  it('turns red at premature depletion without retroactively reddening earlier checkpoints', () => {
    const results = calculateRetirement(dieWithZeroPlan({
      currentSavings: 900_000,
      monthlyExpenses: 6_000,
      dieWithZero: { targetAge: 95, bufferAmount: 0 },
    }));
    const depletionAge = results.depletionAge!;
    const beforeDepletion = checkpointsBefore(results, depletionAge);
    const afterDepletion = checkpointsAtOrAfter(results, depletionAge);

    expect(results.targetStatus).toBe('depleted');
    expect(depletionAge).toBeLessThan(95);
    expect(beforeDepletion.length).toBeGreaterThan(0);
    expect(beforeDepletion.every(checkpoint => checkpoint.portfolioBalance > 0)).toBe(true);
    expect(stressLevels(beforeDepletion)).toEqual(beforeDepletion.map(() => 'warn'));
    expect(afterDepletion.length).toBeGreaterThan(0);
    expect(stressLevels(afterDepletion)).toEqual(afterDepletion.map(() => 'bad'));
  });
});

// Values recorded from the deterministic engine before the checkpoint-status fix.
// Every number below is produced by the financial model, so a presentation change
// must reproduce all of them exactly.
const PRE_FIX_PLAN_NUMBERS = {
  'default inputs': {
    inputs: DEFAULT_INPUTS,
    requiredSavings: 989343.2483077049,
    projectedAtRetirement: 805141.6021601664,
    gap: -184201.64614753856,
    isOnTrack: false,
    planEndBalance: 0,
    depletionAge: 84.41666666666667,
    chart: [[45, 75000], [64, 643063.4571915544], [67, 805141.6021601664],
      [70, 757741.7397091308], [80, 357312.5142231282], [90, 0]],
    // age, monthlyNeed, ssIncome, fromPortfolio, portfolioBalance, spendingGap
    checkpoints: [
      [67, 8814.075680759599, 3832.2068177215647, 4981.868863038035, 805141.6021601664, 0],
      [70, 9631.378476409394, 4187.555859308432, 5443.822617100962, 757741.7397091308, 0],
      [77, 11845.380676151519, 5150.165511370225, 6695.215164781293, 527030.2740877501, 0],
      [87, 15919.20111024638, 6921.391787063643, 0, 0, 8997.809323182737],
      [90, 17395.340871596196, 7563.191683302694, 0, 0, 9832.1491882935],
    ],
  },
  'funded default shape': {
    inputs: fundedDefaultPlan,
    requiredSavings: 989343.2483077049,
    projectedAtRetirement: 1003336.1600719761,
    gap: 13992.911764271208,
    isOnTrack: true,
    planEndBalance: 53449.43616086613,
    depletionAge: undefined,
    chart: [[45, 130000], [64, 809471.429806372], [67, 1003336.1600719761],
      [70, 993794.629295023], [80, 780047.2878003085], [90, 53449.43616086613]],
    checkpoints: [
      [67, 8814.075680759599, 3832.2068177215647, 4981.868863038035, 1003336.1600719761, 0],
      [70, 9631.378476409394, 4187.555859308432, 5443.822617100962, 993794.629295023, 0],
      [77, 11845.380676151519, 5150.165511370225, 6695.215164781293, 881966.5415914442, 0],
      [87, 15919.20111024638, 6921.391787063643, 8997.809323182737, 349978.1766608902, 0],
      [90, 17395.340871596196, 7563.191683302694, 9832.1491882935, 53449.43616086613, 0],
    ],
  },
  'housing details, own with payoff': {
    inputs: {
      ...DEFAULT_INPUTS,
      housePayoffEnabled: true,
      housingPlan: 'own' as const,
      housePayoffAge: 70,
      currentMortgagePayment: 1500,
    },
    requiredSavings: 467991.7320609093,
    projectedAtRetirement: 805141.6021601664,
    gap: 337149.8700992571,
    isOnTrack: true,
    planEndBalance: 1287828.1028303576,
    depletionAge: undefined,
    chart: [[45, 75000], [64, 643063.4571915544], [67, 805141.6021601664],
      [70, 814951.5539929868], [80, 1036509.3869545625], [90, 1287828.1028303576]],
    checkpoints: [
      [67, 7439.920567468425, 3832.2068177215647, 3607.7137497468607, 805141.6021601664, 0],
      [70, 6490.71158192807, 4187.555859308432, 2303.1557226196373, 814951.5539929868, 0],
      [77, 7982.75654262385, 5150.165511370225, 2832.5910312536244, 966321.7978637258, 0],
      [87, 10728.157269948648, 6921.391787063643, 3806.7654828850045, 1210366.5004181706, 0],
      [90, 11722.947109119175, 7563.191683302694, 4159.755425816481, 1287828.1028303576, 0],
    ],
  },
  'housing details, rent with growth': {
    inputs: {
      ...DEFAULT_INPUTS,
      housePayoffEnabled: true,
      housingPlan: 'rent' as const,
      housePayoffAge: 70,
      currentMortgagePayment: 1500,
      monthlyRent: 1500,
      rentGrowthRate: 4,
    },
    requiredSavings: 1195800.5875349045,
    projectedAtRetirement: 805141.6021601664,
    gap: -390658.9853747381,
    isOnTrack: false,
    planEndBalance: 0,
    depletionAge: 81.16666666666667,
    chart: [[45, 75000], [64, 643063.4571915544], [67, 805141.6021601664],
      [70, 728878.9185049502], [80, 116872.48509178762], [90, 0]],
    checkpoints: [
      [67, 9494.798754725847, 3832.2068177215647, 5662.591937004283, 805141.6021601664, 0],
      [70, 10489.466079159203, 4187.555859308432, 6301.910219850771, 728878.9185049502, 0],
      [77, 13244.844662892534, 5150.165511370225, 8094.6791515223085, 374310.3367388632, 0],
      [87, 18517.33313671308, 6921.391787063643, 0, 0, 11595.941349649438],
      [90, 20484.71063131128, 7563.191683302694, 0, 0, 12921.518948008586],
    ],
  },
} as const;

describe('financial results are unchanged by the checkpoint presentation fix', () => {
  it.each(Object.entries(PRE_FIX_PLAN_NUMBERS))(
    'reproduces Required Savings, Projected Savings, Gap, chart balances, and checkpoint cash flows for %s',
    (_label, expected) => {
      const results = calculateRetirement(expected.inputs);

      expect(results.requiredSavings).toBeCloseTo(expected.requiredSavings, 6);
      expect(results.projectedAtRetirement).toBeCloseTo(expected.projectedAtRetirement, 6);
      expect(results.gap).toBeCloseTo(expected.gap, 6);
      expect(results.isOnTrack).toBe(expected.isOnTrack);
      expect(results.planEndBalance).toBeCloseTo(expected.planEndBalance, 6);
      expect(results.depletionAge).toBe(expected.depletionAge);

      for (const [age, balance] of expected.chart) {
        expect(balanceAt(results, age)).toBeCloseTo(balance, 6);
      }

      expect(results.checkpoints.map(checkpoint => checkpoint.age))
        .toEqual(expected.checkpoints.map(checkpoint => checkpoint[0]));
      for (const [age, monthlyNeed, ssIncome, fromPortfolio, portfolioBalance, spendingGap]
        of expected.checkpoints) {
        const checkpoint = results.checkpoints.find(candidate => candidate.age === age)!;

        expect(checkpoint.monthlyNeed).toBeCloseTo(monthlyNeed, 6);
        expect(checkpoint.ssIncome).toBeCloseTo(ssIncome, 6);
        expect(checkpoint.otherIncome).toBe(0);
        expect(checkpoint.fromPortfolio).toBeCloseTo(fromPortfolio, 6);
        expect(checkpoint.portfolioBalance).toBeCloseTo(portfolioBalance, 6);
        expect(checkpoint.spendingGap).toBeCloseTo(spendingGap, 6);
      }
    },
  );

  it('reproduces Monte Carlo probability and percentile bands for a fixed random sequence', () => {
    const results = calculateRetirement(
      { ...DEFAULT_INPUTS, monteCarloEnabled: true },
      { random: seededRandom(4242) },
    );
    const bandsAt = (age: number) => {
      const point = results.chartData.find(candidate => candidate.age === age)!;
      return [point.balance, point.p10, point.p25, point.p50, point.p75, point.p90];
    };

    expect(results.successProbability).toBe(0.222);
    expect(bandsAt(45)).toEqual([75000, 75000, 75000, 75000, 75000, 75000]);
    expect(bandsAt(67)).toEqual([
      737997.4404642223,
      465731.7378755279,
      569496.1177684432,
      737997.4404642223,
      963266.4647646924,
      1252243.5589641854,
    ]);
    expect(bandsAt(90)).toEqual([0, 0, 0, 0, 0, 1224005.893337778]);
  });

  it('reproduces the housing cash-flow schedule for Own and Rent', () => {
    const own = PRE_FIX_PLAN_NUMBERS['housing details, own with payoff'].inputs;
    const rent = PRE_FIX_PLAN_NUMBERS['housing details, rent with growth'].inputs;
    const expensesAt = (inputs: CalculatorInputs, age: number) =>
      getRetirementCashFlow(inputs, age).monthlyExpenses;

    expect([62, 67, 70, 90].map(age => expensesAt(own, age))).toEqual([
      6623.827660042431,
      7439.920567468425,
      6490.71158192807,
      11722.947109119175,
    ]);
    expect([62, 67, 70, 90].map(age => expensesAt(rent, age))).toEqual([
      8045.678403376853,
      9494.798754725847,
      10489.466079159203,
      20484.71063131128,
    ]);
    expect(solveRequiredSavings(own).requiredSavings).toBeCloseTo(467991.7320609093, 6);
    expect(solveRequiredSavings(rent).requiredSavings).toBeCloseTo(1195800.5875349045, 6);
  });
});
