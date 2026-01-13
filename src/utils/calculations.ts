import {
  CalculatorInputs,
  CalculatorResults,
  ChartDataPoint,
  IncomeCheckpoint,
  GuidanceItem,
  STRATEGIES
} from '@/types/calculator';

import { applySpendingRule } from '@/lib/calculations/spendingRules';

// 🔧 NEW: import canonical defaults
import { DEFAULT_INPUTS, DEFAULT_LIFE_EXPECTANCY } from '@/lib/defaults';

const LIFE_EXPECTANCY = DEFAULT_LIFE_EXPECTANCY;

// ------------------------------
// Helpers
// ------------------------------

function getEndAge(inputs: CalculatorInputs): number {
  const targetAge = inputs.dieWithZero?.targetAge ?? LIFE_EXPECTANCY;
  return inputs.spendingRule === 'die_with_zero'
    ? Math.min(targetAge, LIFE_EXPECTANCY)
    : LIFE_EXPECTANCY;
}

// Calculate SS income at a given age
// SS benefit input is assumed to be in "today's dollars" (real).
// If inflation + COLA are enabled, we convert it to nominal dollars at each future age
// so it stays comparable to inflated expenses.
// Returns nominal dollars if COLA is enabled (grows with inflation from currentAge)
function calculateSSIncome(inputs: CalculatorInputs, age: number): number {
  if (!inputs.ssEnabled || age < inputs.ssClaimAge) return 0;

  let ssBenefit = inputs.ssMonthlyBenefit;

  // Apply COLA: SS grows with inflation every year after currentAge once claiming starts
  if (inputs.applyInflationToSS && inputs.inflationEnabled) {
    const yearsOfCOLA = Math.max(0, age - inputs.currentAge);
    ssBenefit = ssBenefit * Math.pow(1 + inputs.inflationRate / 100, yearsOfCOLA);
  }

  return ssBenefit;
}

// Calculate other income at a given age
function calculateOtherIncome(inputs: CalculatorInputs, age: number): number {
  const list = inputs.otherIncome ?? [];
  return list.reduce((total, income) => {
    if (age >= income.startAge && (!income.endAge || age <= income.endAge)) {
      let amount = income.monthlyAmount;
      if (income.hasCola && inputs.inflationEnabled) {
        const yearsFromNow = Math.max(0, age - inputs.currentAge);
        amount = amount * Math.pow(1 + inputs.inflationRate / 100, yearsFromNow);
      }
      return total + amount;
    }
    return total;
  }, 0);
}

