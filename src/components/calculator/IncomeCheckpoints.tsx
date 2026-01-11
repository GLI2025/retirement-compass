import { IncomeCheckpoint } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface IncomeCheckpointsProps {
  checkpoints: IncomeCheckpoint[];
}

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;
const annualTip = (monthly: number) => `≈ ${formatCurrency(monthly * 12)} / yr`;
const fmtMonthly = (v: number) => `${formatCurrency(v)}/mo`;

const formatGap = (gapMonthly: number) => {
  const sign = gapMonthly >= 0 ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(gapMonthly))}/mo`;
};

const formatRunway = (years: number) => {
  if (!Number.isFinite(years) || years <= 0) return '—';
  if (years >= 99) return '99+ yrs';
  return `${years.toFixed(1)} yrs`;
};

export function IncomeCheckpoints({ checkpoints }: IncomeCheckpointsProps) {
  if (!checkpoints?.length) return null;

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Retirement Income Checkpoints</h3>

      {/* Desktop: real Excel-style table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4">Label</th>
              <th className="py-2 pr-4">Age</th>
              <th className="py-2 pr-4 text-right">Portfolio</th>
              <th className="py-2 pr-4 text-right">Income</th>
              <th className="py-2 pr-4 text-right">Expenses</th>
              <th className="py-2 pr-4 text-right">Gap</th>
              <th className="py-2 pr-4 text-right">Withdraw</th>
              <th className="py-2 pr-2 text-right">Runway</th>
            </tr>
          </thead>

          <tbody>
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
                <tr
                  key={`${c.age}-${c.label}`}
                  className={cn(
                    'border-b border-white/5',
                    'hover:bg-white/5 transition-colors',
                    c.stressLevel === 'good' && 'checkpoint-good',
                    c.stressLevel === 'warn' && 'checkpoint-warn',
                    c.stressLevel === 'bad' && 'checkpoint-bad'
                  )}
                >
                  <td className="py-2 pr-4 font-medium whitespace-nowrap">{c.label}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">Age {c.age}</td>

                  <td className="py-2 pr-4 text-right font-semibold whitespace-nowrap">
                    {formatCurrency(c.portfolioBalance)}
                  </td>

                  <td className="py-2 pr-4 text-right whitespace-nowrap" title={annualTip(incomeMonthly)}>
                    {fmtMonthly(incomeMonthly)}
                  </td>

                  <td className="py-2 pr-4 text-right whitespace-nowrap" title={annualTip(expensesMonthly)}>
                    {fmtMonthly(expensesMonthly)}
                  </td>

                  <td
                    className={cn(
                      'py-2 pr-4 text-right font-semibold whitespace-nowrap',
                      gapMonthly >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    )}
                    title={annualTip(gapMonthly)}
                  >
                    {formatGap(gapMonthly)}
                  </td>

                  <td className="py-2 pr-4 text-right whitespace-nowrap" title={annualTip(withdrawMonthly)}>
                    {withdrawMonthly > 0 ? fmtMonthly(withdrawMonthly) : '—'}
                  </td>

                  <td className="py-2 pr-2 text-right whitespace-nowrap" title="At current withdrawal rate">
                    {withdrawMonthly > 0 && runwayYears != null ? formatRunway(runwayYears) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: compact two-line rows */}
      <div className="md:hidden space-y-2">
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
                'rounded-xl border border-white/10 px-3 py-2',
                c.stressLevel === 'good' && 'checkpoint-good',
                c.stressLevel === 'warn' && 'checkpoint-warn',
                c.stressLevel === 'bad' && 'checkpoint-bad'
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.label}</div>
                  <div className="text-xs opacity-70">Age {c.age}</div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(c.portfolioBalance)}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs opacity-90">
                <div title={annualTip(incomeMonthly)}>Income: {fmtMonthly(incomeMonthly)}</div>
                <div title={annualTip(expensesMonthly)}>Expenses: {fmtMonthly(expensesMonthly)}</div>

                <div
                  className={cn(gapMonthly >= 0 ? 'text-emerald-300' : 'text-rose-300')}
                  title={annualTip(gapMonthly)}
                >
                  Gap: {formatGap(gapMonthly)}
                </div>

                <div title={annualTip(withdrawMonthly)}>
                  Withdraw: {withdrawMonthly > 0 ? fmtMonthly(withdrawMonthly) : '—'}
                </div>

                <div className="col-span-2" title="At current withdrawal rate">
                  Runway: {withdrawMonthly > 0 && runwayYears != null ? formatRunway(runwayYears) : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
