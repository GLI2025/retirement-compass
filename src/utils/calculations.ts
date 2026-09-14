import {
  CalculatorInputs,
  CalculatorResults,
  ChartDataPoint,
  IncomeCheckpoint,
  GuidanceItem,
  STRATEGIES
} from '@/types/calculator';

import {
  applySpendingRule,
  getDieWithZeroTargetBalance
} from '@/lib/calculations/spendingRules';
import { DEFAULT_INPUTS, DEFAULT_LIFE_EXPECTANCY } from '@/lib/defaults';

const LIFE_EXPECTANCY = DEFAULT_LIFE_EXPECTANCY;

const MIN_CURRENT_AGE = 18;
const MAX_RETIREMENT_AGE = 80;
const MAX_CURRENT_AGE = MAX_RETIREMENT_AGE - 1;

// Safety cap so DWZ can't run to absurd ages by accident
const MAX_END_AGE = 120;

function normalizeAgeInputs(rawInputs: CalculatorInputs): CalculatorInputs {
  const mergedInputs: CalculatorInputs = {
    ...DEFAULT_INPUTS,
    ...rawInputs,
  };

  const requestedCurrentAge = Number.isFinite(mergedInputs.currentAge)
    ? Math.round(mergedInputs.currentAge)
    : DEFAULT_INPUTS.currentAge;
  const currentAge = Math.min(
    MAX_CURRENT_AGE,
    Math.max(MIN_CURRENT_AGE, requestedCurrentAge),
  );

  const requestedRetirementAge = Number.isFinite(mergedInputs.retirementAge)
    ? Math.round(mergedInputs.retirementAge)
    : DEFAULT_INPUTS.retirementAge;
  const retirementAge = Math.min(
    MAX_RETIREMENT_AGE,
    Math.max(currentAge + 1, requestedRetirementAge),
  );

  return {
    ...mergedInputs,
    currentAge,
    retirementAge,
  };
}

// ------------------------------
// Helpers
// ------------------------------

function getEndAge(inputs: CalculatorInputs): number {
  // Default plan end is LIFE_EXPECTANCY
  if (inputs.spendingRule !== 'die_with_zero') return LIFE_EXPECTANCY;

  // DWZ should use the user's targetAge as the plan end (even if > LIFE_EXPECTANCY)
  const targetAge = inputs.dieWithZero?.targetAge ?? LIFE_EXPECTANCY;
  const normalizedTargetAge = Number.isFinite(targetAge)
    ? Math.round(targetAge)
    : LIFE_EXPECTANCY;

  // A drawdown target must leave at least one year after retirement.
  return Math.max(inputs.retirementAge + 1, Math.min(normalizedTargetAge, MAX_END_AGE));
}

function getRequiredEndingBalance(inputs: CalculatorInputs): number {
  return inputs.spendingRule === 'die_with_zero'
    ? getDieWithZeroTargetBalance(inputs)
    : 0;
}

export interface PlanPathOutcome {
  endingBalance: number;
  depletedBeforePlanEnd: boolean;
}

export function evaluatePlanPathSuccess(
  inputs: CalculatorInputs,
  outcome: PlanPathOutcome,
): boolean {
  if (outcome.depletedBeforePlanEnd) return false;

  const target = getRequiredEndingBalance(inputs);
  const tolerance = Math.max(0.01, target * 1e-9);
  return outcome.endingBalance >= target - tolerance;
}

// SS benefit input is assumed to be in "today's dollars" (real).
// If inflation + COLA are enabled, we convert it to nominal dollars at each future age
// so it stays comparable to inflated expenses.
export function calculateSSIncome(inputs: CalculatorInputs, age: number): number {
  if (!inputs.ssEnabled || age < inputs.ssClaimAge) return 0;

  let ssBenefit = inputs.ssMonthlyBenefit ?? 0;

  if (inputs.applyInflationToSS && inputs.inflationEnabled) {
    const yearsOfCOLA = Math.max(0, age - inputs.currentAge);
    ssBenefit = ssBenefit * Math.pow(1 + (inputs.inflationRate ?? 0) / 100, yearsOfCOLA);
  }

  return ssBenefit;
}