function calculateMonthlyExpenses(inputs: CalculatorInputs, age: number): number {
  // 1) Start with today's total expenses
  const baseExpenses = inputs.monthlyExpenses ?? 0;

  // 2) Separate the mortgage (which doesn't inflate) from the lifestyle costs (which do)
  const mortgage = inputs.currentMortgagePayment ?? 0;
  const lifestyleCosts = Math.max(0, baseExpenses - mortgage);

  // 3) Inflate lifestyle costs (if enabled)
  let totalExpenses = lifestyleCosts;
  if (inputs.inflationEnabled) {
    const yearsFromNow = Math.max(0, age - inputs.currentAge);
    totalExpenses =
      lifestyleCosts * Math.pow(1 + (inputs.inflationRate ?? 0) / 100, yearsFromNow);
  }

  // 4) Add mortgage back in ONLY if it's not paid off yet
  if (inputs.housePayoffEnabled) {
    if (age < inputs.housePayoffAge) totalExpenses += mortgage;
  } else {
    // If payoff isn't enabled, assume mortgage/rent continues forever
    totalExpenses += mortgage;
  }

  return Math.max(0, totalExpenses);
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

  let balance = inputs.currentSavings;
  let monthlyContrib = (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);
  let retirementStartBalance = 0;

  const endAge = getEndAge(inputs);
  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  for (let age = inputs.currentAge; age <= LIFE_EXPECTANCY; age++) {
    // Add one-time deposits received at this age
    const deposits = (inputs.oneTimeDeposits ?? [])
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + d.amount, 0);
    balance += deposits;

    data.push({ age, balance: Math.max(0, balance) });

    if (age < inputs.retirementAge) {
      // Accumulation phase
      const annualReturn = strategy.expectedReturn;
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + monthlyReturn) + monthlyContrib;
      }

      // Annual contribution increase
      if (inputs.annualIncreaseEnabled) {
        monthlyContrib = monthlyContrib * (1 + (inputs.annualIncreaseRate ?? 0) / 100);
      }
    } else {
      // Retirement phase - withdrawals
      if (retirementStartBalance === 0) retirementStartBalance = balance;

      const annualReturn = retirementStrategy.expectedReturn;
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

      const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
      const ssIncome = calculateSSIncome(inputs, age);
      const otherIncome = calculateOtherIncome(inputs, age);

      const baselinePortfolioWithdrawal = Math.max(0, monthlyExpenses - (ssIncome + otherIncome));

      for (let month = 0; month < 12; month++) {
        const monthIndexFromRetirement = (age - inputs.retirementAge) * 12 + month;

        // ✅ IMPORTANT FIX:
        // remainingMonths must be measured from RETIREMENT (not from current age),
        // because your spendingRules context is monthIndexFromRetirement-based.
        const remainingMonths = Math.max(
          1,
          totalMonthsFromRetirement - monthIndexFromRetirement
        );

        const withdrawalFromPortfolio = applySpendingRule(inputs, {
          age,
          monthIndexFromRetirement,
          remainingMonths,
          portfolioBalance: balance,
          retirementStartBalance,
          baselinePortfolioWithdrawal
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
  const retirementYears = LIFE_EXPECTANCY - inputs.retirementAge;

  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : STRATEGIES[inputs.investmentStrategy];

  // “We discount using expectedReturn. When inflation is enabled, cashflows are nominal.
  // When inflation is disabled, treat expectedReturn as a real return (today-dollar framework).”
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

// One-time deposits are added at their received age and grown only once via simulation
function calculateProjectedAtRetirement(inputs: CalculatorInputs): number {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const monthlyRate = Math.pow(1 + strategy.expectedReturn, 1 / 12) - 1;

  let balance = inputs.currentSavings;
  let monthlyContrib = (inputs.monthlyContribution ?? 0) + (inputs.employerContribution ?? 0);

  for (let age = inputs.currentAge; age < inputs.retirementAge; age++) {
    const deposits = (inputs.oneTimeDeposits ?? [])
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + d.amount, 0);
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
    .reduce((sum, d) => sum + d.amount, 0);
  balance += retirementDeposits;

  return balance;
}

// ------------------------------
// Checkpoints
// ------------------------------

function getCheckpointAges(inputs: CalculatorInputs): number[] {
  const ages = new Set<number>();

  // Anchors
  ages.add(inputs.retirementAge);
  ages.add(62);
  ages.add(65);
  ages.add(70);

  if (inputs.ssEnabled) ages.add(inputs.ssClaimAge);

  ages.add(LIFE_EXPECTANCY);

  // Spacing after retirement
  const step = inputs.retirementAge < 55 ? 5 : 10;
  for (let age = inputs.retirementAge + step; age <= LIFE_EXPECTANCY; age += step) {
    ages.add(age);
  }

  return Array.from(ages)
    .filter(age => age >= inputs.currentAge && age <= LIFE_EXPECTANCY)
    .sort((a, b) => a - b);
}

function labelForAge(inputs: CalculatorInputs, age: number): string {
  const labels: string[] = [];
  if (age === inputs.retirementAge) labels.push('At Retirement');
  if (inputs.ssEnabled && age === inputs.ssClaimAge) labels.push('At SS Claim');
  if (age === 62) labels.push('SS Eligible');
  if (age === 65) labels.push('Medicare Age');
  if (age === 70) labels.push('Age 70');
  if (age === LIFE_EXPECTANCY) labels.push('Longevity Check');
  return labels.length ? labels.join(' / ') : `At Age ${age}`;
}

function generateCheckpoints(
  inputs: CalculatorInputs,
  chartData: ChartDataPoint[]
): IncomeCheckpoint[] {
  const ages = getCheckpointAges(inputs);
  const endAge = getEndAge(inputs);
  const totalMonthsFromRetirement = Math.max(0, (endAge - inputs.retirementAge) * 12);

  return ages.map(age => {
    const dataPoint = chartData.find(d => d.age === age);
    const balance = dataPoint?.balance ?? 0;

    const monthlyNeed = calculateMonthlyExpenses(inputs, age);
    const ssIncome = calculateSSIncome(inputs, age);
    const otherIncome = calculateOtherIncome(inputs, age);

    const baselinePortfolioWithdrawal = Math.max(0, monthlyNeed - ssIncome - otherIncome);

    // Reference balance should be the portfolio at retirement in deterministic projection
    const retirementStartBalance =
      chartData.find(d => d.age === inputs.retirementAge)?.balance ?? balance;

    // ✅ FIX: no `month` or `endAge` undefined. Annual checkpoints treat month = 0.
    const monthIndexFromRetirement = (age - inputs.retirementAge) * 12;
    const remainingMonths = Math.max(1, totalMonthsFromRetirement - monthIndexFromRetirement);

    const fromPortfolio = applySpendingRule(inputs, {
      age,
      monthIndexFromRetirement,
      remainingMonths,
      portfolioBalance: balance,
      retirementStartBalance,
      baselinePortfolioWithdrawal
    });

    const annualWithdrawal = fromPortfolio * 12;

    const withdrawalRate =
      balance > 0 ? annualWithdrawal / balance : (annualWithdrawal > 0 ? 1 : 0);

    // Dynamic stress thresholds
    let status: 'good' | 'warn' | 'bad' = 'good';

    if (inputs.spendingRule === 'die_with_zero') {
      status = 'good';
    } else {
      const yearsPast70 = Math.max(0, age - 70);

      const warnThreshold = Math.min(0.10, 0.04 + yearsPast70 * 0.001);
      const badThreshold = Math.min(0.12, 0.06 + yearsPast70 * 0.001);

      if (withdrawalRate >= badThreshold) status = 'bad';
      else if (withdrawalRate >= warnThreshold) status = 'warn';
    }

    return {
      age,
      label: labelForAge(inputs, age),
      monthlyNeed,
      ssIncome,
      otherIncome,
      fromPortfolio,
      portfolioBalance: balance,
      withdrawalRate,
      stressLevel: status
    };
  });
}

// ------------------------------
// Guidance
// ------------------------------

export function generateGuidance(
  rawInputs: CalculatorInputs,
  results: CalculatorResults
): GuidanceItem[] {
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

    // Additional monthly savings needed
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

    // Work longer
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

    // Reduce expenses (rough heuristic)
    const expenseReduction =
      (gap /
        (yearsToRetirement * 12 + (LIFE_EXPECTANCY - inputs.retirementAge) * 12)) *
      12;
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
  const logReturn =
    (muMonthlyLog - 0.5 * sigmaMonthly * sigmaMonthly) + sigmaMonthly * z;
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

  for (let age = inputs.currentAge; age <= LIFE_EXPECTANCY; age++) {
    const deposits = (inputs.oneTimeDeposits ?? [])
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + d.amount, 0);
    balance += deposits;

    balances.push(Math.max(0, balance));

    const currentStrategy = age < inputs.retirementAge ? strategy : retirementStrategy;
    const stockAlloc = currentStrategy.stockAllocation;
    const bondAlloc = currentStrategy.bondAllocation;

    const annualVol = Math.sqrt(
      stockAlloc ** 2 * stockVol ** 2 + bondAlloc ** 2 * bondVol ** 2
    );
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
      const baselinePortfolioWithdrawal = Math.max(
        0,
        monthlyExpenses - (ssIncome + otherIncome)
      );

      if (retirementStartBalance === 0) retirementStartBalance = balance;

      for (let month = 0; month < 12; month++) {
        const monthIndexFromRetirement = (age - inputs.retirementAge) * 12 + month;

        const endAge = getEndAge(inputs);
        const totalMonthsFromRetirement = (endAge - inputs.retirementAge) * 12;
        const remainingMonths = Math.max(1, totalMonthsFromRetirement - monthIndexFromRetirement);

        const withdrawalFromPortfolio = applySpendingRule(inputs, {
          age,
          monthIndexFromRetirement,
          remainingMonths,
          portfolioBalance: balance,
          retirementStartBalance,
          baselinePortfolioWithdrawal
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
  const ages: number[] = [];
  for (let age = inputs.currentAge; age <= LIFE_EXPECTANCY; age++) ages.push(age);

  const allPaths: number[][] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    allPaths.push(simulatePath(inputs, inputs.currentSavings));
  }

  const chartData: ChartDataPoint[] = ages.map((age, idx) => {
    const balancesAtAge = allPaths.map(path => path[idx]).sort((a, b) => a - b);
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

  const finalBalances = allPaths.map(path => path[path.length - 1]);
  const successCount = finalBalances.filter(b => b > 0).length;
  const successProbability = successCount / MONTE_CARLO_RUNS;

  let low = inputs.currentSavings * 0.5;
  let high = inputs.currentSavings * 3;
  let requiredForSuccess = inputs.currentSavings;

  for (let iter = 0; iter < 10; iter++) {
    const mid = (low + high) / 2;
    let successes = 0;

    for (let i = 0; i < 200; i++) {
      const path = simulatePath(inputs, mid);
      if (path[path.length - 1] > 0) successes++;
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
  // 🔧 normalize inputs ONCE
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
