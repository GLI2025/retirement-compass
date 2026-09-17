/**
 * Plain-English guide
 *
 * Purpose: Explains selected retirement ages as checkpoints, including portfolio
 * balance, income, spending, portfolio withdrawal, runway, and rule decisions.
 *
 * Inputs/outputs: Receives deterministic IncomeCheckpoint records and CalculatorInputs
 * from RetirementCalculator.tsx. Checkpoint cash values are nominal dollars at that
 * age; future cost is also translated to today's buying power for comparison.
 *
 * Important behavior: Checkpoints stay deterministic even when Monte Carlo is
 * enabled. The engine has already applied Social Security and other income at
 * their start ages, housing/mortgage timing, deposits, inflation, and the selected
 * spending rule. This component presents Fixed as unchanged, visualizes Guardrails
 * triggers and adjustments, and states the Die With Zero target age and buffer.
 * It uses shared presentation helpers for funded, warning, and depleted states.
 *
 * Financial impact: Medium. Incorrect presentation logic could mislabel a healthy
 * checkpoint or obscure a spending adjustment without changing the projection.
 */
import type { CalculatorInputs, IncomeCheckpoint } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { getNormalizedDieWithZeroTargetAge } from '@/lib/calculations/spendingRules';
import {
  getGuardrailDecision,
  getGuardrailRatePresentation,
  getGuardrailScale,
} from '@/utils/checkpointPresentation';
import { toTodayDollarsAtAge } from '@/utils/money';

interface IncomeCheckpointsProps {
  checkpoints: IncomeCheckpoint[];
  inputs: CalculatorInputs;
}

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;
const formatPercent = (value: number) => Number.isFinite(value)
  ? `${(value * 100).toFixed(1)}%`
  : '—';
const annualTip = (monthly: number) => `≈ ${formatCurrency(monthly * 12)} / yr`;

function normalizeLabel(label: string) {
  return label?.trim() || '';
}

function labelAlreadyContainsAge(label: string, age: number) {
  const l = (label || '').toLowerCase();
  return l.includes('age') && l.includes(String(age));
}

function CheckpointStatusBadge({ checkpoint }: { checkpoint: IncomeCheckpoint }) {
  const label = checkpoint.stressLevel === 'good'
    ? 'Funded'
    : checkpoint.stressLevel === 'bad'
      ? checkpoint.portfolioBalance > 0 ? 'Depleted earlier' : 'Portfolio depleted'
      : 'Needs attention';

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        checkpoint.stressLevel === 'good' && 'border-success/40 bg-success/10 text-success',
        checkpoint.stressLevel === 'warn' && 'border-warning/40 bg-warning/10 text-warning',
        checkpoint.stressLevel === 'bad' && 'border-destructive/40 bg-destructive/10 text-destructive',
      )}
    >
      {label}
    </span>
  );
}

