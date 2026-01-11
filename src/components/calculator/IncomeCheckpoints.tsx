import { IncomeCheckpoint } from '@/types/calculator';
import { cn } from '@/lib/utils';

type Checkpoint = IncomeCheckpoint & {
  // New fields (safe: optional so this file compiles even if you haven't updated the type yet)
  incomeMonthly?: number;            // SS + pension + other (monthly)
  expensesMonthly?: number;          // total expenses (monthly)
  gapMonthly?: number;               // income - expenses
  withdrawalNeededMonthly?: number;  // max(0, -gap)
  runwayYears?: number | null;       // optional
};

interface IncomeCheckpointsProps {
  checkpoints: Checkpoint[];
}

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

const annualTip = (monthly: number) => `≈ ${formatCurrency(monthly * 12)} / yr`;

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

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr>
              <th className="py-2 pr-4">Checkpoint</th>
              <th className="py-2 pr-4">Age</th>
              <th className="py-2 pr-4">Portfolio</th>
              <th className="py-2 pr-4">Income</th>
              <th className="py-2 pr-4">Expenses</th>
              <th className="py-2 pr-4">Gap</th>
              <th className="py-2 pr-4">Withdraw</th>
              <th className="py-2 pr-4">Runway</th>
            </tr>
          </thead>

          <tbody>
            {checkpoints.map((c) => {
              // Backwards-compatible fallbacks:
              // - If you haven't wired in new fields yet, we’ll treat monthlySpend as expenses (best guess).
              const incomeMonthly = Number(c.incomeMonthly ?? 0);
              const expensesMonthly = Number(c.expensesMonthly ?? c.monthlySpend ?? 0);

              const gapMonthly =
                c.gapMonthly != null ? Number(c.gapMonthly) : incomeMonthly - expensesMonthly;

              const withdrawalNeededMonthly =
                c.withdrawalNeededMonthly != null
                  ? Number(c.withdrawalNeededMonthly)
                  : Math.max(0, -gapMonthly);

              const runwayYears =
                c.runwayYears !== undefined
                  ? c.runwayYears
                  : withdrawalNeededMonthly > 0 && c.portfolioBalance > 0
                    ? c.portfolioBalance / (withdrawalNeededMonthly * 12)
                    : null;

              const gapSign = gapMonthly >= 0 ? '+' : '−';
              const gapAbs = Math.abs(gapMonthly);

              return (
                <tr
                  key={`${c.age}-${c.label}`}
                  className={cn(
                    'border-t',
                    c.stressLevel === 'good' && 'checkpoint-good',
                    c.stressLevel === 'warn' && 'checkpoint-warn',
                    c.stressLevel === 'bad' && 'checkpoint-bad'
                  )}
                >
                  <td className="py-3 pr-4 font-medium">{c.label}</td>
                  <td className="py-3 pr-4">Age {c.age}</td>

                  <td className="py-3 pr-4 font-semibold">{formatCurrency(c.portfolioBalance)}</td>

                  <td className="py-3 pr-4" title={annualTip(incomeMonthly)}>
                    {formatCurrency(incomeMonthly)}/mo
                  </td>

                  <td className="py-3 pr-4" title={annualTip(expensesMonthly)}>
                    {formatCurrency(expensesMonthly)}/mo
                  </td>

                  <td className="py-3 pr-4" title={annualTip(gapMonthly)}>
                    {gapSign}
                    {formatCurrency(gapAbs)}/mo
                  </td>

                  <td className="py-3 pr-4" title={annualTip(withdrawalNeededMonthly)}>
                    {withdrawalNeededMonthly > 0
                      ? `Withdraw: ${formatCurrency(withdrawalNeededMonthly)}/mo`
                      : 'No withdrawal needed'}
                  </td>

                  <td className="py-3 pr-4" title="At current withdrawal rate">
                    {withdrawalNeededMonthly > 0 && runwayYears != null
                      ? formatRunway(Number(runwayYears))
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {checkpoints.map((c) => {
          const incomeMonthly = Number(c.incomeMonthly ?? 0);
          const expensesMonthly = Number(c.expensesMonthly ?? c.monthlySpend ?? 0);

          const gapMonthly = c.gapMonthly != null ? Number(c.gapMonthly) : incomeMonthly - expensesMonthly;

          const withdrawalNeededMonthly =
            c.withdrawalNeededMonthly != null ? Number(c.withdrawalNeededMonthly) : Math.max(0, -gapMonthly);

          const runwayYears =
            c.runwayYears !== undefined
              ? c.runwayYears
              : withdrawalNeededMonthly > 0 && c.portfolioBalance > 0
                ? c.portfolioBalance / (withdrawalNeededMonthly * 12)
                : null;

          const gapSign = gapMonthly >= 0 ? '+' : '−';
          const gapAbs = Math.abs(gapMonthly);

          return (
            <div
              key={`${c.age}-${c.label}`}
              className={cn(
                'rounded-xl p-4 border',
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
                  Gap: {gapSign}
                  {formatCurrency(gapAbs)}/mo
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs border" title={annualTip(withdrawalNeededMonthly)}>
                  {withdrawalNeededMonthly > 0
                    ? `Withdraw: ${formatCurrency(withdrawalNeededMonthly)}/mo`
                    : 'No withdrawal needed'}
                </span>

                {withdrawalNeededMonthly > 0 && runwayYears != null && (
                  <span className="px-3 py-1 rounded-full text-xs border" title="At current withdrawal rate">
                    Runway: {formatRunway(Number(runwayYears))}
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
