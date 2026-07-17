import { GuardrailsRunConfig, GuardrailsResults } from '@/types/guardrails';

/* Same market model as the main engine — see calculations/guardrails.ts for the
 * authoritative version. Duplicated here (not imported) because this is a
 * lighter-weight, no-guardrails-mid-course-reset path simulator, matching the
 * original Volatility page's simplified simulation exactly. */
const MU_S = 0.06, SIG_S = 0.18, MU_B = 0.0, SIG_B = 0.06, RHO = 0.1;
const W_S = 0.6, W_B = 0.4;

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rand: () => number) {
  let u = 0, v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function genReturn(rand: () => number) {
  const z1 = normal(rand), z2 = normal(rand);
  const sShock = z1, bShock = RHO * z1 + Math.sqrt(1 - RHO * RHO) * z2;
  const stock = Math.exp(MU_S - 0.5 * SIG_S * SIG_S) * Math.exp(SIG_S * sShock) - 1;
  const bond = Math.exp(MU_B - 0.5 * SIG_B * SIG_B) * Math.exp(SIG_B * bShock) - 1;
  return W_S * stock + W_B * bond;
}
function quantile(arr: number[], q: number) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
  return a[idx];
}
function toRealCola(nom: number, cpi: number) {
  return (nom || 0) - (cpi || 0);
}
function incomeAtYear(t: number, incomes: GuardrailsRunConfig['incomes'], cpi: number) {
  let s = 0;
  for (const inc of incomes || []) {
    if (t >= (inc.start || 0)) {
      const yrs = t - (inc.start || 0);
      s += inc.amt * Math.pow(1 + toRealCola(inc.colaNom, cpi), yrs);
    }
  }
  return s;
}

function simulatePathOverTime(
  cfg: { engine: string; PV0: number; T: number; incomes: GuardrailsRunConfig['incomes']; cpi: number; startIncome: number; W0_port: number },
  rand: () => number
): number[] {
  let PV = cfg.PV0;
  const pvYears = [PV];
  const S = cfg.startIncome;
  const W = Math.max(0, cfg.W0_port);
  for (let t = 0; t < cfg.T; t++) {
    const withdraw = cfg.engine === 'total' ? Math.max(0, S - incomeAtYear(t, cfg.incomes, cfg.cpi)) : W;
    PV -= withdraw;
    if (PV <= 0) { pvYears.push(0); PV = 0; continue; }
    PV *= 1 + genReturn(rand);
    pvYears.push(PV);
  }
  return pvYears;
}

export interface PercentileSeries {
  years: number[];
  p10: number[];
  p50: number[];
  p90: number[];
}

/** Rebuild 10th/50th/90th percentile portfolio-value paths for the Volatility chart. */
export function buildPercentilePaths(
  inputs: GuardrailsRunConfig,
  results: GuardrailsResults,
  N = 800
): PercentileSeries {
  const startIncome = results.startIncome ?? results.P0 + results.W0_port;
  const cfg = {
    engine: results.engine,
    PV0: inputs.PV0,
    T: inputs.T,
    incomes: inputs.incomes,
    cpi: inputs.cpi,
    startIncome,
    W0_port: results.W0_port,
  };

  const paths: number[][] = [];
  const seed = 123456;
  for (let i = 0; i < N; i++) {
    paths.push(simulatePathOverTime(cfg, mulberry32((seed + i) >>> 0)));
  }

  const years: number[] = [], p10: number[] = [], p50: number[] = [], p90: number[] = [];
  for (let y = 0; y <= cfg.T; y++) {
    const col = paths.map((p) => p[y] ?? 0);
    years.push(y);
    p10.push(quantile(col, 0.1));
    p50.push(quantile(col, 0.5));
    p90.push(quantile(col, 0.9));
  }
  return { years, p10, p50, p90 };
}
