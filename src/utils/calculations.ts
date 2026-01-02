import { 
  CalculatorInputs, 
  CalculatorResults, 
  ChartDataPoint, 
  IncomeCheckpoint,
  GuidanceItem,
  STRATEGIES 
} from '@/types/calculator';

const LIFE_EXPECTANCY = 95;
const SAFE_WITHDRAWAL_RATE = 0.04;

// Calculate future value with compound growth
function futureValue(
  presentValue: number,
  monthlyContribution: number,
  annualRate: number,
  years: number,
  annualIncreaseRate: number = 0
): number {
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  let balance = presentValue;
  let contribution = monthlyContribution;
  
  for (let year = 0; year < years; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + contribution;
    }
    contribution = contribution * (1 + annualIncreaseRate);
  }
  
  return balance;
}

// Calculate present value of retirement needs
function presentValueOfRetirementNeeds(
  annualExpenses: number,
  retirementYears: number,
  withdrawalRate: number,
  inflationRate: number
): number {
  // Simplified calculation using inflation-adjusted withdrawal rate
  const realRate = withdrawalRate - inflationRate;
  if (realRate <= 0) {
    return annualExpenses * retirementYears;
  }
  
  // PV of annuity formula
  const pv = annualExpenses * ((1 - Math.pow(1 + realRate, -retirementYears)) / realRate);
  return pv;
}

// Calculate SS income at a given age
// Returns nominal dollars if COLA is enabled (grows with inflation from currentAge)
function calculateSSIncome(
  inputs: CalculatorInputs,
  age: number
): number {
  if (!inputs.whatIfEnabled || age < inputs.ssClaimAge) {
    return 0;
  }
  
  let ssBenefit = inputs.ssMonthlyBenefit;
  
  // Apply COLA: SS grows with inflation every year after currentAge once claiming starts
  if (inputs.applyInflationToSS && inputs.inflationEnabled) {
    // Grow from currentAge to current age (continuous COLA, not just to claim age)
    const yearsOfCOLA = age - inputs.currentAge;
    ssBenefit = ssBenefit * Math.pow(1 + inputs.inflationRate / 100, yearsOfCOLA);
  }
  
  return ssBenefit;
}

// Calculate other income at a given age
function calculateOtherIncome(
  inputs: CalculatorInputs,
  age: number
): number {
  return inputs.otherIncome.reduce((total, income) => {
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

// Calculate monthly expenses at a given age
function calculateMonthlyExpenses(
  inputs: CalculatorInputs,
  age: number
): number {
  let expenses = inputs.monthlyExpenses;
  
  // Apply inflation
  if (inputs.inflationEnabled) {
    const yearsFromNow = age - inputs.currentAge;
    expenses = expenses * Math.pow(1 + inputs.inflationRate / 100, yearsFromNow);
  }
  
  // Subtract mortgage if paid off
  if (inputs.whatIfEnabled && inputs.housePayoffEnabled && age >= inputs.housePayoffAge) {
    expenses -= inputs.currentMortgagePayment;
  }
  
  return Math.max(0, expenses);
}

// Generate portfolio projection data
function generateProjection(inputs: CalculatorInputs): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const retirementStrategy = inputs.retirementStrategyEnabled 
    ? STRATEGIES[inputs.retirementStrategy] 
    : strategy;
  
  let balance = inputs.currentSavings;
  let monthlyContrib = inputs.monthlyContribution + inputs.employerContribution;
  
  for (let age = inputs.currentAge; age <= LIFE_EXPECTANCY; age++) {
    // Add one-time deposits received at this age
    const deposits = inputs.oneTimeDeposits
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
        monthlyContrib = monthlyContrib * (1 + inputs.annualIncreaseRate / 100);
      }
    } else {
      // Retirement phase - withdrawals
      const annualReturn = retirementStrategy.expectedReturn;
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
      
      const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
      const ssIncome = calculateSSIncome(inputs, age);
      const otherIncome = calculateOtherIncome(inputs, age);
      const monthlyWithdrawal = Math.max(0, monthlyExpenses - ssIncome - otherIncome);
      
      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + monthlyReturn) - monthlyWithdrawal;
        if (balance < 0) balance = 0;
      }
    }
  }
  
  return data;
}

