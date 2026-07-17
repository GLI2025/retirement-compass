import {
  FilingStatus,
  RothConversionInputs,
  RothConversionResults,
  ScenarioResult,
  ProRataResult,
} from '@/types/rothConversion';

/**
 * Ported directly from glassbridgepath.com/elementor-page-1101/ (Roth Conversion
 * Planner). The CONFIG block below is verbatim from the live page's embedded
 * script (2025-ish placeholder tax parameters — the page itself notes these
 * must be updated annually). Do not alter without explicit sign-off.
 */
interface Bracket { upTo: number; rate: number }

const CONFIG = {
  taxYear: 2025,
  ordinary: {
    S: [{ upTo: 11600, rate: 0.10 }, { upTo: 47150, rate: 0.12 }, { upTo: 100525, rate: 0.22 }, { upTo: 191950, rate: 0.24 }, { upTo: 243725, rate: 0.32 }, { upTo: 609350, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
    MFJ: [{ upTo: 23200, rate: 0.10 }, { upTo: 94300, rate: 0.12 }, { upTo: 201050, rate: 0.22 }, { upTo: 383900, rate: 0.24 }, { upTo: 487450, rate: 0.32 }, { upTo: 731200, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
    MFS: [{ upTo: 11600, rate: 0.10 }, { upTo: 47150, rate: 0.12 }, { upTo: 100525, rate: 0.22 }, { upTo: 191950, rate: 0.24 }, { upTo: 243725, rate: 0.32 }, { upTo: 365600, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
    HOH: [{ upTo: 16550, rate: 0.10 }, { upTo: 63100, rate: 0.12 }, { upTo: 100500, rate: 0.22 }, { upTo: 191950, rate: 0.24 }, { upTo: 243700, rate: 0.32 }, { upTo: 609350, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
    QW: [{ upTo: 23200, rate: 0.10 }, { upTo: 94300, rate: 0.12 }, { upTo: 201050, rate: 0.22 }, { upTo: 383900, rate: 0.24 }, { upTo: 487450, rate: 0.32 }, { upTo: 731200, rate: 0.35 }, { upTo: Infinity, rate: 0.37 }],
  } as Record<FilingStatus, Bracket[]>,
  stdDeduction: { S: 15000, MFJ: 30000, MFS: 15000, HOH: 22000, QW: 30000 } as Record<FilingStatus, number>,
  ltcg: {
    S: [{ upTo: 47125, rate: 0 }, { upTo: 518900, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }],
    MFJ: [{ upTo: 94250, rate: 0 }, { upTo: 583750, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }],
    MFS: [{ upTo: 47125, rate: 0 }, { upTo: 291850, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }],
    HOH: [{ upTo: 63150, rate: 0 }, { upTo: 551350, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }],
    QW: [{ upTo: 94250, rate: 0 }, { upTo: 583750, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }],
  } as Record<FilingStatus, Bracket[]>,
  ss: {
    base: { S: 25000, HOH: 25000, MFS: 0, MFJ: 32000, QW: 25000 } as Record<FilingStatus, number>,
    upper: { S: 34000, HOH: 34000, MFS: 0, MFJ: 44000, QW: 34000 } as Record<FilingStatus, number>,
  },
  niit: { S: 200000, HOH: 200000, MFJ: 250000, MFS: 125000, QW: 250000 } as Record<FilingStatus, number>,
  fpl: { '1': 15500, '2': 21000, '3': 26500, '4': 32000, '5': 37500 } as Record<string, number>,
  saltCap: 10000,
  irmaa: {
    S: [97000, 123000, 154000, 191000, 500000],
    MFJ: [194000, 246000, 308000, 382000, 750000],
    MFS: [0, 0, 0, 0, 0],
    HOH: [97000, 123000, 154000, 191000, 500000],
    QW: [194000, 246000, 308000, 382000, 750000],
  } as Record<FilingStatus, number[]>,
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function taxByBrackets(taxable: number, brackets: Bracket[]): number {
  let tax = 0, prev = 0;
  for (const b of brackets) {
    const cap = Math.min(taxable, b.upTo);
    if (cap > prev) { tax += (cap - prev) * b.rate; prev = cap; }
    if (prev >= taxable) break;
  }
  return Math.max(0, tax);
}

function ltcgTax(ltcgIncome: number, ordinaryTaxable: number, filing: FilingStatus): number {
  if (ltcgIncome <= 0) return 0;
  const bands = CONFIG.ltcg[filing];
  let remaining = ltcgIncome, tax = 0, carried = ordinaryTaxable;
  for (const b of bands) {
    const available = Math.max(0, b.upTo - carried);
    if (available > 0) {
      const used = Math.min(available, remaining);
      tax += used * b.rate;
      carried += used; remaining -= used;
    }
    if (remaining <= 0) break;
  }
  if (remaining > 0) tax += remaining * bands[bands.length - 1].rate;
  return tax;
}

function ssTaxable(ssGross: number, agi: number, taxExemptInterest: number, filing: FilingStatus): number {
  if (ssGross <= 0) return 0;
  const base = CONFIG.ss.base[filing];
  const upper = CONFIG.ss.upper[filing];
  const provisional = agi + taxExemptInterest + 0.5 * ssGross;
  if (filing === 'MFS') {
    return Math.min(0.85 * ssGross, Math.max(0, 0.85 * ssGross));
  }
  if (provisional <= base) return 0;
  if (provisional <= upper) return Math.min(0.5 * ssGross, 0.5 * (provisional - base));
  const first = 0.5 * (upper - base);
  const excess = provisional - upper;
  return Math.min(0.85 * ssGross, first + 0.85 * excess);
}

function computeItemized(itemized: { salt: number; mortInt: number; charity: number; medical: number; other: number }): number {
  const saltAllowed = Math.min(itemized.salt || 0, CONFIG.saltCap);
  return saltAllowed + (itemized.mortInt || 0) + (itemized.charity || 0) + (itemized.medical || 0) + (itemized.other || 0);
}

function niitDue(magi: number, netInvIncome: number, filing: FilingStatus): number {
  const thr = CONFIG.niit[filing] ?? Infinity;
  if (magi <= thr || netInvIncome <= 0) return 0;
  const excess = magi - thr;
  const base = Math.min(excess, netInvIncome);
  return 0.038 * base;
}

function acaStatus(magi: number, hhSize: number): { label: string; risk: string; pctFPL: number } {
  const fpl = CONFIG.fpl[String(hhSize)] || CONFIG.fpl['2'];
  const pctFPL = fpl ? magi / fpl : 0;
  const label = pctFPL ? (pctFPL * 100).toFixed(0) + '% FPL' : '–';
  let risk = '';
  if (pctFPL > 5) {
    if (pctFPL < 1.5) risk = 'Very likely strong PTC';
    else if (pctFPL < 2) risk = 'PTC likely good';
    else if (pctFPL < 2.5) risk = 'PTC moderates';
    else if (pctFPL < 4) risk = 'PTC phases down';
    else risk = 'Little/no PTC at this MAGI';
  }
  return { label, risk, pctFPL };
}

function irmaaTier(magi: number, filing: FilingStatus): { tier: string; index?: number } {
  const tiers = CONFIG.irmaa[filing];
  if (!tiers || !tiers.length) return { tier: 'n/a' };
  const t = tiers.findIndex((x) => magi <= x);
  const idx = t === -1 ? tiers.length : t;
  return { tier: 'Tier ' + (idx + 1), index: idx };
}

interface ScenarioParams {
  filing: FilingStatus;
  wages: number; intOrd: number; divQ: number; divO: number; cgST: number; cgLT: number;
  rental: number; intEx: number; ssGross: number; aboveLine: number;
  dedType: 'standard' | 'itemized';
  itemized: { salt: number; mortInt: number; charity: number; medical: number; other: number };
  stateMode: 'none' | 'flat'; stateRate: number;
  conversion: number; hhSize: number;
}

function buildScenario(p: ScenarioParams): ScenarioResult {
  const agiBase = Math.max(0, (p.wages + p.intOrd + p.divO + p.cgST + p.rental + p.divQ + p.cgLT) - p.aboveLine);
  const ssTax = ssTaxable(p.ssGross, agiBase, p.intEx, p.filing);
  const agi = agiBase + ssTax + p.conversion;

  const std = CONFIG.stdDeduction[p.filing] || 0;
  const item = p.dedType === 'itemized' ? computeItemized(p.itemized) : 0;
  const deduction = Math.max(std, item);

  const ordinaryTaxableCandidate = Math.max(
    0,
    p.wages + p.intOrd + p.divO + p.cgST + p.rental + ssTax + p.conversion - p.aboveLine - deduction
  );
  const brackets = CONFIG.ordinary[p.filing];
  const ordinaryTax = taxByBrackets(ordinaryTaxableCandidate, brackets);

  const ltcgIncome = Math.max(0, p.divQ + p.cgLT);
  const ltcgTaxDue = ltcgTax(ltcgIncome, ordinaryTaxableCandidate, p.filing);

  const magi = agi + p.intEx;
  const netInvIncome = Math.max(0, p.intOrd + p.divQ + p.divO + p.cgST + p.cgLT + p.rental);
  const niit = niitDue(magi, netInvIncome, p.filing);

  let stateTax = 0;
  if (p.stateMode === 'flat') {
    const base = ordinaryTaxableCandidate + ltcgIncome;
    stateTax = Math.max(0, (p.stateRate / 100) * base);
  }

  const totalTax = ordinaryTax + ltcgTaxDue + niit + stateTax;
  const aca = acaStatus(magi, p.hhSize);
  const irmaa = irmaaTier(magi, p.filing);

  return {
    agi, magi, ordinaryTaxable: ordinaryTaxableCandidate, ordinaryTax, ltcgTax: ltcgTaxDue,
    niit, stateTax, totalTax, ssTax, ltcgIncome, aca, irmaa,
  };
}

function proRata(conversion: number, iraTotal: number, iraBasis: number): ProRataResult {
  const total = Math.max(0, iraTotal);
  const basis = Math.min(iraBasis || 0, total);
  if (total <= 0) return { taxable: conversion, nontaxable: 0, newBasis: basis };
  const preTaxPortion = Math.max(0, total - basis);
  const taxable = conversion * (preTaxPortion / total);
  const nontaxable = conversion - taxable;
  const newBasis = Math.max(0, basis - nontaxable);
  return { taxable, nontaxable, newBasis };
}

function barFill(s: ScenarioResult, filing: FilingStatus): number {
  const brackets = CONFIG.ordinary[filing];
  const used = Math.min(s.ordinaryTaxable, brackets[brackets.length - 2].upTo);
  return Math.round(clamp(used / brackets[brackets.length - 2].upTo, 0, 1) * 100);
}

export function calculateRothConversion(inputs: RothConversionInputs): RothConversionResults {
  const base: ScenarioParams = {
    filing: inputs.filing,
    wages: inputs.wages, intOrd: inputs.intOrd, divQ: inputs.divQ, divO: inputs.divO,
    cgST: inputs.cgST, cgLT: inputs.cgLT, rental: inputs.rental, intEx: inputs.intEx,
    ssGross: inputs.ssGross, aboveLine: inputs.aboveLine,
    dedType: inputs.dedType, itemized: inputs.itemized,
    stateMode: inputs.stateMode, stateRate: inputs.stateRate,
    conversion: 0, hhSize: inputs.hhSize,
  };

  const pr = proRata(inputs.conversion, inputs.iraTotal, inputs.iraBasis);

  const baseline = buildScenario({ ...base, conversion: 0 });
  const withConversion = buildScenario({ ...base, conversion: pr.taxable });

  const deltaTotal = withConversion.totalTax - baseline.totalTax;

  // Marginal step (last $N of conversion) — mirrors the original's "granular what-if"
  const prStep = proRata(inputs.marginalStep, inputs.iraTotal, inputs.iraBasis);
  const stepScenario = buildScenario({ ...base, conversion: pr.taxable + prStep.taxable });
  const effectiveMarginalOnStep = inputs.marginalStep > 0
    ? (stepScenario.totalTax - withConversion.totalTax) / inputs.marginalStep
    : 0;

  const alerts: string[] = [];
  if (inputs.onACA && Math.floor(withConversion.aca.pctFPL * 100) !== Math.floor(baseline.aca.pctFPL * 100)) {
    alerts.push(
      `ACA %FPL shifts: ${(baseline.aca.pctFPL * 100).toFixed(0)}% → ${(withConversion.aca.pctFPL * 100).toFixed(0)}%`
    );
  }
  if (withConversion.niit > 0 && baseline.niit === 0) alerts.push('Triggers NIIT');
  if (withConversion.ssTax > baseline.ssTax) alerts.push('Increases SS benefits taxation');
  if (inputs.onMedicare && baseline.irmaa.tier !== withConversion.irmaa.tier) {
    alerts.push(`IRMAA tier change: ${baseline.irmaa.tier} → ${withConversion.irmaa.tier} (applies 2 years later)`);
  }
  if (deltaTotal > 0 && inputs.conversion > 0 && deltaTotal / inputs.conversion > 0.3) {
    alerts.push('High effective marginal rate on conversion');
  }

  return {
    baseline,
    withConversion,
    proRata: pr,
    deltaTotal,
    effectiveMarginalOnStep,
    alerts,
    bracketFillBaselinePct: barFill(baseline, inputs.filing),
    bracketFillWithConversionPct: barFill(withConversion, inputs.filing),
  };
}

export const ROTH_CONVERSION_DEFAULTS: RothConversionInputs = {
  filing: 'MFJ',
  dependents: 0,
  age1: 43,
  age2: 40,
  state: '',
  stateMode: 'flat',
  stateRate: 4.4,
  hhSize: 2,
  onACA: false,
  onMedicare: false,
  wages: 35000,
  intOrd: 200,
  divQ: 0,
  divO: 0,
  cgST: 0,
  cgLT: 0,
  rental: 0,
  intEx: 0,
  ssGross: 0,
  aboveLine: 0,
  dedType: 'standard',
  itemized: { salt: 0, mortInt: 0, charity: 0, medical: 0, other: 0 },
  iraTotal: 150000,
  iraBasis: 0,
  conversion: 20000,
  marginalStep: 1000,
};
