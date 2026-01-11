// Investment strategy definitions
export type InvestmentStrategy =
  | 'conservative'
  | 'moderate'
  | 'balanced'
  | 'growth'
  | 'aggressive';

export interface StrategyInfo {
  name: string;
  expectedReturn: number;
  stockAllocation: number;
  bondAllocation: number;
  description: string;
}

export const STRATEGIES: Record<InvestmentStrategy, StrategyInfo> = {
  conservative: {
    name: 'Conservative',
    expectedReturn: 0.04,
    stockAllocation: 0.20,
    bondAllocation: 0.80,
    description: '20% stocks, 80% bonds - Lower risk, steadier returns'
  },
  moderate: {
    name: 'Moderate',
    expectedReturn: 0.05,
    stockAllocation: 0.40,
    bondAllocation: 0.60,
    description: '40% stocks, 60% bonds - Balanced approach'
  },
  balanced: {
    name: 'Balanced',
    expectedReturn: 0.06,
    stockAllocation: 0.60,
    bondAllocation: 0.40,
    description: '60% stocks, 40% bonds - Traditional retirement mix'
  },
  growth: {
    name: 'Growth',
    expectedReturn: 0.07,
    stockAllocation: 0.80,
    bondAllocation: 0.20,
    description: '80% stocks, 20% bonds - Higher growth potential'
  },
  aggressive: {
    name: 'Aggressive',
    expectedReturn: 0.08,
    stockAllocation: 0.95,
    bondAllocation: 0.05,
    description: '95% stocks, 5% bonds - Maximum growth, higher volatility'
  }
};

// Other income source
export interface OtherIncome {
  id: string;
  label: string;
  monthlyAmount: number;
  startAge: number;
  endAge?: number;
  hasCola: boolean;
}

// One-time deposit
export interface OneTimeDeposit {
  id: string;
  type: 'bonus' | 'proceeds' | 'inheritance' | 'other';
  label?: string;
  amount: number;
  ageReceived: number;
}

// Spending rules
export type SpendingRule = 'fixed' | 'guardrails' | 'die_with_zero';

export interface GuardrailsConfig {
  lowerBand: number; // e.g. 0.8
  upperBand: number; // e.g. 1.2
  cutPct: number;    // e.g. 0.10
  raisePct: number;  // e.g. 0.10
}

export interface DieWithZeroConfig {
  targetAge: number; // e.g. 95
}



// Main calculator inputs
export interface CalculatorInputs {
  currentAge: number;
  retirementAge: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlyContribution: number;
  employerContribution: number;
  investmentStrategy: InvestmentStrategy;

  inflationEnabled: boolean;
  inflationRate: number;
  applyInflationToSS: boolean;

  annualIncreaseEnabled: boolean;
  annualIncreaseRate: number;

  retirementStrategyEnabled: boolean;
  retirementStrategy: InvestmentStrategy;

  ssEnabled: boolean;
  ssClaimAge: number;
  ssMonthlyBenefit: number;
  housePayoffEnabled: boolean;
  housePayoffAge: number;
  currentMortgagePayment: number;

  otherIncome: OtherIncome[];
  oneTimeDeposits: OneTimeDeposit[];

  spendingRule: SpendingRule;
  guardrails?: GuardrailsConfig;
  dieWithZero?: DieWithZeroConfig;

  monteCarloEnabled: boolean;
}

// Chart data point
export interface ChartDataPoint {
  age: number;
  balance: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
}

// Income checkpoint
export interface IncomeCheckpoint {
  age: number;
  label: string;
  monthlyNeed: number;
  ssIncome: number;
  otherIncome: number;
  fromPortfolio: number;
  portfolioBalance: number;
  withdrawalRate: number;
  stressLevel: 'good' | 'warn' | 'bad';
}

// Calculation results
export interface CalculatorResults {
  requiredSavings: number;
  projectedAtRetirement: number;
  gap: number;
  isOnTrack: boolean;
  chartData: ChartDataPoint[];
  checkpoints: IncomeCheckpoint[];
  successProbability?: number;
}

// Guidance recommendation
export interface GuidanceItem {
  type: 'savings' | 'retire-later' | 'return' | 'expenses' | 'success';
  title: string;
  description: string;
  value?: string;
}


