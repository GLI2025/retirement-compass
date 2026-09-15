import { CalculatorInputs } from '@/types/calculator';

export const DEFAULT_LIFE_EXPECTANCY = 90;

export const DEFAULT_INFLATION_RATE = 3.0;

export const DEFAULT_INPUTS: CalculatorInputs = {
  // Ages
  currentAge: 45,
  retirementAge: 67,

  // Spending (today’s dollars)
  monthlyExpenses: 4600,

  // Savings (≈10–12% combined for many earners)
  currentSavings: 75000,
  monthlyContribution: 800,
  employerContribution: 200,

  // Returns: realistic, believable
  investmentStrategy: 'balanced', // 6% nominal

  // Inflation
  inflationEnabled: true,
  inflationRate: DEFAULT_INFLATION_RATE,
  applyInflationToSS: true,

  // Contribution growth (OFF by default)
  annualIncreaseEnabled: false,
  annualIncreaseRate: 1,

  // Retirement glidepath (OFF by default)
  retirementStrategyEnabled: false,
  retirementStrategy: 'moderate',

  // Social Security (ON by default)
  ssEnabled: true,
  ssClaimAge: 67,
  ssMonthlyBenefit: 2000,

  // Housing Details (OFF by default)
  housePayoffEnabled: false,
  housingPlan: 'own',
  housePayoffAge: 65,
  currentMortgagePayment: 2000,
  monthlyRent: 2000,
  // Starts at the inflation default, then moves independently of it.
  rentGrowthRate: DEFAULT_INFLATION_RATE,

  // Other income / deposits
  otherIncome: [],
  oneTimeDeposits: [],

  // Spending strategy (simple, understandable)
  spendingRule: 'fixed',

  // Advanced
  monteCarloEnabled: false,
};
