import { CalculatorInputs } from '@/types/calculator';

export const DEFAULT_INPUTS: CalculatorInputs = {
  // Ages
  currentAge: 45,
  retirementAge: 67,
  lifeExpectancy: 90,

  // Market assumptions (nominal)
  expectedReturn: 0.065,
  inflationRate: 0.03,

  // Savings
  savingsRate: 0.10,

  // Spending
  monthlySpending: 4600,
  applyLifestyleIncrease: false,

  // Social Security
  ssEnabled: true,
  ssClaimAge: 67,
  applyInflationToSS: true,

  // Strategy
  spendingRule: 'fixed',
};
