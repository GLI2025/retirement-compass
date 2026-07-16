import {
  CalculatorInputs,
  CalculatorResults,
  ChartDataPoint,
  IncomeCheckpoint,
  GuidanceItem,
  STRATEGIES
} from '@/types/calculator';

import { applySpendingRule } from '@/lib/calculations/spendingRules';
import { DEFAULT_INPUTS, DEFAULT_LIFE_EXPECTANCY } from '@/lib/defaults';

const LIFE_EXPECTANCY = DEFAULT_LIFE_EXPECTANCY;

// Safety cap so DWZ can't run to absurd ages by accident
const MAX_END_AGE = 120;

// ------------------------------
// Helpers
// ------------------------------

function getEndAge(inputs: CalculatorInputs): number {
  // Default plan end is LIFE_EXPECTANCY
  if (inputs.spendingRule !== 'die_with_zero') return LIFE_EXPECTANCY;

  // DWZ should use the user's targetAge as the plan end (even if > LIFE_EXPECTANCY)
  const targetAge = inputs.dieWithZero?.targetAge ?? LIFE_EXPECTANCY;

  // Clamp to [currentAge, MAX_END_AGE]
  return Math.max(inputs.currentAge, Math.min(targetAge, MAX_END_AGE));
}

// SS benefit input is assumed to be in "today's dollars" (real).
// If inflation + COLA are enabled, we convert it to nominal dollars at each future age
// so it stays comparable to inflated expenses.
function calculateSSIncome(inputs: CalculatorInputs, age: number): number {
  if (!inputs.ssEnabled || age < inputs.ssClaimAge) return 0;

  let ssBenefit = inputs.ssMonthlyBenefit ?? 0;

  if (inputs.applyInflationToSS && inputs.inflationEnabled) {
    const yearsOfCOLA = Math.max(0, age - inputs.currentAge);
    ssBenefit = ssBenefit * Math.pow(1 + (inputs.inflationRate ?? 0) / 100, yearsOfCOLA);
  }

  return ssBenefit;
}

function calculateOtherIncome(inputs: CalculatorInputs, age: number): number {
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

function calculateMonthlyExpenses(inputs: CalculatorInputs, age: number): number {
  // Fixed-rate mortgage is nominal (does NOT inflate). Lifestyle expenses inflate.

  const baseExpenses = inputs.monthlyExpenses ?? 0;
  const mortgage = inputs.currentMortgagePayment ?? 0;

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

// ------------------------------
// Deterministic projection
// ------------------------------

function generateProjection(inputs: CalculatorInputs): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];

  const strategy = STRATEGIES[inputs.investmentStrategy];
  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : strategy;

  let balance = inputs.currentSavings ?? 0;
  let monthlyContrib = (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);
  let retirementStartBalance = 0;

  const endAge = getEndAge(inputs);
  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  for (let age = inputs.currentAge; age <= endAge; age++) {
    const deposits = (inputs.oneTimeDeposits ?? [])
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + (d.amount ?? 0), 0);
    balance += deposits;

    data.push({ age, balance: Math.max(0, balance) });

    if (age < inputs.retirementAge) {
      const annualReturn = strategy.expectedReturn;
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + monthlyReturn) + monthlyContrib;
      }

      if (inputs.annualIncreaseEnabled) {
        monthlyContrib = monthlyContrib * (1 + (inputs.annualIncreaseRate ?? 0) / 100);
      }
    } else {
      if (retirementStartBalance === 0) retirementStartBalance = balance;

      const annualReturn = retirementStrategy.expectedReturn;
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

      const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
      const ssIncome = calculateSSIncome(inputs, age);
      const otherIncome = calculateOtherIncome(inputs, age);

      const baselinePortfolioWithdrawal = Math.max(0, monthlyExpenses - (ssIncome + otherIncome));

      for (let month = 0; month < 12; month++) {
        const monthIndexFromRetirement = (age - inputs.retirementAge) * 12 + month;
        const remainingMonths = Math.max(1, totalMonthsFromRetirement - monthIndexFromRetirement);

        const withdrawalFromPortfolio = applySpendingRule(inputs, {
          age,
          monthIndexFromRetirement,
          remainingMonths,
          portfolioBalance: balance,
          retirementStartBalance,
          baselinePortfolioWithdrawal,
          assumedMonthlyReturn: monthlyReturn
        });

        balance = balance * (1 + monthlyReturn) - withdrawalFromPortfolio;
        if (balance < 0) balance = 0;
      }
    }
  }

  return data;
}

