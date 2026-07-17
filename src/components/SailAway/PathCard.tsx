import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  PathKey, PathState, LoanType, SailAwayInputs, PathBothResults,
} from '@/types/sailAway';
import { formatCurrency, fixedMonthlyPayment, helocMonthlyPayment } from '@/lib/calculations/sailAway';

const money = (n: number) => formatCurrency(n);

const LOAN_OPTIONS: { key: LoanType; label: string }[] = [
  { key: 'heloc', label: 'HELOC' },
  { key: 'boat', label: 'Boat Loan' },
  { key: 'both', label: 'HELOC + Boat' },
  { key: 'other', label: 'Other' },
  { key: 'none', label: 'None' },
];

interface PathCardProps {
  pathKey: PathKey;
  title: string;
  icon: string;
  state: PathState;
  loanParams: SailAwayInputs['loanParams'];
  sim: PathBothResults;
  userAge: number;
  onSetLoan: (l: LoanType) => void;
  onUpdatePath: (patch: Partial<PathState>) => void;
  onUpdateLoanParams: <K extends keyof SailAwayInputs['loanParams']>(kind: K, patch: Partial<SailAwayInputs['loanParams'][K]>) => void;
}

export function PathCard({
  pathKey, title, icon, state, loanParams, sim, userAge, onSetLoan, onUpdatePath, onUpdateLoanParams,
}: PathCardProps) {
  const depOffsetMonths =
    pathKey === 'B' ? (state.yearsToSave || 5) * 12
    : pathKey === 'C' ? Math.max(0, ((state.retirementAge || 60) - userAge) * 12)
    : 0;
  const departureAge = userAge + depOffsetMonths / 12;

  const runwayYears = sim.base.runwayYears;
  const pnrYears = sim.base.pnrYears;
  const runwayText = runwayYears >= 50 ? '∞' : `${Math.round(runwayYears * 10) / 10} years`;
  const pnrText = pnrYears >= 50 ? 'Never' : `Year ${Math.round(pnrYears * 10) / 10}`;
  const ohShitText = sim.stress.pnrYears >= 50 ? 'Never' : `Year ${Math.round(sim.stress.pnrYears * 10) / 10}`;

  const boatEquityLabel = runwayYears >= 50
    ? 'Boat Equity at End (open-ended)'
    : `Boat Equity at End (Age ${Math.round((departureAge + runwayYears) * 10) / 10})`;

  const netWorthB = pathKey === 'B'
    ? Math.max(0, sim.base.departureCash - sim.base.loanBalanceAtEnd + sim.base.boatEquity)
    : null;

  const chartData = buildChartData(sim, departureAge);

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="text-lg font-bold flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        {(state.loan === 'heloc' || state.loan === 'both') && (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">⚠️ House on the line</span>
        )}
      </div>

      {pathKey === 'B' && (
        <label className="flex flex-col gap-1.5 text-sm">
          Years to Save: <strong>{state.yearsToSave}</strong>
          <input
            type="range" min={1} max={7} value={state.yearsToSave}
            onChange={(e) => onUpdatePath({ yearsToSave: Number(e.target.value) })}
          />
        </label>
      )}
      {pathKey === 'C' && (
        <label className="flex flex-col gap-1.5 text-sm">
          Retirement Age: <strong>{state.retirementAge}</strong>
          <input
            type="range" min={55} max={70} value={state.retirementAge}
            onChange={(e) => onUpdatePath({ retirementAge: Number(e.target.value) })}
          />
        </label>
      )}
      {pathKey === 'A' && (
        <p className="text-xs text-muted-foreground -mt-1">
          This path departs immediately — no waiting period. To change the departure age, adjust
          <strong> "Your Age"</strong> in the Sailing Inputs section above.
        </p>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Financing Strategy</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {LOAN_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSetLoan(opt.key)}
              className={`px-2 py-1.5 text-xs rounded-lg border-2 font-medium transition ${
                state.loan === opt.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {state.loan !== 'none' && (
          <LoanConfig loan={state.loan} params={loanParams} onUpdate={onUpdateLoanParams} />
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={state.remoteWork} onChange={(e) => onUpdatePath({ remoteWork: e.target.checked })} />
        Remote Work While Sailing
      </label>
      {state.remoteWork && (
        <label className="flex flex-col gap-1.5 text-sm">
          Monthly Remote Income
          <input
            type="number" value={state.remoteIncome}
            onChange={(e) => onUpdatePath({ remoteIncome: Number(e.target.value) })}
            className="p-2 rounded-lg border border-border bg-background"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Departure Age" value={(Math.round(departureAge * 10) / 10).toString()} />
        <Stat label="Runway (years)" value={runwayText} color="text-emerald-600" />
        <Stat label="Point of No Return" value={pnrText} color="text-amber-600" />
        <Stat label="Oh-Sh!t Year (stress)" value={ohShitText} color="text-red-600" />
        {pathKey === 'B' && <Stat label="Net Worth at Departure" value={money(netWorthB ?? 0)} color="text-emerald-600" />}
        {pathKey === 'C' && <Stat label="Portfolio at Retirement" value={money(sim.base.departureCash)} color="text-emerald-600" />}
        <Stat label={boatEquityLabel} value={money(sim.base.boatEquity)} />
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
            <YAxis tickFormatter={(v) => money(v)} width={80} />
            <Tooltip formatter={(v: number) => money(v)} />
            <Legend />
            <Line type="monotone" dataKey="cash" name="Cash Balance" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="stress" name="Stress Scenario" dot={false} strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <BalanceSheet rows={sim.base.yearlyRows} departureAge={departureAge} />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Loan Balance" value={money(sim.base.loanBalanceAtEnd)} />
        <Stat label="Boat Value" value={money(sim.base.boatValue)} />
      </div>

      <div>
        <div className="text-xs font-semibold text-amber-700 mb-1">Regret Probability</div>
        <input
          type="range" min={0} max={100} value={state.regret}
          onChange={(e) => onUpdatePath({ regret: Number(e.target.value) })}
          className="w-full"
        />
        <div className="text-center text-sm font-bold text-amber-700">{state.regret}%</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2 flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-bold text-sm ${color ?? ''}`}>{value}</span>
    </div>
  );
}

