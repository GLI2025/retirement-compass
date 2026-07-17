import { MilitaryPensionInputs, MilitaryPensionResults, MilitaryBranch, PayPlan } from '@/types/militaryPension';

/**
 * Ported directly from the live glassbridgepath.com/military-service-final-pay-quick-calc/
 * page source (view-source, captured verbatim). Do not alter the pay tables or
 * multiplier formulas without explicit sign-off — these are DFAS 2025 figures.
 */

export const BRANCH_SUPPORT: Record<MilitaryBranch, { warr: boolean }> = {
  army: { warr: true }, navy: { warr: true }, marines: { warr: true }, uscg: { warr: true },
  airforce: { warr: false }, spaceforce: { warr: false },
};

export const BRANCH_LABELS: Record<MilitaryBranch, string> = {
  army: 'Army', navy: 'Navy', airforce: 'Air Force', marines: 'Marines', uscg: 'Coast Guard', spaceforce: 'Space Force',
};

// DFAS 2025 condensed tables (monthly) & YOS steps
export const YOS_STEPS = [0, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41];

export const PAY: Record<PayPlan, Record<string, Record<number, number>>> = {
  enl: {
    'E-1': { 0: 2319 }, 'E-2': { 0: 2599.20 },
    'E-3': { 0: 2733.00, 3: 2904.60, 4: 3081.00 },
    'E-4': { 0: 3027.30, 3: 3182.10, 4: 3354.90, 5: 3524.70, 7: 3675.60 },
    'E-5': { 0: 3220.50, 3: 3466.50, 4: 3637.50, 5: 3802.20, 7: 3959.40, 9: 4142.40, 11: 4234.50, 13: 4259.70 },
    'E-6': { 0: 3276.60, 3: 3606.00, 4: 3765.00, 5: 3919.80, 7: 4080.60, 9: 4443.90, 11: 4585.20, 13: 4858.80, 15: 4942.50, 17: 5003.40, 19: 5074.80 },
    'E-7': { 0: 3788.10, 3: 4134.30, 4: 4293.00, 5: 4502.10, 7: 4666.50, 9: 4947.60, 11: 5106.30, 13: 5387.10, 15: 5621.40, 17: 5781.30, 19: 5951.10, 21: 6017.10, 23: 6238.20, 25: 6356.70, 27: 6808.80 },
    'E-8': { 9: 5449.50, 11: 5690.70, 13: 5839.80, 15: 6018.60, 17: 6212.10, 19: 6561.90, 21: 6739.20, 23: 7040.70, 25: 7207.80, 27: 7619.40, 31: 7772.10 },
    'E-9': { 9: 6657.30, 11: 6807.90, 13: 6997.80, 15: 7221.60, 17: 7447.80, 19: 7808.40, 21: 8114.70, 23: 8436.00, 25: 8928.60, 31: 9374.10, 35: 9843.30, 39: 10336.50 },
  },
  warr: {
    'W-1': { 0: 3908.10, 3: 4329.30, 4: 4442.10, 5: 4681.20, 7: 4963.50, 9: 5379.90, 11: 5574.30, 13: 5847.00, 15: 6114.30, 17: 6324.60, 19: 6518.40, 21: 6753.60 },
    'W-2': { 0: 4452.60, 3: 4873.80, 4: 5003.10, 5: 5092.50, 7: 5380.80, 9: 5829.60, 11: 6052.50, 13: 6271.20, 15: 6539.10, 17: 6748.50, 19: 6937.80, 21: 7164.60, 23: 7313.70, 25: 7431.90 },
    'W-3': { 0: 5032.20, 3: 5241.30, 4: 5457.00, 5: 5526.90, 7: 5752.20, 9: 6195.60, 11: 6657.60, 13: 6875.10, 15: 7126.80, 17: 7385.40, 19: 7851.90, 21: 8166.30, 23: 8354.40, 25: 8554.50, 27: 8827.20 },
    'W-4': { 0: 5510.40, 3: 5926.80, 4: 6096.90, 5: 6264.30, 7: 6552.90, 9: 6838.20, 11: 7127.10, 13: 7560.90, 15: 7941.90, 17: 8304.30, 19: 8601.60, 21: 8891.10, 23: 9315.60, 25: 9664.80, 27: 10062.90, 29: 10263.60 },
    'W-5': { 13: 9797.40, 15: 10294.50, 17: 10665.00, 19: 11074.20, 23: 11628.90, 27: 12209.40, 31: 12821.10 },
  },
  off: {
    'O-1': { 0: 3998.40, 3: 4161.90, 4: 5031.30 },
    'O-2': { 0: 4606.80, 3: 5246.70, 4: 6042.90, 5: 6247.20, 7: 6375.30 },
    'O-3': { 0: 5331.60, 3: 6044.10, 4: 6522.60, 5: 7112.40, 7: 7453.80, 9: 7827.90, 11: 8069.10, 13: 8466.60, 15: 8674.50 },
    'O-4': { 0: 6064.20, 3: 7019.70, 4: 7488.90, 5: 7592.40, 7: 8027.10, 9: 8493.60, 11: 9075.00, 13: 9526.20, 15: 9840.60, 17: 10020.90, 19: 10125.00 },
    'O-5': { 0: 7028.40, 3: 7917.30, 4: 8465.40, 5: 8568.60, 7: 8910.90, 9: 9114.90, 11: 9564.90, 13: 9895.80, 15: 10322.70, 17: 10974.30, 19: 11285.10, 21: 11592.30, 23: 11940.90 },
    'O-6': { 0: 8430.90, 3: 9261.90, 4: 9870.00, 7: 9907.80, 9: 10332.30, 11: 10388.70, 15: 10979.10, 17: 12022.80, 19: 12635.40, 21: 13247.70, 23: 13596.30, 25: 13949.10, 27: 14632.80, 31: 14925.00 },
  },
};

