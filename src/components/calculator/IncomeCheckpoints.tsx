import { IncomeCheckpoint } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface IncomeCheckpointsProps {
  checkpoints: IncomeCheckpoint[];
}

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;
const annualTip = (monthly: number) => `≈ ${formatCurrency(monthly * 12)} / yr`;

function runwayLabel(portfolioBalance: number, withdrawMonthly: number) {
  // Always return a runway label
  if (portfolioBalance <= 0) return '0 yrs';
  if (withdrawMonthly <= 0) return '100+ yrs';

  const years = portfolioBalance / (withdrawMonthly * 12);
  if (!Number.isFinite(years) || years <= 0) return '0 yrs';
  if (years >= 100) return '100+ yrs';
  return `${years.toFixed(1)} yrs`;
}

function normalizeLabel(label: string) {
  // If label is "At Age 51" it's redundant with the separate Age line, so we’ll just show the label
  // and suppress the extra Age line below.
  return label?.trim() || '';
}

function labelAlreadyContainsAge(label: string, age: number) {
  const l = (label || '').toLowerCase();
  return l.includes('age') && l.includes(String(age));
}

export function IncomeCheckpoints({ checkpoints }: IncomeCheckpointsProps) {
  if (!checkpoints?.length) return null;

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Retirement Income Checkpoints</h3>

      <div className="space-y-3">
        {checkpoints.map((c) => {
          const label = normalizeLabel(c.label);

          // Monthly, nominal
          const incomeMonthly = (c.ssIncome ?? 0) + (c.otherIncome ?? 0);
          const expensesMonthly = c.monthlyNeed ?? 0;

          // Gap = income - expenses
          const gapMonthly = incomeMonthly - expensesMonthly;

          // Actual withdrawal from portfolio (after rule)
          const withdrawMonthly = Math.max(0, c.fromPortfolio ?? 0);

          // Gap semantics (neutral numbers, clear meaning)
          const isSurplus = gapMonthly >= 0;
          const gapAbs = Math.abs(gapMonthly);

          const gapLabel = isSurplus ? 'Surplus' : 'Shortfall';
          const gapExplain = isSurplus ? 'covers spending' : 'from portfolio';

          const showAgeLine = !labelAlreadyContainsAge(label, c.age);

          const runway = runwayLabel(c.portfolioBalance, withdrawMonthly);

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
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium opacity-80">{label}</div>
                  {showAgeLine && (
                    <div className="text-sm opacity-70">Age {c.age}</div>
                  )}
                </div>

                <div className="text-lg font-semibold whitespace-nowrap">
                  {formatCurrency(c.portfolioBalance)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div title={annualTip(incomeMonthly)}>
                  <span className="opacity-75">Income:</span> {formatCurrency(incomeMonthly)}/mo
                </div>

                <div title={annualTip(expensesMonthly)}>
                  <span className="opacity-75">Expenses:</span> {formatCurrency(expensesMonthly)}/mo
                </div>

                {/* Gap: neutral $ value, semantics in label */}
                <div title={annualTip(gapMonthly)}>
                  <span className={cn('opacity-75', isSurplus ? 'text-emerald-300' : 'text-amber-300')}>
                    {gapLabel}:
                  </span>{' '}
                  {formatCurrency(gapAbs)}/mo{' '}
                  <span className="opacity-60">({gapExplain})</span>
                </div>

                <div title={annualTip(withdrawMonthly)}>
                  <span className="opacity-75">Withdraw:</span>{' '}
                  {withdrawMonthly > 0 ? `${formatCurrency(withdrawMonthly)}/mo` : 'None'}
                </div>

                <div className="col-span-2" title="At current withdrawal rate">
                  <span className="opacity-75">Runway:</span> {runway}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