// ------------------------------
// Required savings + projected at retirement
// ------------------------------

function calculateRequiredSavings(inputs: CalculatorInputs): number {
  const endAge = getEndAge(inputs);
  const retirementYears = Math.max(0, endAge - inputs.retirementAge);

  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : STRATEGIES[inputs.investmentStrategy];

  const nominalRate = retirementStrategy.expectedReturn;

  let totalPV = 0;
  for (let year = 0; year < retirementYears; year++) {
    const age = inputs.retirementAge + year;

    const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
    const ssIncome = calculateSSIncome(inputs, age);
    const otherIncome = calculateOtherIncome(inputs, age);

    const annualNetExpenses = Math.max(0, monthlyExpenses - ssIncome - otherIncome) * 12;
    totalPV += annualNetExpenses / Math.pow(1 + nominalRate, year);
  }

  return totalPV;
}

function calculateProjectedAtRetirement(inputs: CalculatorInputs): number {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const monthlyRate = Math.pow(1 + strategy.expectedReturn, 1 / 12) - 1;

  let balance = inputs.currentSavings ?? 0;
  let monthlyContrib = (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);

  for (let age = inputs.currentAge; age < inputs.retirementAge; age++) {
    const deposits = (inputs.oneTimeDeposits ?? [])
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + (d.amount ?? 0), 0);
    balance += deposits;

    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyContrib;
    }

    if (inputs.annualIncreaseEnabled) {
      monthlyContrib *= 1 + (inputs.annualIncreaseRate ?? 0) / 100;
    }
  }

  const retirementDeposits = (inputs.oneTimeDeposits ?? [])
    .filter(d => d.ageReceived === inputs.retirementAge)
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  balance += retirementDeposits;

  return balance;
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

function generateCheckpoints(inputs: CalculatorInputs, chartData: ChartDataPoint[]): IncomeCheckpoint[] {
  const ages = getCheckpointAges(inputs);
  const endAge = getEndAge(inputs);

  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : STRATEGIES[inputs.investmentStrategy];

  // Use same assumed monthly return for DWZ card math consistency
  const assumedMonthlyReturn = Math.pow(1 + retirementStrategy.expectedReturn, 1 / 12) - 1;

  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  return ages.map(age => {
  const dataPoint = chartData.find(d => d.age === age);
  const balance = dataPoint?.balance ?? 0;

  const monthlyNeed = calculateMonthlyExpenses(inputs, age);
  const ssIncome = calculateSSIncome(inputs, age);
  const otherIncome = calculateOtherIncome(inputs, age);

  const baselinePortfolioWithdrawal = Math.max(0, monthlyNeed - ssIncome - otherIncome);

  const retirementStartBalance =
    chartData.find(d => d.age === inputs.retirementAge)?.balance ?? balance;

  const monthIndexFromRetirement = (age - inputs.retirementAge) * 12;
  const remainingMonths = Math.max(1, totalMonthsFromRetirement - monthIndexFromRetirement);

  const fromPortfolio = applySpendingRule(inputs, {
    age,
    monthIndexFromRetirement,
    remainingMonths,
    portfolioBalance: balance,
    retirementStartBalance,
    baselinePortfolioWithdrawal,
    assumedMonthlyReturn
  });

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
    status = 'good';
  } else {
    const yearsPast70 = Math.max(0, age - 70);
    const warnThreshold = Math.min(0.10, 0.04 + yearsPast70 * 0.001);
    const badThreshold = Math.min(0.12, 0.06 + yearsPast70 * 0.001);

    if (actualWithdrawalRate >= badThreshold) status = 'bad';
    else if (actualWithdrawalRate >= warnThreshold) status = 'warn';
  }

  return {
    age,
    label: labelForAge(inputs, age),
    monthlyNeed,
    ssIncome,
    otherIncome,
    fromPortfolio,
    portfolioBalance: balance,
    withdrawalRate: actualWithdrawalRate,
    stressLevel: status,
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
  const inputs: CalculatorInputs = { ...DEFAULT_INPUTS, ...rawInputs };
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

    const additionalMonthly =
      monthlyRate <= 0
        ? gap / Math.max(1, months)
        : (gap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);

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

    const endAge = getEndAge(inputs);
    const yearsInPlan = Math.max(1, (inputs.retirementAge - inputs.currentAge) + (endAge - inputs.retirementAge));
    const expenseReduction = (gap / (yearsInPlan * 12)) * 12;
    const percentReduction = (expenseReduction / ((inputs.monthlyExpenses ?? 0) * 12)) * 100;

    if (percentReduction < 50) {
      items.push({
        type: 'expenses',
        title: 'Reduce expenses',
        description: `Cutting expenses by ${Math.round(percentReduction)}% would help close the gap.`,
        value: `-${Math.round(percentReduction)}%`
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

function randomStandardNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleLognormalMonthlyReturn(muMonthlyLog: number, sigmaMonthly: number): number {
  const z = randomStandardNormal();
  const logReturn = (muMonthlyLog - 0.5 * sigmaMonthly * sigmaMonthly) + sigmaMonthly * z;
  return Math.exp(logReturn) - 1;
}

function simulatePath(inputs: CalculatorInputs, startingBalance: number): number[] {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : strategy;

  const stockVol = 0.18;
  const bondVol = 0.05;

  let balance = startingBalance;
  let monthlyContrib = (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);
  const balances: number[] = [];

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
        const monthlyReturn = sampleLognormalMonthlyReturn(muMonthlyLog, sigmaMonthly);
        balance = balance * (1 + monthlyReturn) + monthlyContrib;
      }

      if (inputs.annualIncreaseEnabled) {
        monthlyContrib *= 1 + (inputs.annualIncreaseRate ?? 0) / 100;
      }
    } else {
      const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
      const ssIncome = calculateSSIncome(inputs, age);
      const otherIncome = calculateOtherIncome(inputs, age);
      const baselinePortfolioWithdrawal = Math.max(0, monthlyExpenses - (ssIncome + otherIncome));

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
          baselinePortfolioWithdrawal,
          assumedMonthlyReturn
        });

        const monthlyReturn = sampleLognormalMonthlyReturn(muMonthlyLog, sigmaMonthly);
        balance = balance * (1 + monthlyReturn) - withdrawalFromPortfolio;
        if (balance < 0) balance = 0;
      }
    }
  }

  return balances;
}