export function calculateOtherIncome(inputs: CalculatorInputs, age: number): number {
  const list = inputs.otherIncome ?? [];
  return list.reduce((total, income) => {
    if (age >= income.startAge && (!income.endAge || age <= income.endAge)) {
      let amount = income.monthlyAmount ?? 0;
      if (income.hasCola && inputs.inflationEnabled) {
        const yearsFromNow = Math.max(0, age - inputs.currentAge);
        amount = amount * Math.pow(1 + (inputs.inflationRate ?? 0) / 100, yearsFromNow);
      }
      return total + amount;
    }
    return total;
  }, 0);
}

export interface RetirementCashFlow {
  monthlyExpenses: number;
  ssIncome: number;
  otherIncome: number;
  requestedPortfolioWithdrawal: number;
}

function calculateMonthlyExpenses(inputs: CalculatorInputs, age: number): number {
  // Fixed-rate mortgage is nominal (does NOT inflate). Lifestyle expenses inflate.

  const baseExpenses = inputs.monthlyExpenses ?? 0;
  const mortgage = inputs.housePayoffEnabled ? inputs.currentMortgagePayment ?? 0 : 0;

  // A) Lifestyle Base = total expenses - mortgage
  const lifestyleBase = Math.max(0, baseExpenses - mortgage);

  // B) Inflate lifestyle base only
  let total = lifestyleBase;
  if (inputs.inflationEnabled) {
    const yearsFromNow = Math.max(0, age - inputs.currentAge);
    total = lifestyleBase * Math.pow(1 + (inputs.inflationRate ?? 0) / 100, yearsFromNow);
  }

  // C) Add original mortgage back if still owed
  if (inputs.housePayoffEnabled) {
    if (age < (inputs.housePayoffAge ?? inputs.currentAge)) total += mortgage;
  } else {
    total += mortgage;
  }

  return Math.max(0, total);
}

export function getRetirementCashFlow(
  inputs: CalculatorInputs,
  age: number,
): RetirementCashFlow {
  const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
  const ssIncome = calculateSSIncome(inputs, age);
  const otherIncome = calculateOtherIncome(inputs, age);

  return {
    monthlyExpenses,
    ssIncome,
    otherIncome,
    requestedPortfolioWithdrawal: Math.max(
      0,
      monthlyExpenses - ssIncome - otherIncome,
    ),
  };
}

// ------------------------------
// Deterministic projection
// ------------------------------

export interface DeterministicProjection {
  chartData: ChartDataPoint[];
  depletedBeforeTarget: boolean;
  depletionAge?: number;
  planEndBalance: number;
  guardrailAdjustmentMonths: number;
}

interface AccumulationProjection {
  chartData: ChartDataPoint[];
  retirementBalance: number;
}

export interface RequiredSavingsSolverOptions {
  maximumBalance?: number;
  convergenceTolerance?: number;
  maximumIterations?: number;
}

export interface RequiredSavingsSolution {
  requiredSavings: number;
  status: 'solved' | 'no-solution';
  iterations: number;
  convergenceTolerance: number;
  maximumBalance: number;
}

export const REQUIRED_SAVINGS_SOLVER_DEFAULTS = {
  maximumBalance: 100_000_000,
  convergenceTolerance: 0.01,
  maximumIterations: 80,
} as const;

function depositsAtAge(inputs: CalculatorInputs, age: number): number {
  return (inputs.oneTimeDeposits ?? [])
    .filter((deposit) => deposit.ageReceived === age)
    .reduce((sum, deposit) => sum + (deposit.amount ?? 0), 0);
}

function projectToRetirement(inputs: CalculatorInputs): AccumulationProjection {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const monthlyReturn = Math.pow(1 + strategy.expectedReturn, 1 / 12) - 1;
  const chartData: ChartDataPoint[] = [];

  let balance = inputs.currentSavings ?? 0;
  let monthlyContribution =
    (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);

  for (let age = inputs.currentAge; age < inputs.retirementAge; age++) {
    balance += depositsAtAge(inputs, age);
    chartData.push({ age, balance: Math.max(0, balance) });

    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyReturn) + monthlyContribution;
    }

    if (inputs.annualIncreaseEnabled) {
      monthlyContribution *= 1 + (inputs.annualIncreaseRate ?? 0) / 100;
    }
  }

  balance += depositsAtAge(inputs, inputs.retirementAge);
  chartData.push({ age: inputs.retirementAge, balance: Math.max(0, balance) });

  return { chartData, retirementBalance: balance };
}

