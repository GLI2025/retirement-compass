import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { loadGuardrailsSnapshot } from '@/lib/calculations/guardrails';
import { buildPercentilePaths } from '@/lib/calculations/guardrailsVolatility';

const money = (n: number) => '$' + Math.round(n || 0).toLocaleString();
const pct = (n: number) => ((n || 0) * 100).toFixed(1) + '%';

export function GuardrailsVolatility() {
  const snapshot = loadGuardrailsSnapshot();

  const chartData = useMemo(() => {
    if (!snapshot) return [];
    const series = buildPercentilePaths(snapshot.inputs, snapshot.results, Math.min(1000, snapshot.inputs.N || 800));
    return series.years.map((y, i) => ({
      year: y,
      p90: Math.round(series.p90[i]),
      p50: Math.round(series.p50[i]),
      p10: Math.round(series.p10[i]),
    }));
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">No recent run found</h1>
          <p className="text-muted-foreground text-sm">
            Run the Guardrails calculator first, then come back here to see your
            portfolio's volatility and drawdown over time.
          </p>
          <Link
            to="/guardrails"
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500"
          >
            Go to Calculator
          </Link>
        </div>
      </div>
    );
  }

  const { results } = snapshot;
  const t = results.telemetry;

  return (
    <div className="min-h-screen pb-12">
      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Volatility &amp; Drawdown</h1>
        <p className="text-sm text-muted-foreground">
          Engine: {results.engine === 'total' ? 'Total income' : 'Legacy'} · Mode: {results.mode} · Saved:{' '}
          {new Date(snapshot.savedAt).toLocaleString()}
        </p>

        <section className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Portfolio value over time</span>
            <span className="text-muted-foreground">90th / 50th / 10th percentile</span>
          </div>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                <YAxis tickFormatter={(v) => money(v)} width={90} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="p90" name="90th percentile (optimistic)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="p50" name="50th percentile (median)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="p10" name="10th percentile (cautious)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <strong>What the lines mean:</strong> 90th percentile is optimistic (~10% of runs do
            better), 50th is the median, 10th is cautious (~90% of runs do better).
          </p>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="text-sm text-muted-foreground mb-2">Final Wealth</div>
            <div className="flex justify-between text-sm"><span>p10</span><span className="font-semibold">{money(t.finalPV.p10)}</span></div>
            <div className="flex justify-between text-sm"><span>p50</span><span className="font-semibold">{money(t.finalPV.p50)}</span></div>
            <div className="flex justify-between text-sm"><span>p90</span><span className="font-semibold">{money(t.finalPV.p90)}</span></div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-muted-foreground mb-2">Max Drawdown</div>
            <div className="flex justify-between text-sm"><span>p10</span><span className="font-semibold">{pct(t.maxDrawdown.p10)}</span></div>
            <div className="flex justify-between text-sm"><span>p50</span><span className="font-semibold">{pct(t.maxDrawdown.p50)}</span></div>
            <div className="flex justify-between text-sm"><span>p90</span><span className="font-semibold">{pct(t.maxDrawdown.p90)}</span></div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-muted-foreground mb-2">Path Return σ</div>
            <div className="flex justify-between text-sm"><span>p10</span><span className="font-semibold">{t.pathVol.p10.toFixed(3)}</span></div>
            <div className="flex justify-between text-sm"><span>p50</span><span className="font-semibold">{t.pathVol.p50.toFixed(3)}</span></div>
            <div className="flex justify-between text-sm"><span>p90</span><span className="font-semibold">{t.pathVol.p90.toFixed(3)}</span></div>
          </div>
        </section>

        <div className="flex gap-3">
          <Link to="/guardrails" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500">
            ← Back to Calculator
          </Link>
          <Link to="/guardrails/methods" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-400 to-indigo-500">
            Methods &amp; Formulas
          </Link>
        </div>
      </main>
    </div>
  );
}