function GuardrailDecision({ checkpoint }: { checkpoint: IncomeCheckpoint }) {
  const currentRate = checkpoint.currentBaselineWithdrawalRate ?? 0;
  const lowerRate = checkpoint.lowerGuardrailRate ?? 0;
  const upperRate = checkpoint.upperGuardrailRate ?? 0;
  const decision = getGuardrailDecision(checkpoint);
  const ratePresentation = getGuardrailRatePresentation(currentRate, lowerRate, upperRate);
  const scale = getGuardrailScale(currentRate, lowerRate, upperRate);
  const markerPosition = `${scale.current}%`;
  const markerAlignment = scale.current >= 85
    ? '-translate-x-full'
    : scale.current <= 15
      ? 'translate-x-0'
      : '-translate-x-1/2';

  return (
    <div className="col-span-full mt-3 rounded-xl border border-white/10 bg-background/30 p-3 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guardrails decision
        </span>
        <span
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-semibold',
            decision.tone === 'bad'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : decision.tone === 'warn'
                ? 'border-warning/40 bg-warning/10 text-warning'
                : 'border-success/40 bg-success/10 text-success',
          )}
        >
          {decision.label}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <div className="text-xs text-muted-foreground">Planned from portfolio</div>
          <div className="font-semibold">{formatCurrency(decision.plannedPortfolioWithdrawal)}/mo</div>
        </div>
        <div className="hidden text-center text-xs font-semibold text-muted-foreground sm:block">
          {decision.label}
          <div aria-hidden="true">→</div>
        </div>
        <div className="sm:text-right">
          <div className="text-xs text-muted-foreground">After Guardrails</div>
          <div className="font-semibold">{formatCurrency(decision.actualPortfolioWithdrawal)}/mo</div>
        </div>
      </div>

      <div
        className={cn(
          'mt-4 rounded-lg border p-3',
          ratePresentation.zone === 'reduce' && 'border-warning/35 bg-warning/5',
          ratePresentation.zone === 'increase' && 'border-primary/35 bg-primary/5',
          ratePresentation.zone === 'hold' && 'border-success/35 bg-success/5',
          ratePresentation.zone === 'unavailable' && 'border-destructive/35 bg-destructive/5',
        )}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {ratePresentation.label}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-bold">{formatPercent(currentRate)}</span>
          <span className="text-sm text-muted-foreground">current planned withdrawal rate</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {ratePresentation.comparisonLabel}
        </div>
      </div>

      {ratePresentation.zone !== 'unavailable' && <div className="mt-5">
        <div
          className="relative mt-10 h-3 rounded-full bg-muted"
          role="img"
          aria-label={`Current planned withdrawal rate ${formatPercent(currentRate)}. Increase withdrawal below ${formatPercent(lowerRate)}. No adjustment from ${formatPercent(lowerRate)} through ${formatPercent(upperRate)}. Reduce withdrawal above ${formatPercent(upperRate)}.`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-l-full bg-primary/55"
            style={{ width: `${scale.lower}%` }}
          />
          <div
            className="absolute inset-y-0 bg-success/60"
            style={{ left: `${scale.lower}%`, width: `${Math.max(0, scale.upper - scale.lower)}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-warning/60"
            style={{ width: `${Math.max(0, 100 - scale.upper)}%` }}
          />
          <span
            className={cn(
              'absolute bottom-full mb-2 whitespace-nowrap rounded-md border border-foreground/30 bg-background px-2 py-1 text-xs font-bold text-foreground shadow-sm',
              markerAlignment,
            )}
            style={{ left: markerPosition }}
            aria-hidden="true"
          >
            {formatPercent(currentRate)} current
          </span>
          <span
            className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_hsl(var(--background))]"
            style={{ left: markerPosition }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] leading-tight text-muted-foreground">
          <div>
            <span className="font-semibold text-primary">Increase withdrawal</span>
            <div>Below {formatPercent(lowerRate)}</div>
          </div>
          <div className="text-center">
            <span className="font-semibold text-success">No adjustment</span>
            <div>{formatPercent(lowerRate)}–{formatPercent(upperRate)}</div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-warning">Reduce withdrawal</span>
            <div>Above {formatPercent(upperRate)}</div>
          </div>
        </div>
      </div>}

      <p className="mt-3 text-sm text-muted-foreground">{decision.description}</p>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">Total spending after Guardrails:</span>{' '}
        <span className="font-semibold">{formatCurrency(decision.resultingTotalSpending)}/mo</span>
        <span className="text-muted-foreground"> in nominal dollars at age {checkpoint.age}</span>
      </p>
    </div>
  );
}

export function IncomeCheckpoints({ checkpoints, inputs }: IncomeCheckpointsProps) {
  if (!checkpoints?.length) return null;

  const dieWithZeroTargetAge = getNormalizedDieWithZeroTargetAge(inputs);
  const dieWithZeroBuffer = Math.max(0, inputs.dieWithZero?.bufferAmount ?? 0);

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold">Retirement Income Checkpoints</h3>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">
        Deterministic checkpoints based on the selected expected return. Dollar amounts are nominal at each shown age.
        {inputs.monteCarloEnabled && ' Monte Carlo ranges and probability are shown separately above.'}
      </p>

      {inputs.spendingRule === 'die_with_zero' && (
        <p className="mb-4 rounded-lg border border-white/10 bg-background/20 p-3 text-sm text-muted-foreground">
          Target: remain funded through age {dieWithZeroTargetAge} with a{' '}
          {formatCurrency(dieWithZeroBuffer)} ending buffer in today’s dollars.
        </p>
      )}

      <div className="space-y-3">
        {checkpoints.map((c) => {
          const label = normalizeLabel(c.label);

          // Monthly (nominal future dollars when inflation is enabled)
          const incomeMonthly = (c.ssIncome ?? 0) + (c.otherIncome ?? 0);
          const futureCostMonthly = c.monthlyNeed ?? 0;

          // Actual withdrawal from portfolio (after spending rule)
          const withdrawMonthly = Math.max(0, c.fromPortfolio ?? 0);
          const spendingGapMonthly = Math.max(0, c.spendingGap ?? 0);

          // Convert future dollars back into today's buying power (for anchoring)
          const futureCostToday = inputs.inflationEnabled
            ? toTodayDollarsAtAge(futureCostMonthly, c.age, inputs.currentAge, inputs.inflationRate)
            : futureCostMonthly;

          const showAgeLine = !labelAlreadyContainsAge(label, c.age);
          return (
            <div
              key={`${c.age}-${c.label}`}
              className={cn(
                'rounded-2xl p-4 border border-white/10 bg-white/5',
                c.stressLevel === 'good' && 'checkpoint-good',
                c.stressLevel === 'warn' && 'checkpoint-warn',
                c.stressLevel === 'bad' && 'checkpoint-bad'
              )}
            >
              <div className="flex items-start justify-between gap-4 text-foreground">
                <div className="min-w-0">
                  <div className="text-sm font-medium opacity-80">{label}</div>
                  {showAgeLine && <div className="text-sm opacity-70">Age {c.age}</div>}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <CheckpointStatusBadge checkpoint={c} />
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Portfolio balance</div>
                    <div className="text-lg font-semibold whitespace-nowrap">
                      {formatCurrency(c.portfolioBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {c.isPlanEnd ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {c.targetStatus === 'met' ? 'Target met.' : c.targetStatus === 'buffer-short'
                    ? 'Spending funded, buffer short.' : c.targetStatus === 'depleted'
                    ? 'Portfolio depleted early.' : 'End of projection.'}
                  {' '}Spending after this age is outside this plan.
                </p>
              ) : (
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-foreground sm:grid-cols-2">
                <div title={annualTip(incomeMonthly)}>
                  <span className="opacity-75">Income:</span> {formatCurrency(incomeMonthly)}/mo
                </div>

                <div title={annualTip(futureCostMonthly)}>
                  <span
                    className="opacity-75"
                    title={
                      inputs.inflationEnabled
                        ? `Calculated using a ${inputs.inflationRate}% inflation rate to show what you will actually pay in future dollars.`
                        : `Shown in today's dollars (inflation is off).`
                    }
                  >
                    Estimated Future Cost:
                  </span>{' '}
                  {formatCurrency(futureCostMonthly)}/mo

                  {inputs.inflationEnabled && (
                    <div className="text-xs opacity-60 mt-1">
                      ≈ {formatCurrency(futureCostToday)}/mo in today’s buying power
                    </div>
                  )}
                </div>

                <div title={annualTip(withdrawMonthly)}>
                  <span className="opacity-75">
                    Portfolio Withdrawal:
                  </span>{' '}
                  {withdrawMonthly > 0 ? `${formatCurrency(withdrawMonthly)}/mo` : 'None'}
                </div>

                {spendingGapMonthly > 0.5 && c.spendingGapKind !== 'guardrail-adjustment' && (
                  <div
                    className="col-span-full text-destructive"
                    title={annualTip(spendingGapMonthly)}
                  >
                    <span className="font-medium">Unfunded Spending Gap:</span>{' '}
                    {formatCurrency(spendingGapMonthly)}/mo
                  </div>
                )}

                {inputs.spendingRule === 'fixed' && (
                  <div className="col-span-full mt-2 rounded-lg border border-white/10 bg-background/20 p-3">
                    <span className="font-medium">Strategy decision:</span>{' '}
                    <span className="text-muted-foreground">No automatic spending adjustment.</span>
                  </div>
                )}

                {inputs.spendingRule === 'guardrails' && (
                  <GuardrailDecision checkpoint={c} />
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
