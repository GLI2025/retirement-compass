import { useState, useMemo } from 'react';
import { Award } from 'lucide-react';
import { MilitaryPensionInputs, MilitaryBranch, PayPlan, RetirementPlanType } from '@/types/militaryPension';
import {
  BRANCH_LABELS,
  MILITARY_PENSION_DEFAULTS,
  branchSupportsWarrant,
  calculateMilitaryPension,
  findPay,
  gradesFor,
} from '@/lib/calculations/militaryPension';

const BRANCHES: { key: MilitaryBranch; badge: string }[] = [
  { key: 'army', badge: 'ARMY' },
  { key: 'navy', badge: 'NAVY' },
  { key: 'airforce', badge: 'USAF' },
  { key: 'marines', badge: 'USMC' },
  { key: 'uscg', badge: 'USCG' },
  { key: 'spaceforce', badge: 'USSF' },
];

const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function MilitaryPensionCalculator() {
  const [inputs, setInputs] = useState<MilitaryPensionInputs>(MILITARY_PENSION_DEFAULTS);
  const [toast, setToast] = useState('');

  const update = <K extends keyof MilitaryPensionInputs>(key: K, value: MilitaryPensionInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const selectBranch = (branch: MilitaryBranch) => {
    let payplan = inputs.payplan;
    if (payplan === 'warr' && !branchSupportsWarrant(branch)) payplan = 'enl';
    const grades = gradesFor(payplan);
    const grade = grades.includes(inputs.grade) ? inputs.grade : grades[0];
    setInputs((prev) => ({ ...prev, branch, payplan, grade, finalPayOverride: null }));
  };

  const grades = useMemo(() => gradesFor(inputs.payplan), [inputs.payplan]);
  const autoPay = useMemo(
    () => findPay(inputs.payplan, inputs.grade, Math.max(0, inputs.yos || 0)),
    [inputs.payplan, inputs.grade, inputs.yos]
  );
  const results = useMemo(
    () => calculateMilitaryPension({ ...inputs, finalPayOverride: inputs.finalPayOverride ?? autoPay }),
    [inputs, autoPay]
  );

  const copySummary = async () => {
    const payplanLabel = { enl: 'Enlisted', warr: 'Warrant Officer', off: 'Commissioned Officer' }[inputs.payplan];
    const planLabel = { final: 'Final/High-36', redux: 'REDUX', brs: 'BRS', disab: 'Disability' }[inputs.plan];
    const text = [
      `Service: ${inputs.branch ? BRANCH_LABELS[inputs.branch] : '—'}`,
      `Pay Plan: ${payplanLabel}`,
      `Grade: ${inputs.grade}`,
      `Years of Service: ${inputs.yos}`,
      `Retirement Plan: ${planLabel}`,
      `Final Basic Pay (Monthly): ${money(results.finalPay)}`,
      `Multiplier: ${(results.multiplierPct * 100).toFixed(1)}% (${inputs.plan.toUpperCase()})`,
      `Estimated Pension — Monthly: ${money(results.monthly)}, Annual: ${money(results.annual)}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setToast('Summary copied to clipboard ✅');
    } catch {
      setToast('Could not copy. Select & copy manually.');
    }
    setTimeout(() => setToast(''), 1800);
  };

  const showDisability = inputs.plan === 'disab';

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">DFAS 2025 Base Pay Tables</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Military Pension</span>
            <br />
            <span className="text-foreground">Estimator</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            For active-duty servicemembers under Final Pay, High-36, REDUX, or BRS. Assumes
            continuous full-time active service. Doesn't calculate taxes, VA disability offsets,
            or COLA. Not for Reserve/National Guard or mixed active/reserve careers.
          </p>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 space-y-6">
        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Step 1: Select your Service Branch</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {BRANCHES.map((b) => (
              <button
                key={b.key}
                onClick={() => selectBranch(b.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                  inputs.branch === b.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-extrabold">
                  {b.badge}
                </span>
                <span className="text-xs font-medium">{BRANCH_LABELS[b.key]}</span>
              </button>
            ))}
          </div>
        </section>

        {inputs.branch && (
          <>
            <section className="glass-card p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold">Steps 2–3: Your Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  Pay Plan
                  <select
                    value={inputs.payplan}
                    onChange={(e) => {
                      const payplan = e.target.value as PayPlan;
                      const g = gradesFor(payplan);
                      update('payplan', payplan);
                      update('grade', g[0]);
                    }}
                    className="p-2.5 rounded-lg border border-border bg-background"
                  >
                    <option value="enl">Enlisted</option>
                    <option value="warr" disabled={!branchSupportsWarrant(inputs.branch)}>
                      Warrant Officer
                    </option>
                    <option value="off">Commissioned Officer</option>
                  </select>
                  <span className="text-xs text-muted-foreground">Matches E-, W-, or O- grades.</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                  Grade
                  <select
                    value={inputs.grade}
                    onChange={(e) => update('grade', e.target.value)}
                    className="p-2.5 rounded-lg border border-border bg-background"
                  >
                    {grades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">Example: E-7, W-3, O-4.</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                  Years of Service (YOS)
                  <input
                    type="number" min={1} max={41} value={inputs.yos}
                    onChange={(e) => update('yos', Number(e.target.value))}
                    className="p-2.5 rounded-lg border border-border bg-background"
                  />
                  <span className="text-xs text-muted-foreground">Full creditable years at retirement.</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                  Final Basic Pay (Monthly, $)
                  <input
                    type="number" step={0.01} min={0}
                    value={(inputs.finalPayOverride ?? autoPay).toFixed(2)}
                    onChange={(e) => update('finalPayOverride', Number(e.target.value))}
                    className="p-2.5 rounded-lg border border-border bg-background"
                  />
                  <span className="text-xs text-muted-foreground">
                    Auto-filled from 2025 DFAS by Grade × YOS (override if needed).
                  </span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  Retirement Plan
                  <select
                    value={inputs.plan}
                    onChange={(e) => update('plan', e.target.value as RetirementPlanType)}
                    className="p-2.5 rounded-lg border border-border bg-background"
                  >
                    <option value="final">Final Pay / High-36 (2.5% per year)</option>
                    <option value="redux">REDUX (−1% per year under 30 YOS)</option>
                    <option value="brs">BRS (2.0% per year)</option>
                    <option value="disab">Disability (higher of % or service-based)</option>
                  </select>
                  <span className="text-xs text-muted-foreground">Pick which rule set applies.</span>
                </label>

                {showDisability && (
                  <>
                    <label className="flex flex-col gap-1.5 text-sm">
                      Disability Percentage (%)
                      <input
                        type="number" min={0} max={75} step={0.1}
                        value={inputs.disabilityPct}
                        onChange={(e) => update('disabilityPct', Number(e.target.value))}
                        className="p-2.5 rounded-lg border border-border bg-background"
                      />
                      <span className="text-xs text-muted-foreground">Service-assigned %, capped at 75%.</span>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      Disability: Base Plan for Comparison
                      <select
                        value={inputs.disabilityBase}
                        onChange={(e) => update('disabilityBase', e.target.value as 'final' | 'brs')}
                        className="p-2.5 rounded-lg border border-border bg-background"
                      >
                        <option value="final">Final/High-36 (2.5%/yr)</option>
                        <option value="brs">BRS (2.0%/yr)</option>
                      </select>
                      <span className="text-xs text-muted-foreground">
                        We compare this service-based % to your disability % and use the higher.
                      </span>
                    </label>
                  </>
                )}
              </div>
            </section>

            <section className="glass-card p-4 sm:p-6 space-y-3">
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Multiplier</span>
                <strong>{(results.multiplierPct * 100).toFixed(1)}% ({inputs.plan.toUpperCase()})</strong>
              </div>
              <div className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">Pension (Monthly)</span>
                <strong>{money(results.monthly)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pension (Annual)</span>
                <strong>{money(results.annual)}</strong>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={copySummary}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500"
                >
                  Copy summary
                </button>
                {toast && <span className="text-sm text-emerald-600">{toast}</span>}
              </div>

              <details className="pt-2">
                <summary className="text-sm font-semibold cursor-pointer">Explain my number</summary>
                <p className="text-sm text-muted-foreground mt-2">{results.explain}</p>
              </details>
            </section>
          </>
        )}

        <footer className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <p className="mb-2">
            <strong>Note:</strong> this calculator is not an official government website and is not
            endorsed or approved by the Department of Defense (DoD), DFAS, or any military branch.
            It is an independent educational tool developed to help servicemembers understand how
            military retired pay is calculated.
          </p>
          <p>
            For official estimates, confirm using{' '}
            <a href="https://mypay.dfas.mil/" target="_blank" rel="noopener noreferrer" className="underline">
              DFAS.mil
            </a>{' '}
            or your branch finance office.
          </p>
        </footer>
      </main>
    </div>
  );
}