export function simulateDeterministicRetirement(
  rawInputs: CalculatorInputs,
  initialRetirementBalance: number,
): DeterministicProjection {
  const inputs = normalizeAgeInputs(rawInputs);
  const data: ChartDataPoint[] = [];
  let depletedBeforeTarget = false;
  let depletionAge: number | undefined;
  let guardrailAdjustmentMonths = 0;

  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : STRATEGIES[inputs.investmentStrategy];
  const monthlyReturn = Math.pow(1 + retirementStrategy.expectedReturn, 1 / 12) - 1;

  let balance = Math.max(0, initialRetirementBalance);
  const retirementStartBalance = balance;

  const endAge = getEndAge(inputs);
  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  for (let age = inputs.retirementAge; age <= endAge; age++) {
    // The supplied starting balance already includes deposits received at retirement.
    if (age > inputs.retirementAge) balance += depositsAtAge(inputs, age);

    data.push({ age, balance: Math.max(0, balance) });
    if (age === endAge) break;

    const cashFlow = getRetirementCashFlow(inputs, age);

    for (let month = 0; month < 12; month++) {
      const monthIndexFromRetirement = (age - inputs.retirementAge) * 12 + month;
      const remainingMonths = Math.max(
        1,
        totalMonthsFromRetirement - monthIndexFromRetirement,
      );

      const withdrawalFromPortfolio = applySpendingRule(inputs, {
        age,
        monthIndexFromRetirement,
        remainingMonths,
        portfolioBalance: balance,
        retirementStartBalance,
        baselinePortfolioWithdrawal: cashFlow.requestedPortfolioWithdrawal,
        assumedMonthlyReturn: monthlyReturn,
      });

      if (
        inputs.spendingRule === 'guardrails' &&
        Math.abs(withdrawalFromPortfolio - cashFlow.requestedPortfolioWithdrawal) > 0.01
      ) {
        guardrailAdjustmentMonths++;
      }

      const balanceBeforeWithdrawal = balance * (1 + monthlyReturn);
      balance = balanceBeforeWithdrawal - withdrawalFromPortfolio;

      if (balance <= 0) {
        const depletedBeforeFinalMonth =
          monthIndexFromRetirement < totalMonthsFromRetirement - 1;
        const couldNotFundWithdrawal =
          withdrawalFromPortfolio > balanceBeforeWithdrawal + 0.01;

        balance = 0;
        if (depletedBeforeFinalMonth || couldNotFundWithdrawal) {
          depletedBeforeTarget = true;
          depletionAge ??= age + (month + 1) / 12;
        }
      }
    }
  }

  return {
    chartData: data,
    depletedBeforeTarget,
    depletionAge,
    planEndBalance: data.at(-1)?.balance ?? balance,
    guardrailAdjustmentMonths,
  };
}

function generateProjectionDetails(
  inputs: CalculatorInputs,
  retirementBalance?: number,
): DeterministicProjection {
  if (retirementBalance !== undefined) {
    return simulateDeterministicRetirement(inputs, retirementBalance);
  }

  const accumulation = projectToRetirement(inputs);
  const retirement = simulateDeterministicRetirement(
    inputs,
    accumulation.retirementBalance,
  );

  return {
    ...retirement,
    chartData: [
      ...accumulation.chartData.slice(0, -1),
      ...retirement.chartData,
    ],
  };
}

function assessTarget(inputs: CalculatorInputs, outcome: DeterministicProjection) {
  if (outcome.depletedBeforeTarget) return 'depleted' as const;
  const ending = outcome.chartData.at(-1)?.balance ?? 0;
  return evaluatePlanPathSuccess(inputs, {
    endingBalance: ending,
    depletedBeforePlanEnd: outcome.depletedBeforeTarget,
  })
    ? 'met' as const : 'buffer-short' as const;
}

