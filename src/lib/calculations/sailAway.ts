import {
  SailAwayInputs, PathKey, PathState, PathSimResult, PathBothResults, YearlyRow,
} from '@/types/sailAway';

/**
 * Ported directly from the (restored, working) glassbridgepath.com/sailaway/
 * page source. Loan amortization formulas, boat depreciation curve, and the
 * stress-test model are transcribed exactly — do not alter without sign-off.
 */

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0);
}

// ===== Loan math =====
export function fixedMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const r = annualRate / 100 / 12;
  if (!r || termMonths <= 0) return principal / Math.max(termMonths, 1);
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

export function helocMonthlyPayment(
  principal: number, annualRate: number, month: number, ioMonths: number, amortMonths: number
): number {
  const r = annualRate / 100 / 12;
  if (month <= ioMonths) return principal * r;
  return (principal * r) / (1 - Math.pow(1 + r, -amortMonths));
}

export function fixedBalance(
  principal: number, annualRate: number, termMonths: number, monthsPaid: number
): number {
  const r = annualRate / 100 / 12;
  const pmt = fixedMonthlyPayment(principal, annualRate, termMonths);
  if (!r) return Math.max(0, principal - pmt * monthsPaid);
  if (monthsPaid >= termMonths) return 0;
  return Math.max(0, principal * Math.pow(1 + r, monthsPaid) - pmt * ((Math.pow(1 + r, monthsPaid) - 1) / r));
}

export function helocBalance(
  principal: number, annualRate: number, month: number, ioMonths: number, amortMonths: number
): number {
  const r = annualRate / 100 / 12;
  if (month <= ioMonths) return principal;
  const m = month - ioMonths;
  const pmt = helocMonthlyPayment(principal, annualRate, month, ioMonths, amortMonths);
  if (m >= amortMonths) return 0;
  return Math.max(0, principal * Math.pow(1 + r, m) - pmt * ((Math.pow(1 + r, m) - 1) / r));
}

export function boatValueAtMonths(
  purchasePrice: number, months: number, depreciation: { immediatePct: number; annualPct: number }
): number {
  const initial = purchasePrice * (1 - depreciation.immediatePct / 100);
  const yearly = 1 - depreciation.annualPct / 100;
  return initial * Math.pow(yearly, months / 12);
}

// ===== Stress model =====
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isStressShockYear(yearFromDeparture: number, stressEnabled: boolean, shockYears: number): boolean {
  if (!stressEnabled) return false;
  return yearFromDeparture < shockYears;
}

function getStressMultipliers(
  yearFromDeparture: number,
  applyStress: boolean,
  incomeVolatilityPct: number,
  costUncertaintyPct: number,
  randomize: boolean,
  seed: number
): { costMult: number; incomeMult: number } {
  const incomeVol = incomeVolatilityPct / 100;
  const costUnc = costUncertaintyPct / 100;
  if (!applyStress) return { costMult: 1, incomeMult: 1 };
  if (!randomize) return { costMult: 1 + costUnc, incomeMult: 1 - incomeVol };
  const rng = mulberry32(seed + yearFromDeparture);
  const swingC = (rng() * 2 - 1) * costUnc * 1.5;
  const swingI = (rng() * 2 - 1) * incomeVol * 1.5;
  const costMult = Math.max(0.5, 1 + swingC);
  const incomeMult = Math.max(0, 1 - swingI);
  return { costMult, incomeMult };
}

// ===== Timing =====
function getDepartureOffsetMonths(path: PathKey, userAge: number, pathB: PathState, pathC: PathState): number {
  if (path === 'A') return 0;
  if (path === 'B') return (pathB.yearsToSave || 5) * 12;
  if (path === 'C') {
    const retAge = pathC.retirementAge || 60;
    return Math.max(0, (retAge - userAge) * 12);
  }
  return 0;
}

function getActiveBoatPrice(path: PathKey, inputs: SailAwayInputs): number {
  const lt = inputs.paths[path].loan;
  if (lt === 'boat' || lt === 'both') return inputs.loanParams.boat.price || 0;
  if (lt === 'heloc') return inputs.loanParams.heloc.boatPrice || inputs.loanParams.boat.price || 0;
  return 0;
}

