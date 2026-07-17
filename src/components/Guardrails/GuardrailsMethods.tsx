import { Link } from 'react-router-dom';
import { loadGuardrailsSnapshot } from '@/lib/calculations/guardrails';

const money = (n: number) => '$' + Math.round(n || 0).toLocaleString();

function FormulaCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4 sm:p-6 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

export function GuardrailsMethods() {
  const snapshot = loadGuardrailsSnapshot();

  return (
    <div className="min-h-screen pb-12">
      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Methods &amp; Formulas</h1>

        <FormulaCard title="Spending Engines">
          <p>
            <strong className="text-foreground">Total (needs-based):</strong> desired income S is
            covered first by guaranteed income P<sub>t</sub>; the portfolio supplies the gap.
          </p>
          <p className="font-mono text-xs bg-muted/50 rounded-lg p-3">
            P_t = Σ amt_i · (1 + (COLA_nom_i − CPI))^max(0, t − start_i)
            <br />
            Withdraw_t = max(0, S − P_t)
          </p>
          <p>
            <strong className="text-foreground">Legacy (fixed from portfolio):</strong> the portfolio
            withdrawal is set once — Withdraw<sub>t</sub> = W₀.
          </p>
        </FormulaCard>

        <FormulaCard title="Guardrails">
          <p>
            A rule set that nudges spending up or down when the portfolio gets far ahead or behind
            plan. We estimate the probability the current spending level survives to the end of the
            horizon, and compare it against two thresholds:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>If success probability ≥ 99% → spending can rise (reset toward an 80% target).</li>
            <li>If success probability ≤ 25% → spending is cut (reset toward a 45% target).</li>
          </ul>
          <p>These are the same thresholds used in the calculator's Monte Carlo engine.</p>
        </FormulaCard>

        <FormulaCard title="Portfolio Path (per year)">
          <p>Each year: start with last year's balance, subtract spending, apply investment return.</p>
          <p className="font-mono text-xs bg-muted/50 rounded-lg p-3">
            PV_(t+1) = (PV_t − Withdraw_t) × (1 + r_t)
          </p>
          <p>
            The return r<sub>t</sub> combines stock and bond returns with fixed allocation weights
            (60% stocks / 40% bonds), drawn from correlated lognormal distributions
            (μ<sub>S</sub>=6%, σ<sub>S</sub>=18%, μ<sub>B</sub>=0%, σ<sub>B</sub>=6%, correlation 0.10).
            These are illustrative long-run assumptions, not forecasts.
          </p>
        </FormulaCard>

        <FormulaCard title="Risk Summaries">
          <p>
            <strong className="text-foreground">Percentiles (p10 / p50 / p90):</strong> summarize the
            distribution of outcomes across all simulated paths — p10 is a poorer scenario, p50 is
            the median, p90 is optimistic.
          </p>
          <p className="font-mono text-xs bg-muted/50 rounded-lg p-3">
            MDD = max_t (Peak_t − PV_t) / Peak_t
          </p>
          <p>Max drawdown is the largest peak-to-trough decline over time.</p>
        </FormulaCard>

        <div className="glass-card p-4 sm:p-6 space-y-3">
          <h2 className="text-lg font-semibold">Your Inputs Plugged Into the Math</h2>
          {!snapshot ? (
            <p className="text-sm text-destructive">
              No recent run found. Go to the calculator, run it, then return here.
            </p>
          ) : (
            <WorkedExample snapshot={snapshot} />
          )}
        </div>

        <div className="flex gap-3">
          <Link to="/guardrails" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500">
            ← Back to Calculator
          </Link>
          <Link to="/guardrails/volatility" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500">
            Volatility &amp; Drawdown
          </Link>
        </div>
      </main>
    </div>
  );
}

function WorkedExample({ snapshot }: { snapshot: NonNullable<ReturnType<typeof loadGuardrailsSnapshot>> }) {
  const { inputs, results } = snapshot;
  const engine = results.engine;
  const S = results.startIncome ?? results.P0 + results.W0_port;

  const toRealCola = (nom: number, cpi: number) => (nom || 0) - (cpi || 0);
  const incomeAtYear = (t: number) => {
    let s = 0;
    for (const inc of inputs.incomes || []) {
      if (t >= (inc.start || 0)) {
        const yrs = t - (inc.start || 0);
        s += inc.amt * Math.pow(1 + toRealCola(inc.colaNom, inputs.cpi), yrs);
      }
    }
    return s;
  };

  const years = Math.min(inputs.T, 5);
  const rows = Array.from({ length: years + 1 }, (_, t) => {
    const Pt = incomeAtYear(t);
    const withdraw = engine === 'total' ? Math.max(0, S - Pt) : results.W0_port;
    return { t, Pt, withdraw };
  });

  return (
    <div className="text-sm space-y-3 font-mono">
      <div>
        <span className="text-muted-foreground">Engine:</span>{' '}
        {engine === 'total' ? 'TOTAL (needs-based)' : 'LEGACY (fixed from portfolio)'}
      </div>
      <div>
        <span className="text-muted-foreground">PV₀:</span> {money(inputs.PV0)} ·{' '}
        <span className="text-muted-foreground">CPI:</span> {(inputs.cpi * 100).toFixed(1)}% ·{' '}
        <span className="text-muted-foreground">T:</span> {inputs.T} yrs
      </div>
      {engine === 'total' ? (
        <div>
          <span className="text-muted-foreground">S (desired income):</span> {money(S)}
        </div>
      ) : (
        <div>
          <span className="text-muted-foreground">W₀ (fixed portfolio withdrawal):</span> {money(results.W0_port)}
        </div>
      )}

      <div className="overflow-auto border border-border rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 border-b border-border">t (year)</th>
              <th className="text-right p-2 border-b border-border">P_t (guaranteed)</th>
              <th className="text-right p-2 border-b border-border">Withdraw_t</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.t}>
                <td className="p-2 border-b border-border">t{r.t}</td>
                <td className="p-2 border-b border-border text-right">{money(r.Pt)}</td>
                <td className="p-2 border-b border-border text-right">{money(r.withdraw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground font-sans">
        Note: portfolio growth uses random market draws per the return model above; this worked
        example focuses on how P<sub>t</sub> and Withdraw<sub>t</sub> are computed from your inputs.
      </p>
    </div>
  );
}
