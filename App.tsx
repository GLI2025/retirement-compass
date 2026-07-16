export type GuardrailsEngine = 'total' | 'legacy';
export type GuardrailsMode = 'tune' | 'manual';

export interface IncomeStream {
  amt: number;
  start: number; // years into retirement
  colaNom: number; // nominal COLA, e.g. 0.025
}

export interface GuardrailsInputs {
  engine: GuardrailsEngine;
  mode: GuardrailsMode;
  byPercent: boolean; // manual mode: withdraw by % (true) or by $ (false)

  ageNow: number;
  ageRetire: number;
  ageEnd: number;
  ssAge: number;
  pensionAge: number;

  portfolio: number;
  inflation: number; // % nominal CPI, e.g. 3
  withdrawRatePct: number; // %, e.g. 3.5
  withdrawAmount: number; // $/yr

  pension: number;
  pensionCola: number; // % nominal
  ss: number;
  ssCola: number; // % nominal

  raisePct: number;
  applyGuardrails: boolean;
  seed: number | null;
  numSims: number;
}

export interface GuardrailsResults {
  pHat: number;
  ciL: number;
  ciU: number;
  startIncome: number;
  upperPV: number;
  lowerPV: number;
  upperIncome: number;
  lowerIncome: number;
  engine: GuardrailsEngine;
  mode: GuardrailsMode;
  P0: number;
  W0_port: number;
  impliedWR: number;
  upperNote: string;
  lowerNote: string;
  pNow: number;
  raiseNowIncome: number | null;
  raiseTargetPct: number;
  pvForRaise: number | null;
  incomeAtRaise: number | null;
  UPPER_TRIGGER: number;
  LOWER_TRIGGER: number;
  UPPER_RESET: number;
  LOWER_RESET: number;
  telemetry: {
    finalPV: { p10: number; p50: number; p90: number };
    maxDrawdown: { p10: number; p50: number; p90: number };
    pathVol: { p10: number; p50: number; p90: number };
  };
}
