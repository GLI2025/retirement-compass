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
  const monthlyRate = annualRate / 12;
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
function calculateSSIncome(
  inputs: CalculatorInputs,
  age: number
): number {
  if (!inputs.whatIfEnabled || age < inputs.ssClaimAge) {
    return 0;
  }
  
  let ssBenefit = inputs.ssMonthlyBenefit;
  
  // Apply COLA if enabled
  if (inputs.applyInflationToSS && inputs.inflationEnabled) {
    const yearsFromNow = inputs.ssClaimAge - inputs.currentAge;
    ssBenefit = ssBenefit * Math.pow(1 + inputs.inflationRate / 100, yearsFromNow);
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
      const monthlyReturn = annualReturn / 12;
      
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
      const monthlyReturn = annualReturn / 12;
      
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
function calculateRequiredSavings(inputs: CalculatorInputs): number {
  const retirementYears = LIFE_EXPECTANCY - inputs.retirementAge;
  const retirementStrategy = inputs.retirementStrategyEnabled 
    ? STRATEGIES[inputs.retirementStrategy] 
    : STRATEGIES[inputs.investmentStrategy];
  
  // Calculate average annual expenses in retirement (inflation-adjusted)
  let totalExpenses = 0;
  for (let year = 0; year < retirementYears; year++) {
    const age = inputs.retirementAge + year;
    const monthlyExpenses = calculateMonthlyExpenses(inputs, age);
    const ssIncome = calculateSSIncome(inputs, age);
    const otherIncome = calculateOtherIncome(inputs, age);
    const netExpenses = Math.max(0, monthlyExpenses - ssIncome - otherIncome) * 12;
    
    // Discount back to retirement age
    const discountRate = retirementStrategy.expectedReturn - (inputs.inflationEnabled ? inputs.inflationRate / 100 : 0);
    totalExpenses += netExpenses / Math.pow(1 + Math.max(0.01, discountRate), year);
  }
  
  return totalExpenses;
}

// Calculate projected savings at retirement
function calculateProjectedAtRetirement(inputs: CalculatorInputs): number {
  const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
  const strategy = STRATEGIES[inputs.investmentStrategy];
  
  // Start with current savings
  let balance = inputs.currentSavings;
  let monthlyContrib = inputs.monthlyContribution + inputs.employerContribution;
  
  // Add one-time deposits and their growth
  for (const deposit of inputs.oneTimeDeposits) {
    if (deposit.ageReceived <= inputs.retirementAge) {
      const yearsToGrow = inputs.retirementAge - deposit.ageReceived;
      const grownAmount = deposit.amount * Math.pow(1 + strategy.expectedReturn, yearsToGrow);
      balance += grownAmount;
    }
  }
  
  // Calculate future value with contributions
  return futureValue(
    balance,
    monthlyContrib,
    strategy.expectedReturn,
    yearsToRetirement,
    inputs.annualIncreaseEnabled ? inputs.annualIncreaseRate / 100 : 0
  );
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

// Main calculation function
export function calculateRetirement(inputs: CalculatorInputs): CalculatorResults {
  const requiredSavings = calculateRequiredSavings(inputs);
  const projectedAtRetirement = calculateProjectedAtRetirement(inputs);
  const gap = projectedAtRetirement - requiredSavings;
  const isOnTrack = gap >= 0;
  
  const chartData = generateProjection(inputs);
  const checkpoints = generateCheckpoints(inputs, chartData);
  
  return {
    requiredSavings,
    projectedAtRetirement,
    gap,
    isOnTrack,
    chartData,
    checkpoints
  };
}
