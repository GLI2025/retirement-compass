import { useMemo, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SavingsCalculatorInputs, PeriodsPerYear } from '@/types/savingsCalculator';
import { SAVINGS_CALCULATOR_DEFAULTS, calculateSavings } from '@/lib/calculations/savingsCalculator';

const money = (n: number) => '$' + Math.round(n).toLocaleString();

function NumField({ label, value, onChange, hint, step }: { label: string; value: number; onChange: (v: number) => void; hint?: string; step?: number }) {
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

export function SavingsCalculator() {
  const [inputs, setInputs] = useState<SavingsCalculatorInputs>(SAVINGS_CALCULATOR_DEFAULTS);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const update = <K extends keyof SavingsCalculatorInputs>(key: K, value: SavingsCalculatorInputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const results = useMemo(() => calculateSavings(inputs), [inputs]);
  const whatIfResults = useMemo(
    () => calculateSavings({ ...inputs, empPct: inputs.empPct + 2 }),
    [inputs]
  );

  const chartData = useMemo(() => {
    return results.yearly.map((y, i) => ({
      year: y.year,
      balance: Math.round(y.endingBalance),
      whatIf: showWhatIf ? Math.round(whatIfResults.yearly[i]?.endingBalance ?? 0) : undefined,
    }));
  }, [results, whatIfResults, showWhatIf]);

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <PiggyBank className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Savings + Employer Match</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Savings</span>
            <br />
            <span className="text-foreground">Calculator</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Project your account balance with regular contributions and employer matching.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 grid lg:grid-cols-[380px_1fr] gap-6">
        <section className="glass-card p-4 sm:p-6 space-y-3 h-fit">
          <h2 className="text-lg font-semibold">Inputs</h2>
          <NumField label="Starting balance" value={inputs.start} onChange={(v) => update('start', v)} step={100} hint="Your current account balance (USD)." />
          <NumField label="Annual salary" value={inputs.salary} onChange={(v) => update('salary', v)} step={1000} hint="Gross salary per year." />
          <NumField label="Employee contribution (%)" value={inputs.empPct} onChange={(v) => update('empPct', v)} step={0.5} hint="Percent of salary you contribute." />
          <NumField label="Employer match rate (%)" value={inputs.matchRate} onChange={(v) => update('matchRate', v)} hint='Example: 50 means "50% match".' />
          <NumField label="Employer match cap (% of salary)" value={inputs.matchCap} onChange={(v) => update('matchCap', v)} step={0.5} hint='Example: 6 means "match up to 6% of salary".' />
          <NumField label="Annual return (%)" value={inputs.returnPct} onChange={(v) => update('returnPct', v)} step={0.1} hint="Average annual growth assumption." />
          <NumField label="Salary growth (% / yr)" value={inputs.raisePct} onChange={(v) => update('raisePct', v)} step={0.1} hint="Annual raise rate." />
          <NumField label="Years" value={inputs.years} onChange={(v) => update('years', v)} hint="How long you'll contribute." />
          <label className="flex flex-col gap-1.5 text-sm">
            Periods per year
            <select
              value={inputs.periodsPerYear}
              onChange={(e) => update('periodsPerYear', Number(e.target.value) as PeriodsPerYear)}
              className="p-2.5 rounded-lg border border-border bg-background"
            >
              <option value={12}>Monthly (12)</option>
              <option value={24}>Semi-monthly (24)</option>
              <option value={26}>Biweekly (26)</option>
              <option value={52}>Weekly (52)</option>
            </select>
          </label>

          <button
            onClick={() => setShowWhatIf((v) => !v)}
            className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500"
          >
            {showWhatIf ? 'Hide' : 'What if I add +2%?'}
          </button>
        </section>

        <div className="space-y-6">
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="text-sm font-semibold mb-1">
                {inputs.years}-Year Projection ({inputs.empPct}% contribution)
              </div>
              <Row label="Final balance" value={money(results.finalBalance)} big />
              <Row label="Your contributions" value={money(results.totalEmployeeContrib)} />
              <Row label="Employer match" value={money(results.totalEmployerMatch)} />
              <Row label="Investment growth" value={money(results.totalGrowth)} />
            </div>
            {showWhatIf && (
              <div className="glass-card p-4 space-y-2 border-2 border-primary/30">
                <div className="text-sm font-semibold mb-1">
                  What if: {inputs.empPct + 2}% contribution
                </div>
                <Row label="Final balance" value={money(whatIfResults.finalBalance)} big />
                <Row label="Your contributions" value={money(whatIfResults.totalEmployeeContrib)} />
                <Row label="Employer match" value={money(whatIfResults.totalEmployerMatch)} />
                <Row label="Difference vs current" value={money(whatIfResults.finalBalance - results.finalBalance)} />
              </div>
            )}
          </section>

          <section className="glass-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-2">Balance Over Time</h2>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(v) => money(v)} width={90} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="balance" name={`Current (${inputs.empPct}%)`} dot={false} strokeWidth={2} />
                  {showWhatIf && (
                    <Line type="monotone" dataKey="whatIf" name={`+2% (${inputs.empPct + 2}%)`} dot={false} strokeWidth={2} strokeDasharray="5 5" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <footer className="text-xs text-muted-foreground">
            Educational estimate only, not financial advice. Assumes constant contribution rate,
            match structure, and return; actual results will vary with market performance and plan
            rules. Nothing here is saved or transmitted.
          </footer>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={big ? 'font-bold text-lg' : 'font-medium'}>{value}</span>
    </div>
  );
}