/** Core monthly cash-flow simulation for a single path (base or stress). */
export function simulateRunwayMonthly(path: PathKey, inputs: SailAwayInputs, useStress = false): PathSimResult {
  const g = inputs.global;
  const investReturn = (g.investmentReturn || 6) / 100;
  const infl = (g.inflationRate || 3) / 100;
  const rInvMonthly = investReturn / 12;

  const landMonthly = g.monthlyLandCost || 3000;
  const baseCushion = landMonthly * 6;
  const basePNRBuffer = landMonthly * 12;

  const sailingBase = (g.sailingBasePreset + g.sailingAdjustment) || 0;

  const liquid = g.liquidSavings || 0;
  const portfolio = g.investablePortfolio || 0;
  const annualIncome = g.annualIncome || 0;
  const savingsRate = (g.savingsRate || 0) / 100;
  const depOffset = getDepartureOffsetMonths(path, g.userAge, inputs.paths.B, inputs.paths.C);

  let startCash = liquid + portfolio;
  if (depOffset > 0) {
    const monthlySave = (annualIncome * savingsRate) / 12;
    for (let m = 1; m <= depOffset; m++) {
      startCash = startCash * (1 + rInvMonthly) + monthlySave;
    }
  }

  const loanType = inputs.paths[path].loan;
  const b = inputs.loanParams.boat;
  const h = inputs.loanParams.heloc;
  const o = inputs.loanParams.other;

  let boatPrincipal = 0, boatTerm = 0, boatRate = 0, boatInsuranceM = 0;
  let helocPrincipal = 0, helocRate = 0, helocIOM = 0, helocAmortM = 0;
  let otherPrincipal = 0, otherRate = 0, otherTerm = 0;

  const boatPrice = getActiveBoatPrice(path, inputs);

  if (loanType === 'boat' || loanType === 'both') {
    boatPrincipal = boatPrice * (1 - (b.downPercent || 0) / 100);
    boatTerm = b.termMonths || 0;
    boatRate = b.rate || 0;
    boatInsuranceM = b.insuranceType === 'percent'
      ? (boatPrice * (b.insurancePercent || 0)) / 100 / 12
      : b.insuranceBump || 0;
  }
  if (loanType === 'heloc' || loanType === 'both') {
    helocPrincipal = Math.max(0, h.drawAmount || 0);
    helocRate = h.rate || 0;
    helocIOM = h.ioMonths || 0;
    helocAmortM = h.amortMonths || 0;
  }
  if (loanType === 'other') {
    otherPrincipal = o.principal || 0;
    otherRate = o.rate || 0;
    otherTerm = o.termMonths || 0;
  }

  const applyStress = useStress || g.stressTestEnabled;
  const passiveM = g.passiveIncome || 0;
  const remoteBaseM = inputs.paths[path].remoteWork ? (inputs.paths[path].remoteIncome || 0) : 0;
  const purchasePriceForValue = boatPrice > 0 ? boatPrice : 0;

  let cash = startCash;
  let months = 0;
  let runwayMonths: number | null = null;
  let pnrMonths: number | null = null;

  const yearlyRows: YearlyRow[] = [];
  let yearTracker = { startCash: cash, growth: 0, burn: 0 };

  while (months < 600) {
    const yearIdx = Math.floor(months / 12);
    const { costMult, incomeMult } = getStressMultipliers(
      yearIdx, applyStress, g.incomeVolatility, g.costUncertainty, g.stressRandomize, g.stressSeed
    );

    const inflFactor = Math.pow(1 + infl, Math.max(0, yearIdx));
    const cushionNow = baseCushion * inflFactor;
    const pnrBufferNow = basePNRBuffer * inflFactor;

    let sailCostM = sailingBase * inflFactor;
    if (applyStress) sailCostM *= costMult;
    if (applyStress && isStressShockYear(yearIdx, g.stressTestEnabled, inputs.stress.shockYears)) {
      sailCostM *= 1 + inputs.stress.shockCostBumpPct / 100;
    }

    let loanPayM = 0;
    if (boatPrincipal > 0 && months < boatTerm) {
      const mBoat = fixedMonthlyPayment(boatPrincipal, boatRate, boatTerm);
      const insM = b.insuranceType === 'percent'
        ? ((boatPrice * (b.insurancePercent || 0)) / 100 / 12) * inflFactor
        : boatInsuranceM * inflFactor;
      loanPayM += mBoat + insM;
    }
    if (helocPrincipal > 0) {
      loanPayM += helocMonthlyPayment(helocPrincipal, helocRate, months + 1, helocIOM, helocAmortM);
    }
    if (otherPrincipal > 0 && months < otherTerm) {
      loanPayM += fixedMonthlyPayment(otherPrincipal, otherRate, otherTerm);
    }

    let remoteM = remoteBaseM;
    if (applyStress) remoteM *= incomeMult;

    const inflow = passiveM + remoteM;
    const outflow = sailCostM + loanPayM;

    const growth = cash * rInvMonthly;
    cash += growth + inflow - outflow;

    yearTracker.growth += growth;
    yearTracker.burn += Math.max(0, outflow - inflow);

    if (pnrMonths === null && cash <= cushionNow + pnrBufferNow) {
      pnrMonths = months + 1;
    }
    if (cash <= cushionNow) {
      runwayMonths = months + 1;
      if (pnrMonths === null || pnrMonths > runwayMonths) pnrMonths = runwayMonths;
      break;
    }

    months++;
    if (months % 12 === 0) {
      yearlyRows.push({ year: yearIdx, ...yearTracker, endCash: cash });
      yearTracker = { startCash: cash, growth: 0, burn: 0 };
    }
  }

  if (runwayMonths === null) {
    runwayMonths = 600;
    if (pnrMonths === null) pnrMonths = 600;
  }

  const boatValue = purchasePriceForValue > 0
    ? boatValueAtMonths(purchasePriceForValue, runwayMonths, b.depreciation)
    : 0;

  let totalLoanBalance = 0;
  if (loanType === 'boat' || loanType === 'both') {
    totalLoanBalance += fixedBalance(boatPrincipal, boatRate, boatTerm, Math.min(runwayMonths, boatTerm));
  }
  if (loanType === 'heloc' || loanType === 'both') {
    totalLoanBalance += helocBalance(
      helocPrincipal, helocRate, Math.min(runwayMonths, helocIOM + helocAmortM), helocIOM, helocAmortM
    );
  }
  if (loanType === 'other') {
    totalLoanBalance += fixedBalance(otherPrincipal, otherRate, otherTerm, Math.min(runwayMonths, otherTerm));
  }
  const boatEquity = Math.max(0, boatValue - totalLoanBalance);

  return {
    departureCash: startCash,
    runwayYears: Math.min(runwayMonths / 12, 50),
    pnrYears: Math.min((pnrMonths as number) / 12, runwayMonths / 12, 50),
    finalCash: cash,
    yearlyRows,
    boatValue,
    loanBalanceAtEnd: totalLoanBalance,
    boatEquity,
  };
}