function buildChartData(sim: PathBothResults, departureAge: number) {
  const yearsToShow = Math.min(Math.max(sim.base.yearlyRows.length, sim.stress.yearlyRows.length) || 1, 20);
  const data = [];
  for (let i = 0; i <= yearsToShow; i++) {
    const br = sim.base.yearlyRows[i] || sim.base.yearlyRows[sim.base.yearlyRows.length - 1];
    const sr = sim.stress.yearlyRows[i] || sim.stress.yearlyRows[sim.stress.yearlyRows.length - 1];
    const safeBase = Number.isFinite(br?.endCash) ? br.endCash : sim.base.finalCash;
    const safeStress = Number.isFinite(sr?.endCash) ? sr.endCash : sim.stress.finalCash;
    data.push({
      age: Math.round((departureAge + i) * 10) / 10,
      cash: Math.round(safeBase),
      stress: Math.round(safeStress),
    });
  }
  return data;
}

function BalanceSheet({ rows, departureAge }: { rows: { year: number; startCash: number; growth: number; burn: number; endCash: number }[]; departureAge: number }) {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground p-3">No runway available.</div>;
  }
  const maxYears = Math.min(rows.length, 20);
  return (
    <div className="overflow-auto max-h-64 border border-border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 sticky top-0">
            <th className="text-left p-2">Year</th>
            <th className="text-right p-2">Age</th>
            <th className="text-right p-2">Start</th>
            <th className="text-right p-2">Growth</th>
            <th className="text-right p-2">Burn</th>
            <th className="text-right p-2">End</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxYears).map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-2">{r.year}</td>
              <td className="p-2 text-right">{Math.round(departureAge + i)}</td>
              <td className="p-2 text-right">{money(r.startCash)}</td>
              <td className="p-2 text-right">+{money(r.growth)}</td>
              <td className="p-2 text-right">{money(r.burn)}</td>
              <td className="p-2 text-right">{money(r.endCash)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoanConfig({
  loan, params, onUpdate,
}: {
  loan: LoanType;
  params: SailAwayInputs['loanParams'];
  onUpdate: <K extends keyof SailAwayInputs['loanParams']>(kind: K, patch: Partial<SailAwayInputs['loanParams'][K]>) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      {(loan === 'heloc' || loan === 'both') && (
        <div className="bg-sky-50 text-slate-900 rounded-lg p-3 space-y-2">
          <h5 className="text-xs font-bold text-sky-800">🏠 HELOC Configuration</h5>
          <HelocSnapshot params={params.heloc} />
          <FieldRow label="Boat Purchase Price">
            <input type="number" value={params.heloc.boatPrice} onChange={(e) => onUpdate('heloc', { boatPrice: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Available to Borrow">
            <input type="number" value={params.heloc.available} onChange={(e) => onUpdate('heloc', { available: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Initial Draw Amount">
            <input type="number" value={params.heloc.drawAmount} onChange={(e) => onUpdate('heloc', { drawAmount: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="APR (%)">
            <input type="number" step={0.1} value={params.heloc.rate} onChange={(e) => onUpdate('heloc', { rate: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Interest-Only Months">
            <input type="number" value={params.heloc.ioMonths} onChange={(e) => onUpdate('heloc', { ioMonths: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Amortization Months">
            <input type="number" value={params.heloc.amortMonths} onChange={(e) => onUpdate('heloc', { amortMonths: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
        </div>
      )}

      {(loan === 'boat' || loan === 'both') && (
        <div className="bg-purple-50 text-slate-900 rounded-lg p-3 space-y-2">
          <h5 className="text-xs font-bold text-purple-800">⛵ Boat Loan Configuration</h5>
          <BoatSnapshot params={params.boat} />
          <FieldRow label="Boat Price">
            <input type="number" value={params.boat.price} onChange={(e) => onUpdate('boat', { price: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Down Payment (%)">
            <input type="number" value={params.boat.downPercent} onChange={(e) => onUpdate('boat', { downPercent: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="APR (%)">
            <input type="number" step={0.1} value={params.boat.rate} onChange={(e) => onUpdate('boat', { rate: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Term (months)">
            <input type="number" value={params.boat.termMonths} onChange={(e) => onUpdate('boat', { termMonths: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Monthly Insurance">
            <input type="number" value={params.boat.insuranceBump} onChange={(e) => onUpdate('boat', { insuranceBump: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
        </div>
      )}

      {loan === 'other' && (
        <div className="bg-amber-50 text-slate-900 rounded-lg p-3 space-y-2">
          <h5 className="text-xs font-bold text-amber-800">📄 Other Loan Configuration</h5>
          <FieldRow label="Loan Principal">
            <input type="number" value={params.other.principal} onChange={(e) => onUpdate('other', { principal: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="APR (%)">
            <input type="number" step={0.1} value={params.other.rate} onChange={(e) => onUpdate('other', { rate: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
          <FieldRow label="Term (months)">
            <input type="number" value={params.other.termMonths} onChange={(e) => onUpdate('other', { termMonths: Number(e.target.value) })} className="p-1.5 rounded border border-border w-full text-sm text-slate-900 bg-white" />
          </FieldRow>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-700">
      {label}
      {children}
    </label>
  );
}

function HelocSnapshot({ params }: { params: SailAwayInputs['loanParams']['heloc'] }) {
  const principal = Math.max(0, params.drawAmount || 0);
  const r = (params.rate || 0) / 100 / 12;
  const ioPay = principal * r;
  const amortPay = helocMonthlyPayment(principal, params.rate, (params.ioMonths || 0) + 1, params.ioMonths, params.amortMonths);
  return (
    <div className="bg-white rounded-lg border border-sky-200 p-2 text-xs space-y-0.5">
      <div className="font-bold text-sky-800">Loan Snapshot</div>
      <Row k="Draw Amount" v={money(principal)} />
      <Row k="Payment (Interest-Only)" v={money(ioPay)} />
      <Row k="Payment (Amortization)" v={money(amortPay)} />
    </div>
  );
}

function BoatSnapshot({ params }: { params: SailAwayInputs['loanParams']['boat'] }) {
  const downAmt = params.price * ((params.downPercent || 0) / 100);
  const principal = Math.max(0, params.price - downAmt);
  const mBoat = fixedMonthlyPayment(principal, params.rate, params.termMonths);
  const insMonthly = params.insuranceType === 'percent'
    ? (params.price * (params.insurancePercent || 0)) / 100 / 12
    : params.insuranceBump || 0;
  return (
    <div className="bg-white rounded-lg border border-purple-200 p-2 text-xs space-y-0.5">
      <div className="font-bold text-purple-800">Loan Snapshot</div>
      <Row k="Boat Price" v={money(params.price)} />
      <Row k={`Down Payment (${params.downPercent}%)`} v={money(downAmt)} />
      <Row k="Loan Principal" v={money(principal)} />
      <Row k="Monthly Payment" v={money(mBoat)} />
      <Row k="Insurance / mo" v={money(insMonthly)} />
      <Row k="Total Debt Service / mo" v={money(mBoat + insMonthly)} bold />
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-slate-800">
      <span>{k}</span>
      <span className={bold ? 'font-bold' : ''}>{v}</span>
    </div>
  );
}
