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

function MetricCell({
  label,
  valueMonthly,
  emphasize = false,
}: {
  label: string;
  valueMonthly: number | string;
  emphasize?: boolean;
}) {
  const isNumber = typeof valueMonthly === 'number';

  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div>
      <div
        className={cn(
          'text-sm md:text-[15px] leading-tight',
          emphasize && 'font-semibold'
        )}
        title={isNumber ? annualTip(valueMonthly) : undefined}
      >
        {isNumber ? `${formatCurrency(valueMonthly)}/mo` : valueMonthly}
      </div>
    </div>
  );
}

export function IncomeCheckpoints({ checkpoints }: IncomeCheckpointsProps) {
  if (!checkpoints?.length) return null;

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Retirement Income Checkpoints</h3>

      <div className="space-y-3">
        {checkpoints.map((c) => {
          // Monthly, nominal
          const incomeMonthly = (c.ssIncome ?? 0) + (c.otherIncome ?? 0);
          const expensesMonthly = c.monthlyNeed ?? 0;
          const gapMonthly = incomeMonthly - expensesMonthly;

          // Use the engine’s actual portfolio withdrawal at that checkpoint
          const withdrawMonthly = Math.max(0, c.fromPortfolio ?? 0);

          const runwayYears =
            withdrawMonthly > 0 && c.portfolioBalance > 0
              ? c.portfolioBalance / (withdrawMonthly * 12)
              : null;

          const gapText =
            gapMonthly >= 0
              ? `+${formatCurrency(gapMonthly)}/mo`
              : `−${formatCurrency(Math.abs(gapMonthly))}/mo`;

          const withdrawText =
            withdrawMonthly > 0
              ? `${formatCurrency(withdrawMonthly)}/mo`
              : 'No withdrawal';

          const runwayText =
            withdrawMonthly > 0 && runwayYears != null
              ? formatRunway(runwayYears)
              : '—';

          return (
            <div
              key={`${c.age}-${c.label}`}
              className={cn(
                'rounded-2xl border px-4 py-4 md:px-5 md:py-4',
                c.stressLevel === 'good' && 'checkpoint-good',
                c.stressLevel === 'warn' && 'checkpoint-warn',
                c.stressLevel === 'bad' && 'checkpoint-bad'
              )}
            >
              {/* Row 1: Label | Age | Portfolio (Excel-ish) */}
              <div className="grid grid-cols-12 items-baseline gap-3">
                <div className="col-span-12 md:col-span-5 min-w-0">
                  <div className="text-sm font-medium opacity-80 truncate">{c.label}</div>
                </div>

                <div className="col-span-4 md:col-span-2">
                  <div className="text-[11px] uppercase tracking-wide opacity-70">Age</div>
                  <div className="text-lg md:text-xl font-semibold">Age {c.age}</div>
                </div>

                <div className="col-span-8 md:col-span-5 text-right">
                  <div className="text-[11px] uppercase tracking-wide opacity-70">Portfolio</div>
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                    {formatCurrency(c.portfolioBalance)}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-3 border-t border-white/10" />

              {/* Row 2: Income | Expenses | Gap | Withdraw | Runway */}
              <div className="mt-3">
                {/* Desktop: true left-to-right columns */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-2">
                    <MetricCell label="Income" valueMonthly={incomeMonthly} />
                  </div>

                  <div className="col-span-2">
                    <MetricCell label="Expenses" valueMonthly={expensesMonthly} />
                  </div>

                  <div className="col-span-2">
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Gap</div>
                    <div
                      className={cn(
                        'text-[15px] leading-tight font-semibold',
                        gapMonthly >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      )}
                      title={annualTip(gapMonthly)}
                    >
                      {gapText}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Withdraw</div>
                    <div
                      className="text-[15px] leading-tight"
                      title={withdrawMonthly > 0 ? annualTip(withdrawMonthly) : undefined}
                    >
                      {withdrawMonthly > 0 ? `Withdraw: ${withdrawText}` : withdrawText}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Runway</div>
                    <div className="text-[15px] leading-tight" title="At current withdrawal rate">
                      {runwayText}
                    </div>
                  </div>
                </div>

                {/* Mobile: still left-to-right feeling, but wraps */}
                <div className="md:hidden grid grid-cols-2 gap-3">
                  <MetricCell label="Income" valueMonthly={incomeMonthly} />
                  <MetricCell label="Expenses" valueMonthly={expensesMonthly} />
                  <div className="col-span-2">
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Gap</div>
                    <div
                      className={cn(
                        'text-sm font-semibold',
                        gapMonthly >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      )}
                      title={annualTip(gapMonthly)}
                    >
                      {gapText}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Withdraw</div>
                    <div
                      className="text-sm"
                      title={withdrawMonthly > 0 ? annualTip(withdrawMonthly) : undefined}
                    >
                      {withdrawMonthly > 0 ? `Withdraw: ${withdrawText}` : withdrawText}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] uppercase tracking-wide opacity-70">Runway</div>
                    <div className="text-sm" title="At current withdrawal rate">
                      {runwayText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional small status hint (can remove if you want it cleaner) */}
              <div className="mt-3 text-xs opacity-60">
                Status: <span className="capitalize">{c.stressLevel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
