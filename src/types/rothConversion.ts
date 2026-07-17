export type FilingStatus = 'S' | 'MFJ' | 'MFS' | 'HOH' | 'QW';
export type DeductionType = 'standard' | 'itemized';
export type StateTaxMode = 'none' | 'flat';

export interface ItemizedDeductions {
  salt: number;
  mortInt: number;
  charity: number;
  medical: number;
  other: number;
}

export interface RothConversionInputs {
  filing: FilingStatus;
  dependents: number;
  age1: number;
  age2: number;
  state: string;
  stateMode: StateTaxMode;
  stateRate: number; // percent, e.g. 4.4
  hhSize: number; // for ACA %FPL

  onACA: boolean;
  onMedicare: boolean;

  wages: number;
  intOrd: number;
  divQ: number;
  divO: number;
  cgST: number;
  cgLT: number;
  rental: number;
  intEx: number;
  ssGross: number;

  aboveLine: number;
  dedType: DeductionType;
  itemized: ItemizedDeductions;

  iraTotal: number;
  iraBasis: number;
  conversion: number;
  marginalStep: number; // "granular what-if" last $N
}

export interface ScenarioResult {
  agi: number;
  magi: number;
  ordinaryTaxable: number;
  ordinaryTax: number;
  ltcgTax: number;
  niit: number;
  stateTax: number;
  totalTax: number;
  ssTax: number;
  ltcgIncome: number;
  aca: { label: string; risk: string; pctFPL: number };
  irmaa: { tier: string; index?: number };
}

export interface ProRataResult {
  taxable: number;
  nontaxable: number;
  newBasis: number;
}

export interface RothConversionResults {
  baseline: ScenarioResult;
  withConversion: ScenarioResult;
  proRata: ProRataResult;
  deltaTotal: number;
  effectiveMarginalOnStep: number;
  alerts: string[];
  bracketFillBaselinePct: number;
  bracketFillWithConversionPct: number;
}