function runMonteCarlo(inputs: CalculatorInputs): MonteCarloResult {
  const endAge = getEndAge(inputs);

  const ages: number[] = [];
  for (let age = inputs.currentAge; age <= endAge; age++) ages.push(age);

  const allPaths: number[][] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    allPaths.push(simulatePath(inputs, inputs.currentSavings ?? 0));
  }

  const chartData: ChartDataPoint[] = ages.map((age, idx) => {
    const balancesAtAge = allPaths.map(path => path[idx] ?? 0).sort((a, b) => a - b);
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

  const finalBalances = allPaths.map(path => path[path.length - 1] ?? 0);
  const successCount = finalBalances.filter(b => b > 0).length;
  const successProbability = successCount / MONTE_CARLO_RUNS;

  let low = (inputs.currentSavings ?? 0) * 0.5;
  let high = (inputs.currentSavings ?? 0) * 3;
  let requiredForSuccess = inputs.currentSavings ?? 0;

  for (let iter = 0; iter < 10; iter++) {
    const mid = (low + high) / 2;
    let successes = 0;

    for (let i = 0; i < 200; i++) {
      const path = simulatePath(inputs, mid);
      if ((path[path.length - 1] ?? 0) > 0) successes++;
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

export function calculateRetirement(rawInputs: CalculatorInputs): CalculatorResults {
  const inputs: CalculatorInputs = {
    ...DEFAULT_INPUTS,
    ...rawInputs
  };

  const requiredSavings = calculateRequiredSavings(inputs);
  const projectedAtRetirement = calculateProjectedAtRetirement(inputs);
  const gap = projectedAtRetirement - requiredSavings;
  const isOnTrack = gap >= 0;

  let chartData: ChartDataPoint[];
  let successProbability: number | undefined;

  if (inputs.monteCarloEnabled) {
    const mcResult = runMonteCarlo(inputs);
    chartData = mcResult.chartData;
    successProbability = mcResult.successProbability;
  } else {
    chartData = generateProjection(inputs);
  }

  const checkpoints = generateCheckpoints(inputs, chartData);

  return {
    requiredSavings,
    projectedAtRetirement,
    gap,
    isOnTrack,
    chartData,
    checkpoints,
    successProbability
  };
}
