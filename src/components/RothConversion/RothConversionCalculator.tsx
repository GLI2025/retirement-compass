import { useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import { RothConversionInputs, FilingStatus, DeductionType, StateTaxMode } from '@/types/rothConversion';
import { ROTH_CONVERSION_DEFAULTS, calculateRothConversion } from '@/lib/calculations/rothConversion';

const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (n: number) => (isNaN(n) ? '–' : (n * 100).toFixed(1) + '%');

const FILING_LABELS: Record<FilingStatus, string> = {
  S: 'Single', MFJ: 'Married Filing Jointly', MFS: 'Married Filing Separately',
  HOH: 'Head of Household', QW: 'Qualifying Widow(er)',
};

function NumField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="p-2.5 rounded-lg border border-border bg-background text-right"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function RothConversionCalculator() {
  const [inputs, setInputs] = useState<RothConversionInputs>(ROTH_CONVERSION_DEFAULTS);
  const update = <K extends keyof RothConversionInputs>(key: K, value: RothConversionInputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));
  const updateItemized = <K extends keyof RothConversionInputs['itemized']>(key: K, value: number) =>
    setInputs((p) => ({ ...p, itemized: { ...p.itemized, [key]: value } }));

  const results = useMemo(() => calculateRothConversion(inputs), [inputs]);
  const { baseline, withConversion } = results;

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Landmark className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Low-Income Year Planning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Roth Conversion</span>
            <br />
            <span className="text-foreground">Planner</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Model a Roth conversion during a low-income year — bracket stacking, Social Security
            taxation, NIIT, and ACA/IRMAA risk flags. Nothing here is saved or transmitted.
          </p>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 grid lg:grid-cols-[420px_1fr] gap-6">
        {/* INPUTS */}
        <div className="space-y-6">
          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Household</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm col-span-2">
                Filing status
                <select
                  value={inputs.filing}
                  onChange={(e) => update('filing', e.target.value as FilingStatus)}
                  className="p-2.5 rounded-lg border border-border bg-background"
                >
                  {(Object.keys(FILING_LABELS) as FilingStatus[]).map((f) => (
                    <option key={f} value={f}>{FILING_LABELS[f]}</option>
                  ))}
                </select>
              </label>
              <NumField label="Taxpayer age" value={inputs.age1} onChange={(v) => update('age1', v)} />
              <NumField label="Spouse age (if MFJ)" value={inputs.age2} onChange={(v) => update('age2', v)} />
              <label className="flex flex-col gap-1.5 text-sm">
                State tax mode
                <select
                  value={inputs.stateMode}
                  onChange={(e) => update('stateMode', e.target.value as StateTaxMode)}
                  className="p-2.5 rounded-lg border border-border bg-background"
                >
                  <option value="none">No state tax</option>
                  <option value="flat">Flat rate</option>
                </select>
              </label>
              <NumField label="Flat state rate (%)" value={inputs.stateRate} onChange={(v) => update('stateRate', v)} />
              <NumField label="Household size (ACA)" value={inputs.hhSize} onChange={(v) => update('hhSize', v)} />
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={inputs.onACA} onChange={(e) => update('onACA', e.target.checked)} />
                On ACA marketplace?
              </label>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={inputs.onMedicare} onChange={(e) => update('onMedicare', e.target.checked)} />
                On Medicare?
              </label>
            </div>
          </section>

          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Income (before conversion)</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Wages / self-employment" value={inputs.wages} onChange={(v) => update('wages', v)} />
              <NumField label="Ordinary interest" value={inputs.intOrd} onChange={(v) => update('intOrd', v)} />
              <NumField label="Qualified dividends" value={inputs.divQ} onChange={(v) => update('divQ', v)} />
              <NumField label="Ordinary dividends" value={inputs.divO} onChange={(v) => update('divO', v)} />
              <NumField label="Short-term cap gains" value={inputs.cgST} onChange={(v) => update('cgST', v)} />
              <NumField label="Long-term cap gains" value={inputs.cgLT} onChange={(v) => update('cgLT', v)} />
              <NumField label="Rental / passive" value={inputs.rental} onChange={(v) => update('rental', v)} />
              <NumField label="Tax-exempt interest" value={inputs.intEx} onChange={(v) => update('intEx', v)} />
              <NumField
                label="Social Security (gross, annual)"
                value={inputs.ssGross}
                onChange={(v) => update('ssGross', v)}
                hint="If > 0, applies provisional-income rules"
              />
            </div>
          </section>

          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Deductions</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                Standard or itemized?
                <select
                  value={inputs.dedType}
                  onChange={(e) => update('dedType', e.target.value as DeductionType)}
                  className="p-2.5 rounded-lg border border-border bg-background"
                >
                  <option value="standard">Standard</option>
                  <option value="itemized">Itemized</option>
                </select>
              </label>
              <NumField label="Above-the-line (HSA, 401k...)" value={inputs.aboveLine} onChange={(v) => update('aboveLine', v)} />
            </div>
            {inputs.dedType === 'itemized' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <NumField label="SALT (cap applies)" value={inputs.itemized.salt} onChange={(v) => updateItemized('salt', v)} />
                <NumField label="Mortgage interest" value={inputs.itemized.mortInt} onChange={(v) => updateItemized('mortInt', v)} />
                <NumField label="Charitable" value={inputs.itemized.charity} onChange={(v) => updateItemized('charity', v)} />
                <NumField label="Medical (over floor)" value={inputs.itemized.medical} onChange={(v) => updateItemized('medical', v)} />
                <NumField label="Other itemized" value={inputs.itemized.other} onChange={(v) => updateItemized('other', v)} />
              </div>
            )}
          </section>

          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">IRA &amp; Conversion</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="IRA total on Dec 31" value={inputs.iraTotal} onChange={(v) => update('iraTotal', v)} />
              <NumField label="After-tax IRA basis" value={inputs.iraBasis} onChange={(v) => update('iraBasis', v)} />
              <NumField label="Planned Roth conversion" value={inputs.conversion} onChange={(v) => update('conversion', v)} />
              <NumField label="Granular what-if (last $)" value={inputs.marginalStep} onChange={(v) => update('marginalStep', v)} />
            </div>
          </section>
        </div>

        {/* RESULTS */}
        <div className="space-y-6">
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="text-sm font-semibold mb-1">Baseline (no conversion)</div>
              <Row label="Federal tax" value={money(baseline.ordinaryTax + baseline.ltcgTax)} />
              <Row label="State tax" value={money(baseline.stateTax)} />
              <Row label="SS taxable" value={money(baseline.ssTax)} />
              <Row label="NIIT" value={money(baseline.niit)} />
              <Row label="ACA status" value={inputs.onACA ? `${baseline.aca.label} — ${baseline.aca.risk}` : 'Not on ACA'} />
              <Row label="Total tax" value={money(baseline.totalTax)} big />
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="text-sm font-semibold mb-1">With Conversion</div>
              <Row label="Federal tax" value={money(withConversion.ordinaryTax + withConversion.ltcgTax)} />
              <Row label="State tax" value={money(withConversion.stateTax)} />
              <Row label="SS taxable" value={money(withConversion.ssTax)} />
              <Row label="NIIT" value={money(withConversion.niit)} />
              <Row label="ACA status" value={inputs.onACA ? `${withConversion.aca.label} — ${withConversion.aca.risk}` : 'Not on ACA'} />
              <Row label="Total tax" value={money(withConversion.totalTax)} big />
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-4">
            <div className="glass-card p-4 space-y-2">
              <Row label="Δ Total tax" value={money(results.deltaTotal)} big />
              <Row label={`Eff. marginal on last ${money(inputs.marginalStep)}`} value={pct(results.effectiveMarginalOnStep)} />
            </div>
            <div className="glass-card p-4">
              {results.alerts.length === 0 ? (
                <span className="text-xs text-muted-foreground">No major cliff warnings based on current config.</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {results.alerts.map((a, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-sm font-semibold">Bracket Fill (Ordinary)</h2>
            <div className="space-y-2">
              <BarRow label="Baseline" pct={results.bracketFillBaselinePct} />
              <BarRow label="With conv" pct={results.bracketFillWithConversionPct} />
            </div>
            <p className="text-xs text-muted-foreground">
              Bar shows share of taxable ordinary income vs. total ordinary brackets used. (LTCG/QD
              taxed on top using their own brackets.)
            </p>
          </section>

          <details className="glass-card p-4 sm:p-6">
            <summary className="text-sm font-semibold cursor-pointer">Pro-rata (Form 8606) details</summary>
            <p className="text-sm font-mono mt-2">
              Taxable = {money(results.proRata.taxable)}; Nontaxable = {money(results.proRata.nontaxable)};
              New basis carryforward ≈ {money(results.proRata.newBasis)} (Dec 31 aggregation)
            </p>
          </details>

          <footer className="text-xs text-muted-foreground">
            This tool is educational only and not tax advice. Verify numbers with a tax professional.
            Medicare IRMAA and ACA PTC are shown as risk flags and require current-year tables for
            precision.
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

function BarRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
