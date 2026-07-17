export type PeriodsPerYear = 12 | 24 | 26 | 52;

export interface SavingsCalculatorInputs {
  start: number;
  salary: number;
  empPct: number;
  matchRate: number; // e.g. 50 means "50% match"
  matchCap: number; // e.g. 6 means "match up to 6% of salary"
  returnPct: number;
  raisePct: number;
  years: number;
  periodsPerYear: PeriodsPerYear;
}

export interface YearlySnapshot {
  year: number;
  endingBalance: number;
  salary: number;
  employeeContribThisYear: number;
  employerMatchThisYear: number;
}

export interface SavingsCalculatorResults {
  finalBalance: number;
  totalEmployeeContrib: number;
  totalEmployerMatch: number;
  totalContributions: number;
  totalGrowth: number;
  yearly: YearlySnapshot[];
}
