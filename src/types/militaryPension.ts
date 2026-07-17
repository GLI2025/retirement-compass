export type MilitaryBranch = 'army' | 'navy' | 'airforce' | 'marines' | 'uscg' | 'spaceforce';
export type PayPlan = 'enl' | 'warr' | 'off';
export type RetirementPlanType = 'final' | 'redux' | 'brs' | 'disab';
export type DisabilityBase = 'final' | 'brs';

export interface MilitaryPensionInputs {
  branch: MilitaryBranch | null;
  payplan: PayPlan;
  grade: string;
  yos: number;
  finalPayOverride: number | null; // null = use auto-filled DFAS value
  plan: RetirementPlanType;
  disabilityPct: number;
  disabilityBase: DisabilityBase;
}

export interface MilitaryPensionResults {
  finalPay: number;
  multiplierPct: number; // e.g. 0.50 for 50%
  monthly: number;
  annual: number;
  explain: string;
}
