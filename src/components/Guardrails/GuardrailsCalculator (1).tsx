import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { GuardrailsInputs, GuardrailsResults } from '@/types/guardrails';
import { GUARDRAILS_DEFAULTS, calculateGuardrails } from '@/lib/calculations/guardrails';
import { StepInput } from '../calculator/StepInput';

const money = (n: number) => '$' + Math.round(n).toLocaleString();
const pct0 = (n: number) => (n * 100).toFixed(0) + '%';

function band(p: number): { cls: string; label: string } {
  if (p >= 0.85) return { cls: 'text-emerald-600', label: 'On Track' };
  if (p >= 0.7) return { cls: 'text-amber-600', label: 'Watch List' };
  if (p >= 0.55) return { cls: 'text-red-600', label: 'Needs Attention' };
  return { cls: 'text-red-600', label: 'High Risk' };
}

export function GuardrailsCalculator() {
  const [inputs, setInputs] = useState<GuardrailsInputs>(GUARDRAILS_DEFAULTS);
  const [results, setResults] = useState<GuardrailsResults | null>(null);
  const [running, setRunning] = useState(false);

  const updateInput = <K extends keyof GuardrailsInputs>(key: K, value: GuardrailsInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const runSimulation = () => {
    setRunning(true);
    // Let the UI paint the loading state before the (synchronous) crunch runs.
    setTimeout(() => {
      const r = calculateGuardrails(inputs);
      setResults(r);
      setRunning(false);
    }, 30);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Flexible Spending, Modeled With Monte Carlo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Guardrails</span>
            <br />
            <span className="text-foreground">Retirement Calculator</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Instead of a fixed withdrawal, guardrails let your spending flex within a safe
            range based on how markets actually perform. This tool estimates your odds of
            success and shows when you could take a raise or should consider a cut.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 space-y-8">
        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Engine</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
              <input
                type="radio"
                checked={inputs.engine === 'total'}
                onChange={() => updateInput('engine', 'total')}
              />
              <span className="text-sm">
                <strong>Total income</strong>
                <br />
                <span className="text-muted-foreground">pension + Social Security</span>
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
              <input
                type="radio"
                checked={inputs.engine === 'legacy'}
                onChange={() => updateInput('engine', 'legacy')}
              />
              <span className="text-sm">
                <strong>Legacy</strong>
                <br />
                <span className="text-muted-foreground">portfolio withdrawals only</span>
              </span>
            </label>
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Ages</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Your Age (now)" value={inputs.ageNow} onChange={(v) => updateInput('ageNow', v)} min={18} max={95} step={1} />
            <StepInput label="Planned Retirement Age" value={inputs.ageRetire} onChange={(v) => updateInput('ageRetire', v)} min={30} max={95} step={1} />
            <StepInput label="SS Claim Age" value={inputs.ssAge} onChange={(v) => updateInput('ssAge', v)} min={60} max={70} step={1} />
            <StepInput label="Pension Start Age" value={inputs.pensionAge} onChange={(v) => updateInput('pensionAge', v)} min={21} max={80} step={1} />
            <StepInput label="Run Calculator Until Age" value={inputs.ageEnd} onChange={(v) => updateInput('ageEnd', v)} min={60} max={110} step={1} />
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Portfolio &amp; {inputs.engine === 'total' ? 'Spending Target' : 'Withdrawals'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Initial Portfolio" value={inputs.portfolio} onChange={(v) => updateInput('portfolio', v)} min={0} step={10000} prefix="$" />
            <StepInput label="CPI (% nominal)" value={inputs.inflation} onChange={(v) => updateInput('inflation', v)} min={0} max={6} step={0.5} suffix="%" />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={inputs.mode === 'tune'} onChange={() => updateInput('mode', 'tune')} />
              Tune to ~80% success
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={inputs.mode === 'manual' && inputs.byPercent}
                onChange={() => { updateInput('mode', 'manual'); updateInput('byPercent', true); }}
              />
              {inputs.engine === 'total' ? 'Manual spending by %' : 'Manual by %'}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={inputs.mode === 'manual' && !inputs.byPercent}
                onChange={() => { updateInput('mode', 'manual'); updateInput('byPercent', false); }}
              />
              {inputs.engine === 'total' ? 'Manual spending by $' : 'Manual by $'}
            </label>
          </div>

          {inputs.mode === 'manual' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {inputs.byPercent ? (
                <StepInput
                  label={inputs.engine === 'total' ? 'Annual Spending Target (% of portfolio)' : 'Initial Withdrawal Rate'}
                  value={inputs.withdrawRatePct}
                  onChange={(v) => updateInput('withdrawRatePct', v)}
                  min={0} max={12} step={0.1} suffix="%"
                />
              ) : (
                <StepInput
                  label={inputs.engine === 'total' ? 'Annual Spending Target' : 'Starting Portfolio Withdrawal'}
                  value={inputs.withdrawAmount}
                  onChange={(v) => updateInput('withdrawAmount', v)}
                  min={0} step={500} prefix="$"
                />
              )}
            </div>
          )}
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Guaranteed Income</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Annual Pension" value={inputs.pension} onChange={(v) => updateInput('pension', v)} min={0} step={1000} prefix="$" />
            <StepInput label="Pension COLA" value={inputs.pensionCola} onChange={(v) => updateInput('pensionCola', v)} min={0} max={6} step={0.5} suffix="%" />
            <StepInput label="Social Security" value={inputs.ss} onChange={(v) => updateInput('ss', v)} min={0} step={500} prefix="$" />
            <StepInput label="SS COLA" value={inputs.ssCola} onChange={(v) => updateInput('ssCola', v)} min={0} max={6} step={0.5} suffix="%" />
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Guardrails</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Raise Income Target" value={inputs.raisePct} onChange={(v) => updateInput('raisePct', v)} min={1} max={100} step={1} suffix="%" />
            <StepInput label="Monte Carlo Paths" value={inputs.numSims} onChange={(v) => updateInput('numSims', v)} min={200} max={5000} step={100} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inputs.applyGuardrails}
              onChange={(e) => updateInput('applyGuardrails', e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Apply guardrails during simulation (raise near 99% success, cut near 25%)</span>
          </label>
        </section>

        <div className="flex justify-center">
          <button
            onClick={runSimulation}
            disabled={running}
            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary/70 hover:brightness-105 transition disabled:opacity-60 flex items-center gap-2"
          >
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
            {running ? 'Running Monte Carlo…' : 'Run Monte Carlo'}
          </button>
        </div>

        {results && (
          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="text-muted-foreground">Engine</div>
              <div className="font-medium">
                {results.engine === 'total' ? 'Total income (pension + Social Security)' : 'Legacy (portfolio withdrawal)'}
              </div>

              <div className="text-muted-foreground">Spending stability</div>
              <div className={`font-semibold ${band(results.pHat).cls}`}>
                {results.pHat >= 0.99 ? '≥99%' : pct0(results.pHat)} — {band(results.pHat).label}
                {results.pHat < 0.99 && (
                  <span className="text-muted-foreground font-normal"> (likely {pct0(results.ciL)}–{pct0(results.ciU)})</span>
                )}
              </div>

              <div className="text-muted-foreground">{results.engine === 'total' ? 'Starting spending target' : 'Starting income'}</div>
              <div className="font-medium">{money(results.startIncome)}/yr</div>

              {results.raiseNowIncome != null && (
                <>
                  <div className="text-muted-foreground">Eligible raise now</div>
                  <div className="font-medium text-emerald-600">{money(results.raiseNowIncome)}/yr</div>
                </>
              )}

              <div className="text-muted-foreground">Year-0 breakdown</div>
              <div className="font-medium">
                Portfolio {money(results.W0_port)} ({(results.impliedWR * 100).toFixed(2)}%) + Guaranteed {money(results.P0)}
              </div>

              {results.pvForRaise != null && (
                <>
                  <div className="text-muted-foreground">Modest raise (+{results.raiseTargetPct}% target)</div>
                  <div className="font-medium">{money(results.pvForRaise)} portfolio needed</div>
                </>
              )}

              {results.W0_port === 0 ? (
                <>
                  <div className="text-muted-foreground">Portfolio guardrail</div>
                  <div className="font-medium text-emerald-600">
                    Guaranteed income fully covers the starting spending target, so no portfolio cut threshold applies today.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-muted-foreground">Cut threshold (≈25% today)</div>
                  <div className="font-medium text-amber-600">
                    {money(results.lowerPV)} — {results.lowerNote}, cut to ~{money(results.lowerIncome)}/yr
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <p className="mb-2">
            <strong>Educational purposes only.</strong> No calculator can guarantee outcomes.
            Markets, inflation, taxes, fees, and your spending can change. Treat these results
            as decision support, not a promise.
          </p>
          <p>Consult a qualified financial advisor before making retirement spending decisions.</p>
        </footer>
      </main>
    </div>
  );
}
