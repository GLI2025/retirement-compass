import { CalculatorInputs } from '@/types/calculator';

export const DEFAULT_LIFE_EXPECTANCY = 90;

export const DEFAULT_INPUTS: CalculatorInputs = {
  currentAge: 45,
  retirementAge: 67,

  // Spending (today’s dollars)
  monthlyExpenses: 4600,

  // Starting savings + contributions
  currentSavings: 50000,
  monthlyContribution: 800,
  employerContribution: 200,

  // Returns via strategy (balanced = 6% nominal in your STRATEGIES)
  investmentStrategy: 'balanced',

  // Inflation
  inflationEnabled: true,
  inflationRate: 3.0,
  applyInflationToSS: true,

  // Contribution growth (off by default)
  annualIncreaseEnabled: false,
  annualIncreaseRate: 1,

  // Retirement glidepath (off by default)
  retirementStrategyEnabled: false,
  retirementStrategy: 'moderate',

  // Social Security (ON by default)
  ssEnabled: true,
  ssClaimAge: 67,
  ssMonthlyBenefit: 2000,

  // Mortgage payoff toggle (off)
  housePayoffEnabled: false,
  housePayoffAge: 65,
  currentMortgagePayment: 2000,

  // Other inputs
  otherIncome: [],
  oneTimeDeposits: [],

  // Spending rule (simple default)
  spendingRule: 'fixed',

  // Advanced options
  monteCarloEnabled: false,
};