function calculateSustainableMonthlySpending(inputs: CalculatorInputs): number | undefined {
  const fitsTarget = (monthlyExpenses: number) => {
    const outcome = generateProjectionDetails({
      ...inputs,
      monthlyExpenses,
      monteCarloEnabled: false,
    });
    return evaluatePlanPathSuccess(inputs, {
      endingBalance: outcome.chartData.at(-1)?.balance ?? 0,
      depletedBeforePlanEnd: outcome.depletedBeforeTarget,
    });
  };

  if (!fitsTarget(0)) return 0;

  let low = 0;
  let high = Math.max(1000, inputs.monthlyExpenses ?? 0);
  const maxSearchSpending = 1000000;

  while (high < maxSearchSpending && fitsTarget(high)) {
    low = high;
    high = Math.min(maxSearchSpending, high * 2);
  }

  for (let iteration = 0; iteration < 45; iteration++) {
    const midpoint = (low + high) / 2;
    if (fitsTarget(midpoint)) low = midpoint;
    else high = midpoint;
  }

  // Whole dollars can be copied into the spending input without rounding up
  // beyond the calculated limit.
  return Math.floor(low);
}

// ------------------------------
// Required savings + projected at retirement
// ------------------------------

export function solveRequiredSavings(
  rawInputs: CalculatorInputs,
  options: RequiredSavingsSolverOptions = {},
): RequiredSavingsSolution {
  const inputs = normalizeAgeInputs(rawInputs);
  const maximumBalance = Math.max(
    0,
    options.maximumBalance ?? REQUIRED_SAVINGS_SOLVER_DEFAULTS.maximumBalance,
  );
  const convergenceTolerance = Math.max(
    Number.EPSILON,
    options.convergenceTolerance ?? REQUIRED_SAVINGS_SOLVER_DEFAULTS.convergenceTolerance,
  );
  const maximumIterations = Math.max(
    1,
    Math.floor(options.maximumIterations ?? REQUIRED_SAVINGS_SOLVER_DEFAULTS.maximumIterations),
  );

  const fits = (balance: number) => {
    const outcome = simulateDeterministicRetirement(inputs, balance);
    return evaluatePlanPathSuccess(inputs, {
      endingBalance: outcome.planEndBalance,
      depletedBeforePlanEnd: outcome.depletedBeforeTarget,
    });
  };

  if (fits(0)) {
    return {
      requiredSavings: 0,
      status: 'solved',
      iterations: 0,
      convergenceTolerance,
      maximumBalance,
    };
  }

  let low = 0;
  let high = Math.min(maximumBalance, 1_000_000);

  while (high < maximumBalance && !fits(high)) {
    low = high;
    high = Math.min(maximumBalance, Math.max(high * 2, high + 1));
  }

  if (!fits(high)) {
    return {
      requiredSavings: maximumBalance,
      status: 'no-solution',
      iterations: 0,
      convergenceTolerance,
      maximumBalance,
    };
  }

  let iterations = 0;
  while (high - low > convergenceTolerance && iterations < maximumIterations) {
    const midpoint = (low + high) / 2;
    if (fits(midpoint)) high = midpoint;
    else low = midpoint;
    iterations++;
  }

  return {
    requiredSavings: high,
    status: 'solved',
    iterations,
    convergenceTolerance,
    maximumBalance,
  };
}

function calculateRequiredSavings(inputs: CalculatorInputs): number {
  return solveRequiredSavings(inputs).requiredSavings;
}

function calculateProjectedAtRetirement(inputs: CalculatorInputs): number {
  return projectToRetirement(inputs).retirementBalance;
}

// ------------------------------
// Checkpoints
// ------------------------------

function getCheckpointAges(inputs: CalculatorInputs): number[] {
  const ages = new Set<number>();
  const endAge = getEndAge(inputs);

  ages.add(inputs.retirementAge);
  ages.add(62);
  ages.add(65);
  ages.add(70);

  if (inputs.ssEnabled) ages.add(inputs.ssClaimAge);

  // Plan end anchor
  ages.add(endAge);

  const step = inputs.retirementAge < 55 ? 5 : 10;
  for (let age = inputs.retirementAge + step; age <= endAge; age += step) {
    ages.add(age);
  }

  const minCheckpointAge = Math.max(inputs.currentAge, inputs.retirementAge);

  return Array.from(ages)
    .filter(age => age >= minCheckpointAge && age <= endAge)
    .sort((a, b) => a - b);
}

