import { IncomeCheckpoint } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface IncomeCheckpointsProps {
  checkpoints: IncomeCheckpoint[];
}

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;
const annualTip = (monthly: number) => `≈ ${formatCurrency(monthly * 12)} / yr`;

const formatRunway = (years: number) => {
  if (!Number.isFinite(years) || years <= 0) return '—';
  if (years >= 99) return '99+ yrs';
  return `${years.toFixed(1)} yrs`;
};

// A tiny, no-library “gap bar” so users can quickly compare shrinking/growing gap across ages.
// We normalize by the max absolute gap across all checkpoints.
function GapBar({ gapMonthly, maxAbsGap }: { gapMonthly: number; maxAbsGap: number }) {
  const safeMax = Math.max(1, maxAbsGap);
  const pct = Math.min(100, Math.round((Math.abs(gapMonthly) / safeMax) * 100));

  // If gapMonthly is negative, it’s “needs portfolio.” If positive, it’s surplus.
  const isSurplus = gapMonthly >= 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs opacity-75 mb-1">
        <span>Gap</span>
        <span title={annualTip(gapMonthly)}>
          {gapMonthly >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(gapMonthly))}/mo
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            isSurplus ? 'bg-emerald-400/70' : 'bg-rose-400/70'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-1 text-[11px] opacity-70">
        {isSurplus ? 'Surplus (no withdrawal needed)' : 'Shortfall (requires withdrawal)'}
      </div>
    </div>
  );
}

export function IncomeCheckpoints({ checkpoints }: IncomeCheckpointsProps) {
  if (!checkpoints?.length) return null;

  // Precompute max gap for visual normalization
  const maxAbsGap = checkpoints.reduce((acc, c) => {
    const incomeMonthly = (c.ssIncome ?? 0) + (c.otherIncome ?? 0);
    const expensesMonthly = c.monthlyNeed ?? 0;
    const gapMonthly = incomeMonthly - expensesMonthly;
    return Math.max(acc, Math.abs(gapMonthly));
  }, 0);

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Retirement Income Checkpoints</h3>

      {/* Desktop: cascading list that fills width */}
      <div className="hidden md:block space-y-4">
        {checkpoints.map((c) => {
          const incomeMonthly = (c.ssIncome ?? 0) + (c.otherIncome ?? 0);
          const expensesMonthly = c.monthlyNeed ?? 0;
          const gapMonthly = incomeMonthly - expensesMonthly;

          const withdrawMonthly = Math.max(0, c.fromPortfolio ?? 0);

          const runwayYears =
            withdrawMonthly > 0 && c.portfolioBalance > 0
              ? c.portfolioBalance / (withdrawMonthly * 12)
              : null;

          return (
            <div
              key={`${c.age}-${c.label}`}
              className={cn(
                'rounded-2xl border p-5',
                // Fill full width and use a proper two-column grid
                'grid grid-cols-12 gap-6 items-start',
                c.stressLevel === 'good' && 'checkpoint-good',
                c.stressLevel === 'warn' && 'checkpoint-warn',
                c.stressLevel === 'bad' && 'checkpoint-bad'
              )}
            >
              {/* Left column: label/age/portfolio */}
              <div className="col-span-5">
                <div className="text-sm font-medium opacity-80">{c.label}</div>
                <div className="text-3xl font-bold mt-1">Age {c.age}</div>

                <div className="mt-4 text-4xl font-semibold tracking-tight">
                  {formatCurrency(c.portfolioBalance)}
                </div>

                {/* Optional tiny line for status */}
                <div className="mt-2 text-xs opacity-70">
                  Status: <span className="capitalize">{c.stressLevel}</span>
                </div>
              </div>

              {/* Right column: flows + chips + gap bar */}
              <div className="col-span-7">
                {/* 3 small lines */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div title={annualTip(incomeMonthly)}>
                    <div className="opacity-75 text-xs mb-1">Income</div>
                    <div className="font-medium">{formatCurrency(incomeMonthly)}/mo</div>
                  </div>

                  <div title={annualTip(expensesMonthly)}>
                    <div className="opacity-75 text-xs mb-1">Expenses</div>
                    <div className="font-medium">{formatCurrency(expensesMonthly)}/mo</div>
                  </div>

                  <div title={annualTip(gapMonthly)}>
                    <div className="opacity-75 text-xs mb-1">Gap</div>
                    <div className="font-medium">
                      {gapMonthly >= 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(gapMonthly))}/mo
                    </div>
                  </div>
                </div>

                {/* Visual trend cue */}
                <div className="mt-4">
                  <GapBar gapMonthly={gapMonthly} maxAbsGap={maxAbsGap} />
                </div>

                {/* Footer chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs border border-white/15 bg-white/5"
                    title={annualTip(withdrawMonthly)}
                  >
                    {withdrawMonthly > 0
                      ? `Withdraw: ${formatCurrency(withdrawMonthly)}/mo`
                      : 'No withdrawal needed'}
                  </span>

                  {withdrawMonthly > 0 && runwayYears != null && (
                    <span
                      className="px-3 py-1 rounded-full text-xs border border-white/15 bg-white/5"
                      title="At current withdrawal rate"
                    >
                      Runway: {formatRunway(runwayYears)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: keep stacked cards (readable) */}
      <div className="md:hidden space-y-3">
        {checkpoints.map((c) => {
          const incomeMonthly = (c.ssIncome ?? 0) + (c.otherIncome ?? 0);
          const expensesMonthly = c.monthlyNeed ?? 0;
          const gapMonthly = incomeMonthly - expensesMonthly;

          const withdrawMonthly = Math.max(0, c.fromPortfolio ?? 0);

          const runwayYears =
            withdrawMonthly > 0 && c.portfolioBalance > 0
              ? c.portfolioBalance / (withdrawMonthly * 12)
              : null;

          return (
            <div
              key={`${c.age}-${c.label}`}
              className={cn(
                'rounded-2xl p-4 border',
                c.stressLevel === 'good' && 'checkpoint-good',
                c.stressLevel === 'warn' && 'checkpoint-warn',
                c.stressLevel === 'bad' && 'checkpoint-bad'
              )}
            >
              <div className="text-sm font-medium opacity-80">{c.label}</div>
              <div className="text-2xl font-bold mt-1">Age {c.age}</div>

              <div className="mt-3 text-3xl font-semibold">{formatCurrency(c.portfolioBalance)}</div>

              <div className="mt-3 space-y-1 text-sm opacity-90">
                <div title={annualTip(incomeMonthly)}>Income: {formatCurrency(incomeMonthly)}/mo</div>
                <div title={annualTip(expensesMonthly)}>Expenses: {formatCurrency(expensesMonthly)}/mo</div>
                <div title={annualTip(gapMonthly)}>
                  Gap: {gapMonthly >= 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(gapMonthly))}/mo
                </div>
              </div>

              <div className="mt-4">
                <GapBar gapMonthly={gapMonthly} maxAbsGap={maxAbsGap} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs border border-white/15 bg-white/5"
                  title={annualTip(withdrawMonthly)}
                >
                  {withdrawMonthly > 0
                    ? `Withdraw: ${formatCurrency(withdrawMonthly)}/mo`
                    : 'No withdrawal needed'}
                </span>

                {withdrawMonthly > 0 && runwayYears != null && (
                  <span
                    className="px-3 py-1 rounded-full text-xs border border-white/15 bg-white/5"
                    title="At current withdrawal rate"
                  >
                    Runway: {formatRunway(runwayYears)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
