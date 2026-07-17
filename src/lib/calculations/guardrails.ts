import { GuardrailsInputs, GuardrailsResults, IncomeStream } from '@/types/guardrails';

/**
 * Ported from the original standalone Guardrails Monte Carlo calculator
 * (glassbridgepath.com/guardrails/). Same market model, same triggers,
 * same binary-search calibration logic as the original — only the
 * language (vanilla JS -> TypeScript) and I/O (DOM -> function args) changed.
 *
 * Do not change these constants without explicit sign-off — they define
 * the product's risk model.
 */
const MU_S = 0.06, SIG_S = 0.18, MU_B = 0.0, SIG_B = 0.06, RHO = 0.1;
const W_S = 0.6, W_B = 0.4;
const START_TARGET = 0.8, UPPER_TRIGGER = 0.99, LOWER_TRIGGER = 0.25,
  UPPER_RESET = 0.8, LOWER_RESET = 0.45;

type RandFn = () => number;
type RandFactory = () => RandFn;

function mulberry32(a: number): RandFn {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: RandFn): number {
  let u = 0, v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function genReturn(rand: RandFn): number {
  const z1 = normal(rand), z2 = normal(rand);
  const sShock = z1, bShock = RHO * z1 + Math.sqrt(1 - RHO * RHO) * z2;
  const stock = Math.exp(MU_S - 0.5 * SIG_S * SIG_S) * Math.exp(SIG_S * sShock) - 1;
  const bond = Math.exp(MU_B - 0.5 * SIG_B * SIG_B) * Math.exp(SIG_B * bShock) - 1;
  return W_S * stock + W_B * bond;
}

function hashTag(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

function seqFactory(seedBase: number | null, tag: string): RandFactory {
  let i = 0;
  if (seedBase === null) {
    return () => Math.random;
  }
  const tagHash = hashTag(tag);
  return () => {
    const seed = ((seedBase ^ tagHash) + i++) >>> 0;
    return mulberry32(seed);
  };
}

interface PathResult {
  success: boolean;
  finalPV: number;
  vol: number;
  mdd: number;
}

function successRate(arr: PathResult[]): number {
  let s = 0;
  for (const r of arr) if (r.success) s++;
  return s / arr.length;
}

function toRealCola(stream: IncomeStream, cpi: number): number {
  return (stream.colaNom || 0) - (cpi || 0);
}

function incomeAt(t: number, incomes: IncomeStream[], cpi: number): number {
  let s = 0;
  for (const inc of incomes || []) {
    if (t >= (inc.start || 0)) {
      const yearsActive = t - (inc.start || 0);
      const colaReal = toRealCola(inc, cpi);
      s += inc.amt * Math.pow(1 + colaReal, yearsActive);
    }
  }
  return s;
}

interface WelfordState { n: number; mean: number; m2: number }
function welfordAdd(state: WelfordState, x: number) {
  state.n++;
  const delta = x - state.mean;
  state.mean += delta / state.n;
  state.m2 += delta * (x - state.mean);
}
function welfordStd(state: WelfordState) {
  return state.n > 1 ? Math.sqrt(state.m2 / (state.n - 1)) : 0;
}

interface BasePathParams {
  PV: number; W?: number; S0?: number; T: number; yD?: number; D?: number;
  incomes?: IncomeStream[]; cpi?: number; P?: number; pcola?: number;
}
interface Rails { upperS?: number; lowerS?: number; upperW?: number; lowerW?: number }

/* ---------- TOTAL-INCOME (pension-aware) engine ---------- */

function runPath_TOTAL(p: BasePathParams, randFactory: RandFactory, rails: Rails | null): PathResult {
  let PV = p.PV, S = p.S0 ?? 0;
  const T = p.T, yD = p.yD || 0, D = p.D || 0, incomes = p.incomes || [], cpi = p.cpi || 0;
  const rand = randFactory();

  let peak = PV, minDD = 0;
  const returnsVar: WelfordState = { n: 0, mean: 0, m2: 0 };

  for (let t = 0; t < T; t++) {
    if (t === yD) PV += D;

    if (rails) {
      const q = probe_TOTAL({ PV, S, T: T - t, incomes, cpi }, randFactory);
      if (q >= UPPER_TRIGGER) S = rails.upperS!;
      else if (q <= LOWER_TRIGGER) S = rails.lowerS!;
    }

    const P_t = incomeAt(t, incomes, cpi);
    const Wt = Math.max(0, S - P_t);
    PV -= Wt;
    if (PV <= 0) return { success: false, finalPV: 0, vol: welfordStd(returnsVar), mdd: minDD };

    const r = genReturn(rand);
    PV *= 1 + r;

    welfordAdd(returnsVar, r);
    if (PV > peak) peak = PV;
    const dd = (PV - peak) / peak;
    if (dd < minDD) minDD = dd;
  }
  return { success: true, finalPV: PV, vol: welfordStd(returnsVar), mdd: minDD };
}

function probe_TOTAL(
  params: { PV: number; S: number; T: number; incomes: IncomeStream[]; cpi: number },
  randFactory: RandFactory
): number {
  const K = 220;
  let ok = 0;
  for (let i = 0; i < K; i++) {
    let PV = params.PV;
    const S = params.S, T = params.T, incomes = params.incomes || [], cpi = params.cpi || 0;
    const rand = randFactory();
    let alive = true;
    for (let t = 0; t < T; t++) {
      const P_t = incomeAt(t, incomes, cpi);
      const Wt = Math.max(0, S - P_t);
      PV -= Wt;
      if (PV <= 0) { alive = false; break; }
      PV *= 1 + genReturn(rand);
    }
    if (alive) ok++;
  }
  return ok / K;
}

function findPV_TOTAL(base: BasePathParams, S0: number, target: number, randFactory: RandFactory): number {
  let lo = 50_000, hi = 5_000_000, best = base.PV;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const trial = { ...base, PV: mid, S0 };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_TOTAL(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (hi = mid) : (lo = mid);
  }
  return best;
}

function findS_TOTAL(currentPV: number, base: BasePathParams, target: number, randFactory: RandFactory): number {
  const S_now = (base.W || 0) + incomeAt(0, base.incomes || [], base.cpi || 0);
  let lo = Math.max(0, S_now * 0.4), hi = Math.max(S_now * 2.0, S_now + 100_000), best = S_now;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    const trial = { ...base, PV: currentPV, S0: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_TOTAL(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (lo = mid) : (hi = mid);
  }
  return best;
}

/* ---------- LEGACY (portfolio-withdrawal W) engine ---------- */

function runPath_LEGACY(p: BasePathParams, randFactory: RandFactory, rails: Rails | null): PathResult {
  let PV = p.PV, W = p.W ?? 0, P = p.P ?? 0;
  const T = p.T, yD = p.yD || 0, D = p.D || 0, pcola = p.pcola || 0;
  const rand = randFactory();

  let peak = PV, minDD = 0;
  const returnsVar: WelfordState = { n: 0, mean: 0, m2: 0 };

  for (let t = 1; t <= T; t++) {
    if (t - 1 === yD) PV += D;

    if (rails) {
      const q = probe_LEGACY({ PV, W, P, T: T - t + 1, pcola }, randFactory);
      if (q >= UPPER_TRIGGER) W = rails.upperW!;
      else if (q <= LOWER_TRIGGER) W = rails.lowerW!;
    }

    PV -= W;
    if (PV <= 0) return { success: false, finalPV: 0, vol: welfordStd(returnsVar), mdd: minDD };

    const r = genReturn(rand);
    PV *= 1 + r;
    P *= 1 + pcola;

    welfordAdd(returnsVar, r);
    if (PV > peak) peak = PV;
    const dd = (PV - peak) / peak;
    if (dd < minDD) minDD = dd;
  }
  return { success: true, finalPV: PV, vol: welfordStd(returnsVar), mdd: minDD };
}

function probe_LEGACY(
  params: { PV: number; W: number; P: number; T: number; pcola: number },
  randFactory: RandFactory
): number {
  const K = 220;
  let ok = 0;
  for (let i = 0; i < K; i++) {
    let PV = params.PV;
    const W = params.W;
    let P = params.P;
    const rand = randFactory();
    let alive = true;
    for (let t = 1; t <= params.T; t++) {
      PV -= W;
      if (PV <= 0) { alive = false; break; }
      PV *= 1 + genReturn(rand);
      P *= 1 + params.pcola;
    }
    if (alive) ok++;
  }
  return ok / K;
}

function findPV_LEGACY(base: BasePathParams, target: number, randFactory: RandFactory): number {
  let lo = 50_000, hi = 5_000_000, best = base.PV;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const trial = { ...base, PV: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_LEGACY(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (hi = mid) : (lo = mid);
  }
  return best;
}

function findW_LEGACY(
  currentPV: number, currentW: number, base: BasePathParams, target: number, randFactory: RandFactory
): number {
  let lo = Math.max(1, currentW * 0.4), hi = Math.max(currentW * 2.0, currentW + 100_000), best = currentW;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    const trial = { ...base, PV: currentPV, W: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_LEGACY(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (lo = mid) : (hi = mid);
  }
  return best;
}

function pvForTargetIncome_TOTAL(
  base: BasePathParams, targetIncome: number, randFactory: RandFactory
): { pv: number; income80: number } {
  let lo = 50_000, hi = 5_000_000, ans = hi;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const s80 = findS_TOTAL(mid, { ...base }, UPPER_RESET, randFactory);
    if (Math.abs(s80 - targetIncome) <= 500) { ans = mid; break; }
    if (s80 < targetIncome) lo = mid; else hi = mid;
    ans = hi;
  }
  const s80f = findS_TOTAL(ans, { ...base }, UPPER_RESET, randFactory);
  return { pv: Math.round(ans), income80: Math.round(s80f) };
}

function pvForTargetIncome_LEGACY(
  base: BasePathParams, currentW: number, targetIncome: number, randFactory: RandFactory
): { pv: number; income80: number } {
  const P0 = incomeAt(0, base.incomes || [], base.cpi || 0);
  let lo = 50_000, hi = 5_000_000, ans = hi;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const w80 = findW_LEGACY(mid, Math.max(1, currentW), { ...base }, UPPER_RESET, randFactory);
    const s80 = w80 + P0;
    if (Math.abs(s80 - targetIncome) <= 500) { ans = mid; break; }
    if (s80 < targetIncome) lo = mid; else hi = mid;
    ans = hi;
  }
  const w80f = findW_LEGACY(ans, Math.max(1, currentW), { ...base }, UPPER_RESET, randFactory);
  return { pv: Math.round(ans), income80: Math.round(w80f + P0) };
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
  return a[idx];
}

/** Build the engine config from calculator inputs (mirrors buildConfig() in the original). */
function buildConfig(inputs: GuardrailsInputs) {
  const PV0 = inputs.portfolio;
  const r0 = inputs.withdrawRatePct / 100;
  const WA = inputs.withdrawAmount;
  const cpi = inputs.inflation / 100;

  const ageRet = inputs.ageRetire;
  const ageEnd = inputs.ageEnd;
  const ssAge = inputs.ssAge;
  const penAge = inputs.pensionAge;

  const T = Math.max(1, ageEnd - ageRet);
  const ssStart = Math.max(0, ssAge - ageRet);
  const pensionStart = Math.max(0, penAge - ageRet);

  const incomes: IncomeStream[] = [];
  if (inputs.pension > 0) incomes.push({ amt: inputs.pension, start: pensionStart, colaNom: inputs.pensionCola / 100 });
  if (inputs.ss > 0) incomes.push({ amt: inputs.ss, start: ssStart, colaNom: inputs.ssCola / 100 });

  const W0 = inputs.mode === 'tune' ? 0 : inputs.byPercent ? PV0 * r0 : WA;

  return {
    engine: inputs.engine,
    mode: inputs.mode,
    PV0, W0, T, cpi, incomes,
    D: 0, yD: 0,
    N: inputs.numSims,
    seed: inputs.seed,
    applyGuardrails: inputs.applyGuardrails ? 'yes' : 'no',
    raisePct: inputs.raisePct,
  };
}

/**
 * Run the full Guardrails Monte Carlo analysis. This mirrors the `onmessage`
 * router in the original worker script, just called directly instead of
 * via postMessage. It's synchronous and can take a moment for large N —
 * callers should show a loading state around it.
 */
export function calculateGuardrails(inputs: GuardrailsInputs): GuardrailsResults {
  const c = buildConfig(inputs);
  const seedBase = c.seed == null || Number(c.seed) === 0 ? null : Number(c.seed) >>> 0;

  const probeRF = seqFactory(seedBase, 'probe');
  const resRF = seqFactory(seedBase, 'res');

  const base: BasePathParams = {
    PV: c.PV0, W: c.W0, T: c.T, yD: c.yD || 0, D: c.D || 0,
    incomes: c.incomes || [], cpi: c.cpi || 0,
  };

  let startIncome = 0, upperPV = 0, lowerPV = 0, upperIncome = 0, lowerIncome = 0;
  const N = c.N;
  const results: PathResult[] = [];
  let S0 = 0;
  let W0_used = base.W || 0;

  if (c.engine === 'total') {
    S0 = c.mode === 'tune'
      ? findS_TOTAL(c.PV0, base, START_TARGET, probeRF)
      : (base.W || 0) + incomeAt(0, base.incomes!, base.cpi!);
    upperPV = findPV_TOTAL({ ...base }, S0, UPPER_TRIGGER, probeRF);
    lowerPV = findPV_TOTAL({ ...base }, S0, LOWER_TRIGGER, probeRF);
    const upperS = findS_TOTAL(upperPV, { ...base }, UPPER_RESET, probeRF);
    const lowerS = findS_TOTAL(lowerPV, { ...base }, LOWER_RESET, probeRF);
    const rails: Rails | null = c.applyGuardrails === 'yes' ? { upperS, lowerS } : null;
    for (let i = 0; i < N; i++) results.push(runPath_TOTAL({ ...base, S0 }, resRF, rails));

    startIncome = Math.round(S0);
    upperIncome = Math.round(upperS);
    lowerIncome = Math.round(lowerS);
  } else {
    W0_used = c.mode === 'tune'
      ? findW_LEGACY(c.PV0, Math.max(1, base.W || 1), base, START_TARGET, probeRF)
      : base.W || 0;
    upperPV = findPV_LEGACY({ ...base, W: W0_used }, UPPER_TRIGGER, probeRF);
    lowerPV = findPV_LEGACY({ ...base, W: W0_used }, LOWER_TRIGGER, probeRF);
    const upperW = findW_LEGACY(upperPV, W0_used, { ...base }, UPPER_RESET, probeRF);
    const lowerW = findW_LEGACY(lowerPV, W0_used, { ...base }, LOWER_RESET, probeRF);
    const rails: Rails | null = c.applyGuardrails === 'yes' ? { upperW, lowerW } : null;
    const P0_temp = incomeAt(0, base.incomes!, base.cpi!);
    for (let i = 0; i < N; i++) {
      results.push(runPath_LEGACY({ ...base, W: W0_used, P: P0_temp, pcola: 0 }, resRF, rails));
    }
    startIncome = Math.round(W0_used + P0_temp);
    upperIncome = Math.round(upperW + P0_temp);
    lowerIncome = Math.round(lowerW + P0_temp);
  }

  const pNow = c.engine === 'total'
    ? probe_TOTAL({ PV: c.PV0, S: S0, T: base.T, incomes: base.incomes!, cpi: base.cpi! }, probeRF)
    : probe_LEGACY({ PV: c.PV0, W: W0_used, P: incomeAt(0, base.incomes!, base.cpi!), T: base.T, pcola: 0 }, probeRF);

  let raiseNowIncome: number | null = null;
  if (pNow >= UPPER_TRIGGER) {
    if (c.engine === 'total') {
      raiseNowIncome = Math.round(findS_TOTAL(c.PV0, { ...base }, UPPER_RESET, probeRF));
    } else {
      const wNow80 = findW_LEGACY(c.PV0, Math.max(1, W0_used), { ...base }, UPPER_RESET, probeRF);
      raiseNowIncome = Math.round(wNow80 + incomeAt(0, base.incomes!, base.cpi!));
    }
  }

  const raiseFrac = Math.max(0, (c.raisePct || 0) / 100);
  let pvForRaise: number | null = null, incomeAtRaise: number | null = null;
  if (raiseFrac > 0) {
    const targetIncome = startIncome * (1 + raiseFrac);
    if (c.engine === 'total') {
      const out = pvForTargetIncome_TOTAL({ ...base }, targetIncome, probeRF);
      pvForRaise = out.pv; incomeAtRaise = out.income80;
    } else {
      const out = pvForTargetIncome_LEGACY({ ...base }, W0_used, targetIncome, probeRF);
      pvForRaise = out.pv; incomeAtRaise = out.income80;
    }
  }

  const pHat = successRate(results);
  const se = Math.sqrt((pHat * (1 - pHat)) / N);
  const ciL = Math.max(0, pHat - 1.96 * se);
  const ciU = Math.min(1, pHat + 1.96 * se);

  const P0 = incomeAt(0, base.incomes!, base.cpi!);
  const W0_port = Math.max(0, startIncome - P0);
  const impliedWR = c.PV0 > 0 ? W0_port / c.PV0 : 0;

  const upperNote = 'If your current wealth were ' + Math.round(upperPV).toLocaleString() + ' today';
  const lowerNote = 'If your current wealth were ' + Math.round(lowerPV).toLocaleString() + ' today';

  const finals = results.map((r) => r.finalPV ?? 0);
  const mdds = results.map((r) => r.mdd ?? 0);
  const vols = results.map((r) => r.vol ?? 0);

  const telemetry = {
    finalPV: {
      p10: Math.round(percentile(finals, 0.1)),
      p50: Math.round(percentile(finals, 0.5)),
      p90: Math.round(percentile(finals, 0.9)),
    },
    maxDrawdown: {
      p10: +percentile(mdds, 0.1).toFixed(3),
      p50: +percentile(mdds, 0.5).toFixed(3),
      p90: +percentile(mdds, 0.9).toFixed(3),
    },
    pathVol: {
      p10: +percentile(vols, 0.1).toFixed(3),
      p50: +percentile(vols, 0.5).toFixed(3),
      p90: +percentile(vols, 0.9).toFixed(3),
    },
  };

  return {
    pHat, ciL, ciU, startIncome,
    upperPV: Math.round(upperPV), lowerPV: Math.round(lowerPV),
    upperIncome, lowerIncome,
    engine: c.engine as GuardrailsResults['engine'],
    mode: c.mode as GuardrailsResults['mode'],
    P0: Math.round(P0), W0_port: Math.round(W0_port), impliedWR,
    upperNote, lowerNote,
    pNow, raiseNowIncome,
    raiseTargetPct: c.raisePct || 0, pvForRaise, incomeAtRaise,
    UPPER_TRIGGER, LOWER_TRIGGER, UPPER_RESET, LOWER_RESET,
    telemetry,
  };
}

/** Shape of the config actually used for a run — exposed so Volatility/Methods
 *  pages can rebuild percentile paths and worked examples from the same inputs. */
export interface GuardrailsRunConfig {
  engine: GuardrailsInputs['engine'];
  mode: GuardrailsInputs['mode'];
  PV0: number;
  T: number;
  cpi: number;
  N: number;
  incomes: IncomeStream[];
}

export function buildRunConfig(inputs: GuardrailsInputs): GuardrailsRunConfig {
  const c = buildConfig(inputs);
  return { engine: c.engine as GuardrailsInputs['engine'], mode: c.mode as GuardrailsInputs['mode'], PV0: c.PV0, T: c.T, cpi: c.cpi, N: c.N, incomes: c.incomes };
}

export const GUARDRAILS_LAST_RUN_KEY = 'mc_last_run';

export interface GuardrailsSnapshot {
  inputs: GuardrailsRunConfig;
  results: GuardrailsResults;
  savedAt: string;
}

export function saveGuardrailsSnapshot(inputs: GuardrailsInputs, results: GuardrailsResults) {
  const snapshot: GuardrailsSnapshot = {
    inputs: buildRunConfig(inputs),
    results,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(GUARDRAILS_LAST_RUN_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage can fail in private-browsing contexts; Volatility/Methods
    // pages handle a missing snapshot gracefully, so this is safe to ignore.
  }
}

export function loadGuardrailsSnapshot(): GuardrailsSnapshot | null {
  try {
    const raw = localStorage.getItem(GUARDRAILS_LAST_RUN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuardrailsSnapshot;
  } catch {
    return null;
  }
}

export const GUARDRAILS_DEFAULTS: GuardrailsInputs = {
  engine: 'total',
  mode: 'manual',
  byPercent: true,
  ageNow: 21,
  ageRetire: 65,
  ageEnd: 90,
  ssAge: 67,
  pensionAge: 67,
  portfolio: 100000,
  inflation: 3,
  withdrawRatePct: 3.5,
  withdrawAmount: 3500,
  pension: 0,
  pensionCola: 2.5,
  ss: 0,
  ssCola: 2.5,
  raisePct: 10,
  applyGuardrails: true,
  seed: null,
  numSims: 1000,
};