export function gradesFor(payplan: PayPlan): string[] {
  return Object.keys(PAY[payplan]);
}

export function branchSupportsWarrant(branch: MilitaryBranch): boolean {
  return BRANCH_SUPPORT[branch].warr;
}

export function findPay(plan: PayPlan, grade: string, yos: number): number {
  const table = PAY[plan][grade] || {};
  let rate = 0;
  for (const step of YOS_STEPS) {
    if (yos >= step && Object.prototype.hasOwnProperty.call(table, step)) rate = table[step];
  }
  return rate || 0;
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function svcPct(y: number, base: 'final' | 'brs'): number {
  return (base === 'brs' ? 0.02 : 0.025) * y;
}

function reduxPct(y: number): number {
  return y >= 30 ? 0.025 * y : Math.max(0, 0.035 * y - 0.30);
}

function multiplierPct(inputs: MilitaryPensionInputs, yos: number): number {
  const p = inputs.plan;
  if (p === 'final') return svcPct(yos, 'final');
  if (p === 'brs') return svcPct(yos, 'brs');
  if (p === 'redux') return reduxPct(yos);
  if (p === 'disab') {
    const entered = Math.min(75, Math.max(0, inputs.disabilityPct)) / 100;
    return Math.max(entered, svcPct(yos, inputs.disabilityBase));
  }
  return svcPct(yos, 'final');
}

export function calculateMilitaryPension(inputs: MilitaryPensionInputs): MilitaryPensionResults {
  const yos = Math.max(0, inputs.yos || 0);
  const autoPay = findPay(inputs.payplan, inputs.grade, yos);
  const finalPay = inputs.finalPayOverride != null ? Math.max(0, inputs.finalPayOverride) : autoPay;
  const pct = multiplierPct(inputs, yos);
  const monthly = finalPay * pct;
  const annual = monthly * 12;

  let planExplain = '';
  if (inputs.plan === 'final') planExplain = `2.5% × ${yos} yrs = ${(pct * 100).toFixed(1)}%`;
  if (inputs.plan === 'brs') planExplain = `2.0% × ${yos} yrs = ${(pct * 100).toFixed(1)}%`;
  if (inputs.plan === 'redux') {
    const base = 0.025 * yos * 100;
    const cut = 30 - Math.min(yos, 30);
    planExplain = `REDUX: ${base.toFixed(1)}% − ${cut.toFixed(0)}% (under 30) = ${(pct * 100).toFixed(1)}%`;
  }
  if (inputs.plan === 'disab') {
    const entered = Math.min(75, Math.max(0, inputs.disabilityPct));
    const baseLbl = inputs.disabilityBase === 'brs' ? 'BRS 2.0%/yr' : 'Final/High-36 2.5%/yr';
    planExplain = `Disability: higher of ${entered.toFixed(1)}% (cap 75%) or service-based via ${baseLbl}. Result ${(pct * 100).toFixed(1)}%`;
  }

  const explain =
    `Matched ${inputs.grade} at ${yos} YOS → basic pay ${fmt(finalPay)}. ` +
    `Multiplier: ${planExplain}. ` +
    `Monthly = ${fmt(finalPay)} × ${(pct * 100).toFixed(1)}% = ${fmt(monthly)}; ` +
    `Annual = ${fmt(monthly)} × 12 = ${fmt(annual)}.`;

  return { finalPay, multiplierPct: pct, monthly, annual, explain };
}

export const MILITARY_PENSION_DEFAULTS: MilitaryPensionInputs = {
  branch: null,
  payplan: 'enl',
  grade: 'E-7',
  yos: 20,
  finalPayOverride: null,
  plan: 'final',
  disabilityPct: 50,
  disabilityBase: 'final',
};