export function simulateBoth(path: PathKey, inputs: SailAwayInputs): PathBothResults {
  return {
    base: simulateRunwayMonthly(path, inputs, false),
    stress: simulateRunwayMonthly(path, inputs, true),
  };
}

export const SAILAWAY_DEFAULTS: SailAwayInputs = {
  global: {
    userAge: 45,
    partnerAge: null,
    liquidSavings: 50000,
    investablePortfolio: 100000,
    monthlyLandCost: 3000,
    annualIncome: 85000,
    savingsRate: 15,
    passiveIncome: 500,
    sailingBasePreset: 4500,
    sailingAdjustment: 0,
    inflationRate: 3,
    investmentReturn: 6,
    stressTestEnabled: false,
    incomeVolatility: 20,
    stressRandomize: false,
    stressSeed: 42,
    costUncertainty: 15,
  },
  paths: {
    A: { loan: 'none', remoteWork: false, remoteIncome: 2000, regret: 5 },
    B: { loan: 'boat', remoteWork: true, remoteIncome: 3000, regret: 35, yearsToSave: 5 },
    C: { loan: 'none', remoteWork: false, remoteIncome: 0, regret: 75, retirementAge: 60 },
  },
  loanParams: {
    heloc: { available: 100000, drawAmount: 100000, rate: 6.5, ioMonths: 24, amortMonths: 120, boatPrice: 200000 },
    boat: {
      price: 250000, downPercent: 20, rate: 7.5, termMonths: 180,
      insuranceBump: 250, insuranceType: 'fixed', insurancePercent: 2,
      depreciation: { immediatePct: 20, annualPct: 5 },
    },
    other: { principal: 50000, rate: 8, termMonths: 60 },
  },
  stress: { shockYears: 1, shockCostBumpPct: 30 },
};