// Calculate required savings at retirement
// Uses nominal cashflows (inflated expenses, SS with COLA) discounted at nominal rate
function calculateRequiredSavings(inputs: CalculatorInputs): number {
  const retirementYears = LIFE_EXPECTANCY - inputs.retirementAge;
  const retirementStrategy = inputs.retirementStrategyEnabled 
    ? STRATEGIES[inputs.retirementStrategy] 
    : STRATEGIES[inputs.investmentStrategy];
  
  // Nominal discount rate (no inflation subtraction - cashflows are already nominal)
  const nominalRate = retirementStrategy.expectedReturn;
  
  // Sum PV of each year's net expenses in nominal terms
  let totalPV = 0;
  for (let year = 0; year < retirementYears; year++) {
    const age = inputs.retirementAge + year;
    // These are already nominal (inflated) values
    const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
    const ssIncome = calculateSSIncome(inputs, age);
    const otherIncome = calculateOtherIncome(inputs, age);
    const annualNetExpenses = Math.max(0, monthlyExpenses - ssIncome - otherIncome) * 12;
    
    // Discount nominal cashflow at nominal rate back to retirement age
    totalPV += annualNetExpenses / Math.pow(1 + nominalRate, year);
  }
  
  return totalPV;
}

// Calculate projected savings at retirement
// One-time deposits are added at their received age and grown only once via simulation
function calculateProjectedAtRetirement(inputs: CalculatorInputs): number {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const monthlyRate = Math.pow(1 + strategy.expectedReturn, 1 / 12) - 1;
  
  let balance = inputs.currentSavings;
  let monthlyContrib = inputs.monthlyContribution + inputs.employerContribution;
  
  for (let age = inputs.currentAge; age < inputs.retirementAge; age++) {
    // Add one-time deposits received at this age (before growth for the year)
    const deposits = inputs.oneTimeDeposits
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + d.amount, 0);
    balance += deposits;
    
    // Grow for 12 months
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyContrib;
    }
    
    // Annual contribution increase
    if (inputs.annualIncreaseEnabled) {
      monthlyContrib = monthlyContrib * (1 + inputs.annualIncreaseRate / 100);
    }
  }
  
  // Add deposits received exactly at retirement age (no growth)
  const retirementDeposits = inputs.oneTimeDeposits
    .filter(d => d.ageReceived === inputs.retirementAge)
    .reduce((sum, d) => sum + d.amount, 0);
  balance += retirementDeposits;
  
  return balance;
}

// Generate income checkpoints
function generateCheckpoints(
  inputs: CalculatorInputs,
  chartData: ChartDataPoint[]
): IncomeCheckpoint[] {
  const checkpoints: IncomeCheckpoint[] = [];
  const ages = [inputs.retirementAge, inputs.ssClaimAge, 70];
  const labels = ['At Retirement', 'At SS Claim', 'At Age 70'];
  
  ages.forEach((age, index) => {
    if (age >= inputs.currentAge && age <= LIFE_EXPECTANCY) {
      const dataPoint = chartData.find(d => d.age === age);
      const balance = dataPoint?.balance || 0;
      
      const monthlyNeed = calculateMonthlyExpenses(inputs, age);
      const ssIncome = calculateSSIncome(inputs, age);
      const otherIncome = calculateOtherIncome(inputs, age);
      const fromPortfolio = Math.max(0, monthlyNeed - ssIncome - otherIncome);
      
      // Calculate withdrawal rate
      const annualWithdrawal = fromPortfolio * 12;
      const withdrawalRate = balance > 0 ? annualWithdrawal / balance : 1;
      
      let status: 'good' | 'warn' | 'bad' = 'good';
      if (withdrawalRate > 0.06) {
        status = 'bad';
      } else if (withdrawalRate > 0.04) {
        status = 'warn';
      }
      
      checkpoints.push({
        age,
        label: labels[index],
        monthlyNeed,
        ssIncome,
        otherIncome,
        fromPortfolio,
        portfolioBalance: balance,
        status
      });
    }
  });
  
  return checkpoints;
}