function labelForAge(inputs: CalculatorInputs, age: number): string {
  const endAge = getEndAge(inputs);
  const labels: string[] = [];

  if (age === inputs.retirementAge) labels.push('At Retirement');
  if (inputs.ssEnabled && age === inputs.ssClaimAge) labels.push('At SS Claim');
  if (age === 62) labels.push('SS Eligible');
  if (age === 65) labels.push('Medicare Age');
  if (age === 70) labels.push('Age 70');

  if (age === endAge) {
    labels.push(inputs.spendingRule === 'die_with_zero' ? 'Plan End (DWZ Target)' : 'Longevity Check');
  }

  return labels.length ? labels.join(' / ') : `At Age ${age}`;
}

function generateCheckpoints(inputs: CalculatorInputs, chartData: ChartDataPoint[], targetStatus?: CalculatorResults['targetStatus']): IncomeCheckpoint[] {
  const ages = getCheckpointAges(inputs);
  const endAge = getEndAge(inputs);
  const depletionAge = chartData.find(
    point => point.age >= inputs.retirementAge && point.balance < 1
  )?.age;
  const depletesBeforeTarget = depletionAge !== undefined && depletionAge < endAge;

  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : STRATEGIES[inputs.investmentStrategy];

  // Use same assumed monthly return for DWZ card math consistency
  const assumedMonthlyReturn = Math.pow(1 + retirementStrategy.expectedReturn, 1 / 12) - 1;

  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  return ages.map(age => {
  const dataPoint = chartData.find(d => d.age === age);
  const balance = dataPoint?.balance ?? 0;

  const cashFlow = getRetirementCashFlow(inputs, age);
  const monthlyNeed = cashFlow.monthlyExpenses;
  const ssIncome = cashFlow.ssIncome;
  const otherIncome = cashFlow.otherIncome;
  const baselinePortfolioWithdrawal = cashFlow.requestedPortfolioWithdrawal;

  const retirementStartBalance =
    chartData.find(d => d.age === inputs.retirementAge)?.balance ?? balance;

  const monthIndexFromRetirement = (age - inputs.retirementAge) * 12;
  const remainingMonths = Math.max(1, totalMonthsFromRetirement - monthIndexFromRetirement);

  const requestedFromPortfolio = applySpendingRule(inputs, {
    age,
    monthIndexFromRetirement,
    remainingMonths,
    portfolioBalance: balance,
    retirementStartBalance,
    baselinePortfolioWithdrawal,
    assumedMonthlyReturn
  });

  const isPlanEnd = inputs.spendingRule === 'die_with_zero' && age === endAge;
  const fromPortfolio = balance < 1 ? 0 : requestedFromPortfolio;
  const spendingGap = Math.max(0, monthlyNeed - (ssIncome + otherIncome + fromPortfolio));

  const annualBaselineWithdrawal = baselinePortfolioWithdrawal * 12;
  const annualActualWithdrawal = fromPortfolio * 12;

  const targetWithdrawalRate =
    retirementStartBalance > 0
      ? annualBaselineWithdrawal / retirementStartBalance
      : (annualBaselineWithdrawal > 0 ? Infinity : 0);

  const currentBaselineWithdrawalRate =
    balance > 0
      ? annualBaselineWithdrawal / balance
      : (annualBaselineWithdrawal > 0 ? Infinity : 0);

  const actualWithdrawalRate =
    balance > 0
      ? annualActualWithdrawal / balance
      : (annualActualWithdrawal > 0 ? Infinity : 0);

  let status: 'good' | 'warn' | 'bad' = 'good';
  let lowerGuardrailRate: number | undefined;
  let upperGuardrailRate: number | undefined;
  let guardrailAction: 'raise' | 'cut' | 'none' = 'none';

  if (inputs.spendingRule === 'guardrails') {
    const g = inputs.guardrails ?? {
      lowerBand: 0.75,
      upperBand: 1.15,
      cutPct: 0.10,
      raisePct: 0.10
    };

    lowerGuardrailRate = targetWithdrawalRate * g.lowerBand;
    upperGuardrailRate = targetWithdrawalRate * g.upperBand;

    if (currentBaselineWithdrawalRate > upperGuardrailRate) {
      guardrailAction = 'cut';
      status = 'bad';
    } else if (currentBaselineWithdrawalRate < lowerGuardrailRate) {
      guardrailAction = 'raise';
      status = 'good';
    } else {
      guardrailAction = 'none';
      status = 'warn';
    }
  } else if (inputs.spendingRule === 'die_with_zero') {
    status = targetStatus ? (targetStatus === 'met' ? 'good' : targetStatus === 'buffer-short' ? 'warn' : 'bad') : depletesBeforeTarget
      ? 'bad'
      : (isPlanEnd && balance >= 1 ? 'warn' : 'good');
  } else {
    const yearsPast70 = Math.max(0, age - 70);
    const warnThreshold = Math.min(0.10, 0.04 + yearsPast70 * 0.001);
    const badThreshold = Math.min(0.12, 0.06 + yearsPast70 * 0.001);

    if (actualWithdrawalRate >= badThreshold) status = 'bad';
    else if (actualWithdrawalRate >= warnThreshold) status = 'warn';
  }

  if (balance < 1 && spendingGap > 0.5 && !isPlanEnd) status = 'bad';

  return {
    age,
    label: labelForAge(inputs, age),
    monthlyNeed,
    ssIncome,
    otherIncome,
    fromPortfolio,
    spendingGap,
    portfolioBalance: balance,
    withdrawalRate: actualWithdrawalRate,
    stressLevel: status,
    isPlanEnd,
    targetStatus: isPlanEnd ? targetStatus : undefined,
    targetWithdrawalRate,
    currentBaselineWithdrawalRate,
    lowerGuardrailRate,
    upperGuardrailRate,
    guardrailAction
  };
});
}
// ------------------------------
// Guidance
// ------------------------------

