import { useMemo, useState } from 'react';
import { Sailboat } from 'lucide-react';
import { SailAwayInputs, PathKey, LoanType } from '@/types/sailAway';
import { SAILAWAY_DEFAULTS, simulateBoth } from '@/lib/calculations/sailAway';
import { PathCard } from './PathCard';

const SAILING_PRESETS = [
  { key: 'low', label: 'Low $1,700', amount: 1700 },
  { key: 'medium', label: 'Medium $4,500', amount: 4500 },
  { key: 'high', label: 'High $8,000+', amount: 8000 },
];

function NumField({ label, value, onChange, step, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <input
        type="number"
        value={value}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="p-2.5 rounded-lg border border-border bg-background"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SailAwayCalculator() {
  const [inputs, setInputs] = useState<SailAwayInputs>(SAILAWAY_DEFAULTS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateGlobal = <K extends keyof SailAwayInputs['global']>(key: K, value: SailAwayInputs['global'][K]) =>
    setInputs((p) => ({ ...p, global: { ...p.global, [key]: value } }));

  const updatePath = (path: PathKey, patch: Partial<SailAwayInputs['paths'][PathKey]>) =>
    setInputs((p) => ({ ...p, paths: { ...p.paths, [path]: { ...p.paths[path], ...patch } } }));

  const updateLoanParams = <K extends keyof SailAwayInputs['loanParams']>(
    kind: K, patch: Partial<SailAwayInputs['loanParams'][K]>
  ) => setInputs((p) => ({ ...p, loanParams: { ...p.loanParams, [kind]: { ...p.loanParams[kind], ...patch } } }));

  const setLoanType = (path: PathKey, loan: LoanType) => updatePath(path, { loan });

  const sim = useMemo(() => ({
    A: simulateBoth('A', inputs),
    B: simulateBoth('B', inputs),
    C: simulateBoth('C', inputs),
  }), [inputs]);

  const sailingTotal = inputs.global.sailingBasePreset + inputs.global.sailingAdjustment;

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Sailboat className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Stop Dreaming. Start Calculating.</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">SailAway</span>
            <br />
            <span className="text-foreground">Calculator</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Compare three paths to casting off — go now, work and save first, or retire
            traditionally — with real loan math and optional stress-testing.
          </p>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 space-y-6">
        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Your Sailing Inputs</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumField label="Your Age" value={inputs.global.userAge} onChange={(v) => updateGlobal('userAge', v)} />
            <NumField label="Current Liquid Savings" value={inputs.global.liquidSavings} onChange={(v) => updateGlobal('liquidSavings', v)} step={1000} />
            <NumField label="Investable Portfolio" value={inputs.global.investablePortfolio} onChange={(v) => updateGlobal('investablePortfolio', v)} step={1000} />
            <NumField label="Monthly Land Cost (re-entry)" value={inputs.global.monthlyLandCost} onChange={(v) => updateGlobal('monthlyLandCost', v)} step={100} />
            <NumField label="Annual Household Income" value={inputs.global.annualIncome} onChange={(v) => updateGlobal('annualIncome', v)} step={1000} />
            <NumField label="Current Savings Rate (%)" value={inputs.global.savingsRate} onChange={(v) => updateGlobal('savingsRate', v)} />
            <NumField label="Passive Income (monthly)" value={inputs.global.passiveIncome} onChange={(v) => updateGlobal('passiveIncome', v)} step={100} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sailing Cost Preset</label>
            <div className="flex flex-wrap gap-2">
              {SAILING_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => updateGlobal('sailingBasePreset', p.amount) || updateGlobal('sailingAdjustment', 0)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    inputs.global.sailingBasePreset === p.amount
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateGlobal('sailingAdjustment', inputs.global.sailingAdjustment - 250)}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold"
              >
                −
              </button>
              <span className="font-semibold min-w-[90px] text-center">{formatMoneyShort(sailingTotal)}</span>
              <button
                onClick={() => updateGlobal('sailingAdjustment', inputs.global.sailingAdjustment + 250)}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold"
              >
                +
              </button>
            </div>
          </div>

          <button onClick={() => setShowAdvanced((v) => !v)} className="text-sm font-semibold text-primary underline">
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>
          {showAdvanced && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <NumField label="Inflation Rate (%/yr)" value={inputs.global.inflationRate} onChange={(v) => updateGlobal('inflationRate', v)} step={0.1} />
              <NumField label="Investment Return (%/yr)" value={inputs.global.investmentReturn} onChange={(v) => updateGlobal('investmentReturn', v)} step={0.1} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={inputs.global.stressTestEnabled} onChange={(e) => updateGlobal('stressTestEnabled', e.target.checked)} />
                Enable Stress Mode
              </label>
              <NumField label="Remote Income Volatility (%)" value={inputs.global.incomeVolatility} onChange={(v) => updateGlobal('incomeVolatility', v)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={inputs.global.stressRandomize} onChange={(e) => updateGlobal('stressRandomize', e.target.checked)} />
                Randomize stress year-by-year
              </label>
              <NumField label="Stress Seed" value={inputs.global.stressSeed} onChange={(v) => updateGlobal('stressSeed', v)} />
              <NumField label="Sailing Cost Uncertainty (%)" value={inputs.global.costUncertainty} onChange={(v) => updateGlobal('costUncertainty', v)} />
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <PathCard
            pathKey="A" title="F*** It, Go Now" icon="🚀"
            state={inputs.paths.A} loanParams={inputs.loanParams} sim={sim.A}
            userAge={inputs.global.userAge}
            onSetLoan={(l) => setLoanType('A', l)}
            onUpdatePath={(patch) => updatePath('A', patch)}
            onUpdateLoanParams={updateLoanParams}
          />
          <PathCard
            pathKey="B" title="Work, Save, Then Sail" icon="💼"
            state={inputs.paths.B} loanParams={inputs.loanParams} sim={sim.B}
            userAge={inputs.global.userAge}
            onSetLoan={(l) => setLoanType('B', l)}
            onUpdatePath={(patch) => updatePath('B', patch)}
            onUpdateLoanParams={updateLoanParams}
          />
          <PathCard
            pathKey="C" title="Traditional Retirement" icon="🏖️"
            state={inputs.paths.C} loanParams={inputs.loanParams} sim={sim.C}
            userAge={inputs.global.userAge}
            onSetLoan={(l) => setLoanType('C', l)}
            onUpdatePath={(patch) => updatePath('C', patch)}
            onUpdateLoanParams={updateLoanParams}
          />
        </section>

        <div className="glass-card p-4 text-center text-xs text-muted-foreground">
          <strong>Disclaimer:</strong> Educational tool only. Not financial, investment, tax, or
          legal advice. Outcomes vary. Loan and insurance terms are examples; confirm with your
          providers.
        </div>
      </main>
    </div>
  );
}

function formatMoneyShort(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}
