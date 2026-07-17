export type PathKey = 'A' | 'B' | 'C';
export type LoanType = 'none' | 'heloc' | 'boat' | 'both' | 'other';
export type InsuranceType = 'fixed' | 'percent';

export interface PathState {
  loan: LoanType;
  remoteWork: boolean;
  remoteIncome: number;
  regret: number;
  yearsToSave?: number; // Path B only
  retirementAge?: number; // Path C only
}

export interface BoatLoanParams {
  price: number;
  downPercent: number;
  rate: number;
  termMonths: number;
  insuranceBump: number;
  insuranceType: InsuranceType;
  insurancePercent: number;
  depreciation: { immediatePct: number; annualPct: number };
}

export interface HelocLoanParams {
  available: number;
  drawAmount: number;
  rate: number;
  ioMonths: number;
  amortMonths: number;
  boatPrice: number;
}

export interface OtherLoanParams {
  principal: number;
  rate: number;
  termMonths: number;
}

export interface SailAwayGlobalInputs {
  userAge: number;
  partnerAge: number | null;
  liquidSavings: number;
  investablePortfolio: number;
  monthlyLandCost: number;
  annualIncome: number;
  savingsRate: number;
  passiveIncome: number;
  sailingBasePreset: number;
  sailingAdjustment: number;
  inflationRate: number;
  investmentReturn: number;
  stressTestEnabled: boolean;
  incomeVolatility: number;
  stressRandomize: boolean;
  stressSeed: number;
  costUncertainty: number;
}

export interface SailAwayInputs {
  global: SailAwayGlobalInputs;
  paths: Record<PathKey, PathState>;
  loanParams: {
    boat: BoatLoanParams;
    heloc: HelocLoanParams;
    other: OtherLoanParams;
  };
  stress: { shockYears: number; shockCostBumpPct: number };
}

export interface YearlyRow {
  year: number;
  startCash: number;
  growth: number;
  burn: number;
  endCash: number;
}

export interface PathSimResult {
  departureCash: number;
  runwayYears: number;
  pnrYears: number;
  finalCash: number;
  yearlyRows: YearlyRow[];
  boatValue: number;
  loanBalanceAtEnd: number;
  boatEquity: number;
}

export interface PathBothResults {
  base: PathSimResult;
  stress: PathSimResult;
}