export function generateGuidance(rawInputs: CalculatorInputs, results: CalculatorResults): GuidanceItem[] {
  const inputs = normalizeAgeInputs(rawInputs);
  const items: GuidanceItem[] = [];

  if (results.isOnTrack) {
    items.push({
      type: 'success',
      title: "You're on track! 🎉",
      description: `You're projected to have $${Math.round(results.gap).toLocaleString()} more than needed at retirement.`
    });
  } else {
    const gap = Math.abs(results.gap);
    const yearsToRetirement = inputs.retirementAge - inputs.currentAge;

    const strategy = STRATEGIES[inputs.investmentStrategy];
    const monthlyRate = Math.pow(1 + strategy.expectedReturn, 1 / 12) - 1;
    const months = yearsToRetirement * 12;

    const additionalMonthly = Math.max(0,
      monthlyRate <= 0
        ? gap / Math.max(1, months)
        : (gap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
    );

    items.push({
      type: 'savings',
      title: 'Increase monthly savings',
      description: `Save an additional $${Math.round(additionalMonthly).toLocaleString()}/month to close the gap.`,
      value: `+$${Math.round(additionalMonthly).toLocaleString()}/mo`
    });

    let targetAge = inputs.retirementAge;
    for (let age = inputs.retirementAge + 1; age <= 75; age++) {
      const testInputs = { ...inputs, retirementAge: age };
      const projected = calculateProjectedAtRetirement(testInputs);
      const required = calculateRequiredSavings(testInputs);
      if (projected >= required) {
        targetAge = age;
        break;
      }
    }

    if (targetAge > inputs.retirementAge && targetAge <= 75) {
      items.push({
        type: 'retire-later',
        title: 'Delay retirement',
        description: `Working until age ${targetAge} would help you reach your goal.`,
        value: `Age ${targetAge}`
      });
    }

    const enteredMonthlySpending = Math.max(0, inputs.monthlyExpenses ?? 0);
    const projectionSupportedMonthly = Math.max(
      0,
      results.sustainableMonthlySpending ?? 0,
    );
    const practicalMonthlyIncrement = 100;
    const roundedSupportedMonthly = Math.floor(
      projectionSupportedMonthly / practicalMonthlyIncrement,
    ) * practicalMonthlyIncrement;
    const enteredAnnualSpending = Math.round(enteredMonthlySpending * 12 / 100) * 100;
    const supportedAnnualSpending = roundedSupportedMonthly * 12;
    const annualReduction = Math.max(0, enteredAnnualSpending - supportedAnnualSpending);

    if (annualReduction > 0) {
      items.push({
        type: 'expenses',
        title: 'Test a lower spending plan',
        description: `Entered spending is $${enteredAnnualSpending.toLocaleString()}/year. This monthly projection supports about $${supportedAnnualSpending.toLocaleString()}/year, an estimated reduction of $${annualReduction.toLocaleString()}/year based on your selected assumptions.`,
        value: `≈$${supportedAnnualSpending.toLocaleString()}/yr`
      });
    }
  }

  return items;
}

// ------------------------------
// Monte Carlo
// ------------------------------

const MONTE_CARLO_RUNS = 1000;

interface MonteCarloResult {
  chartData: ChartDataPoint[];
  successProbability: number;
  requiredForSuccess: number;
}

interface SimulatedPath {
  balances: number[];
  depletedBeforePlanEnd: boolean;
}

export interface CalculationOptions {
  random?: () => number;
}

function randomStandardNormal(random: () => number): number {
  const u1 = random();
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleLognormalMonthlyReturn(
  muMonthlyLog: number,
  sigmaMonthly: number,
  random: () => number,
): number {
  const z = randomStandardNormal(random);
  const logReturn = (muMonthlyLog - 0.5 * sigmaMonthly * sigmaMonthly) + sigmaMonthly * z;
  return Math.exp(logReturn) - 1;
}

function simulatePath(
  inputs: CalculatorInputs,
  startingBalance: number,
  random: () => number,
): SimulatedPath {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : strategy;

  const stockVol = 0.18;
  const bondVol = 0.05;

  let balance = startingBalance;
  let monthlyContrib = (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);
  const balances: number[] = [];
  let depletedBeforePlanEnd = false;

  let retirementStartBalance = 0;

  const endAge = getEndAge(inputs);
  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  for (let age = inputs.currentAge; age <= endAge; age++) {
    const deposits = (inputs.oneTimeDeposits ?? [])
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + (d.amount ?? 0), 0);
    balance += deposits;

    balances.push(Math.max(0, balance));

    const currentStrategy = age < inputs.retirementAge ? strategy : retirementStrategy;
    const stockAlloc = currentStrategy.stockAllocation;
    const bondAlloc = currentStrategy.bondAllocation;

    const annualVol = Math.sqrt(stockAlloc ** 2 * stockVol ** 2 + bondAlloc ** 2 * bondVol ** 2);
    const sigmaMonthly = annualVol / Math.sqrt(12);
    const muMonthlyLog = Math.log(1 + currentStrategy.expectedReturn) / 12;

    if (age < inputs.retirementAge) {
      for (let month = 0; month < 12; month++) {
        const monthlyReturn = sampleLognormalMonthlyReturn(muMonthlyLog, sigmaMonthly, random);
        balance = balance * (1 + monthlyReturn) + monthlyContrib;
      }

      if (inputs.annualIncreaseEnabled) {
        monthlyContrib *= 1 + (inputs.annualIncreaseRate ?? 0) / 100;
      }
    } else {
      const cashFlow = getRetirementCashFlow(inputs, age);

      if (retirementStartBalance === 0) retirementStartBalance = balance;

      // Use expected return (not the sampled one) as the amortization assumption
      const assumedMonthlyReturn = Math.pow(1 + retirementStrategy.expectedReturn, 1 / 12) - 1;

      for (let month = 0; month < 12; month++) {
        const monthIndexFromRetirement = (age - inputs.retirementAge) * 12 + month;
        const remainingMonths = Math.max(1, totalMonthsFromRetirement - monthIndexFromRetirement);

        const withdrawalFromPortfolio = applySpendingRule(inputs, {
          age,
          monthIndexFromRetirement,
          remainingMonths,
          portfolioBalance: balance,
          retirementStartBalance,
          baselinePortfolioWithdrawal: cashFlow.requestedPortfolioWithdrawal,
          assumedMonthlyReturn
        });

        const monthlyReturn = sampleLognormalMonthlyReturn(muMonthlyLog, sigmaMonthly, random);
        const balanceBeforeWithdrawal = balance * (1 + monthlyReturn);
        balance = balanceBeforeWithdrawal - withdrawalFromPortfolio;
        if (balance <= 0) {
          balance = 0;
          if (
            monthIndexFromRetirement < totalMonthsFromRetirement - 1 ||
            withdrawalFromPortfolio > balanceBeforeWithdrawal + 0.01
          ) {
            depletedBeforePlanEnd = true;
          }
        }
      }
    }
  }

  return { balances, depletedBeforePlanEnd };
}

function runMonteCarlo(inputs: CalculatorInputs, random: () => number): MonteCarloResult {
  const endAge = getEndAge(inputs);

  const ages: number[] = [];
  for (let age = inputs.currentAge; age <= endAge; age++) ages.push(age);

  const allPaths: SimulatedPath[] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    allPaths.push(simulatePath(inputs, inputs.currentSavings ?? 0, random));
  }

  const chartData: ChartDataPoint[] = ages.map((age, idx) => {
    const balancesAtAge = allPaths.map(path => path.balances[idx] ?? 0).sort((a, b) => a - b);
    return {
      age,
      balance: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.5)],
      p10: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.1)],
      p25: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.25)],
      p50: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.5)],
      p75: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.75)],
      p90: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.9)]
    };
  });

  const successCount = allPaths.filter(path => evaluatePlanPathSuccess(inputs, {
    endingBalance: path.balances.at(-1) ?? 0,
    depletedBeforePlanEnd: path.depletedBeforePlanEnd,
  })).length;
  const successProbability = successCount / MONTE_CARLO_RUNS;

  let low = (inputs.currentSavings ?? 0) * 0.5;
  let high = (inputs.currentSavings ?? 0) * 3;
  let requiredForSuccess = inputs.currentSavings ?? 0;

  for (let iter = 0; iter < 10; iter++) {
    const mid = (low + high) / 2;
    let successes = 0;

    for (let i = 0; i < 200; i++) {
      const path = simulatePath(inputs, mid, random);
      if (evaluatePlanPathSuccess(inputs, {
        endingBalance: path.balances.at(-1) ?? 0,
        depletedBeforePlanEnd: path.depletedBeforePlanEnd,
      })) successes++;
    }

    if (successes / 200 >= 0.85) {
      requiredForSuccess = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  return { chartData, successProbability, requiredForSuccess };
}

// ------------------------------
// Main
// ------------------------------

export function calculateRetirement(
  rawInputs: CalculatorInputs,
  options: CalculationOptions = {},
): CalculatorResults {
  const inputs = normalizeAgeInputs(rawInputs);

  const accumulation = projectToRetirement(inputs);
  const projectedAtRetirement = accumulation.retirementBalance;
  const deterministicRetirement = simulateDeterministicRetirement(
    inputs,
    projectedAtRetirement,
  );
  const deterministicProjection: DeterministicProjection = {
    ...deterministicRetirement,
    chartData: [
      ...accumulation.chartData.slice(0, -1),
      ...deterministicRetirement.chartData,
    ],
  };

  const requiredSavingsSolution = solveRequiredSavings(inputs);
  const requiredSavings = requiredSavingsSolution.requiredSavings;
  const rawGap = projectedAtRetirement - requiredSavings;
  const gap = Math.abs(rawGap) <= requiredSavingsSolution.convergenceTolerance
    ? 0
    : rawGap;
  const deterministicFunded = evaluatePlanPathSuccess(inputs, {
    endingBalance: deterministicRetirement.planEndBalance,
    depletedBeforePlanEnd: deterministicRetirement.depletedBeforeTarget,
  });
  const isOnTrack = requiredSavingsSolution.status === 'solved'
    && deterministicFunded
    && gap >= 0;

  let chartData: ChartDataPoint[];
  let successProbability: number | undefined;

  if (inputs.monteCarloEnabled) {
    const mcResult = runMonteCarlo(inputs, options.random ?? Math.random);
    chartData = mcResult.chartData;
    successProbability = mcResult.successProbability;
  } else {
    chartData = deterministicProjection.chartData;
  }

  const targetStatus = inputs.spendingRule === 'die_with_zero' && !inputs.monteCarloEnabled
    ? assessTarget(inputs, deterministicProjection) : undefined;
  const checkpoints = generateCheckpoints(inputs, chartData, targetStatus);
  const sustainableMonthlySpending = gap < 0 || inputs.spendingRule === 'die_with_zero'
    ? calculateSustainableMonthlySpending(inputs)
    : undefined;

  return {
    requiredSavings,
    projectedAtRetirement,
    gap,
    isOnTrack,
    chartData,
    checkpoints,
    successProbability,
    sustainableMonthlySpending,
    targetStatus,
    planEndAge: getEndAge(inputs),
    requiredEndingBalance: getRequiredEndingBalance(inputs),
    deterministicFunded,
    planEndBalance: deterministicRetirement.planEndBalance,
    depletionAge: deterministicRetirement.depletionAge,
    requiredSavingsStatus: requiredSavingsSolution.status,
  };
}