// Generate guidance recommendations
export function generateGuidance(
  inputs: CalculatorInputs,
  results: CalculatorResults
): GuidanceItem[] {
  const items: GuidanceItem[] = [];
  
  if (results.isOnTrack) {
    items.push({
      type: 'success',
      title: 'You\'re on track! 🎉',
      description: `You're projected to have $${Math.round(results.gap).toLocaleString()} more than needed at retirement.`
    });
  } else {
    const gap = Math.abs(results.gap);
    const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
    
    // Additional monthly savings needed
    const strategy = STRATEGIES[inputs.investmentStrategy];
    const monthlyRate = strategy.expectedReturn / 12;
    const months = yearsToRetirement * 12;
    const additionalMonthly = (gap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
    
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
    
    // Reduce expenses
    const expenseReduction = (gap / (yearsToRetirement * 12 + (LIFE_EXPECTANCY - inputs.retirementAge) * 12)) * 12;
    const percentReduction = (expenseReduction / (inputs.monthlyExpenses * 12)) * 100;
    
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

// Monte Carlo simulation
const MONTE_CARLO_RUNS = 1000;

interface MonteCarloResult {
  chartData: ChartDataPoint[];
  successProbability: number;
  requiredForSuccess: number;
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

// Simulate a single Monte Carlo path
function simulatePath(
  inputs: CalculatorInputs,
  startingBalance: number
): number[] {
  const strategy = STRATEGIES[inputs.investmentStrategy];
  const retirementStrategy = inputs.retirementStrategyEnabled
    ? STRATEGIES[inputs.retirementStrategy]
    : strategy;

  // Annual volatility based on stock/bond allocation
  const stockVol = 0.18; // ~18% annual volatility for stocks
  const bondVol = 0.05;  // ~5% for bonds

  let balance = startingBalance;
  let monthlyContrib = inputs.monthlyContribution + inputs.employerContribution;
  const balances: number[] = [];

  for (let age = inputs.currentAge; age <= LIFE_EXPECTANCY; age++) {
    // Add one-time deposits
    const deposits = inputs.oneTimeDeposits
      .filter(d => d.ageReceived === age)
      .reduce((sum, d) => sum + d.amount, 0);
    balance += deposits;

    balances.push(Math.max(0, balance));

    const currentStrategy = age < inputs.retirementAge ? strategy : retirementStrategy;
    const stockAlloc = currentStrategy.stockAllocation;
    const bondAlloc = currentStrategy.bondAllocation;

    // Simulate monthly returns with volatility
    const annualVol = Math.sqrt(stockAlloc ** 2 * stockVol ** 2 + bondAlloc ** 2 * bondVol ** 2);
    const monthlyVol = annualVol / Math.sqrt(12);
    const expectedMonthlyReturn = Math.pow(1 + currentStrategy.expectedReturn, 1 / 12) - 1;

    if (age < inputs.retirementAge) {
      // Accumulation phase
      for (let month = 0; month < 12; month++) {
        const monthlyReturn = randomNormal(expectedMonthlyReturn, monthlyVol);
        balance = balance * (1 + monthlyReturn) + monthlyContrib;
      }
      if (inputs.annualIncreaseEnabled) {
        monthlyContrib *= 1 + inputs.annualIncreaseRate / 100;
      }
    } else {
      // Retirement phase - withdrawals
      const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
      const ssIncome = calculateSSIncome(inputs, age);
      const otherIncome = calculateOtherIncome(inputs, age);
      const monthlyWithdrawal = Math.max(0, monthlyExpenses - ssIncome - otherIncome);

      for (let month = 0; month < 12; month++) {
        const monthlyReturn = randomNormal(expectedMonthlyReturn, monthlyVol);
        balance = balance * (1 + monthlyReturn) - monthlyWithdrawal;
        if (balance < 0) balance = 0;
      }
    }
  }

  return balances;
}

// Run Monte Carlo simulation
function runMonteCarlo(inputs: CalculatorInputs): MonteCarloResult {
  const ages = [];
  for (let age = inputs.currentAge; age <= LIFE_EXPECTANCY; age++) {
    ages.push(age);
  }

  // Run all simulations
  const allPaths: number[][] = [];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    allPaths.push(simulatePath(inputs, inputs.currentSavings));
  }

  // Calculate percentiles at each age
  const chartData: ChartDataPoint[] = ages.map((age, idx) => {
    const balancesAtAge = allPaths.map(path => path[idx]).sort((a, b) => a - b);
    
    return {
      age,
      balance: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.5)], // Median
      p10: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.1)],
      p25: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.25)],
      p50: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.5)],
      p75: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.75)],
      p90: balancesAtAge[Math.floor(MONTE_CARLO_RUNS * 0.9)],
    };
  });

  // Calculate success probability (balance > 0 at life expectancy)
  const finalBalances = allPaths.map(path => path[path.length - 1]);
  const successCount = finalBalances.filter(b => b > 0).length;
  const successProbability = successCount / MONTE_CARLO_RUNS;

  // Find required savings for 85% success (binary search)
  let low = inputs.currentSavings * 0.5;
  let high = inputs.currentSavings * 3;
  let requiredForSuccess = inputs.currentSavings;

  for (let iter = 0; iter < 10; iter++) {
    const mid = (low + high) / 2;
    let successes = 0;
    
    for (let i = 0; i < 200; i++) { // Quick check with fewer runs
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

// Main calculation function
export function calculateRetirement(inputs: CalculatorInputs): CalculatorResults {
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
