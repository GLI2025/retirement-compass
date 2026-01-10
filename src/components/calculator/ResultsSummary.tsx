import type { CalculatorInputs, CalculatorResults } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { yearsFromNow, toTodayDollars } from '@/utils/money';

interface ResultsSummaryProps {
  results: CalculatorResults;
  inputs: CalculatorInputs;
}

const CONFIDENCE_TARGET = 0.7;
const MC_RUNS = 1000;

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

export function ResultsSummary({ results, inputs }: ResultsSummaryProps) {
  const { requiredSavings, projectedAtRetirement, gap, successProbability, checkpoints } = results;

  const isSurplus = gap >= 0;

  // Monte Carlo “confidence” line
  const hasMC = typeof successProbability === 'number';
  const heldUpCount = hasMC ? Math.round(successProbability * MC_RUNS) : 0;
  const belowTarget = hasMC ? successProbability < CONFIDENCE_TARGET : false;

  // Retirement paycheck block (use the retirement checkpoint)
  const retireCp = checkpoints?.find(c => c.age === inputs.retirementAge);

  // Convert to today's dollars for understanding (only if inflation enabled)
  const y = yearsFromNow(inputs.currentAge, inputs.retirementAge);

  const spendingNominal = retireCp?.monthlyNeed ?? 0;
  const guaranteedNominal = (retireCp?.ssIncome ?? 0) + (retireCp?.otherIncome ?? 0);
  const fromPortfolioNominal = retireCp?.fromPortfolio ?? 0;

  const spendingToday = inputs.inflationEnabled
    ? toTodayDollars(spendingNominal, y, inputs.inflationRate)
    : spendingNominal;

  const guaranteedToday = inputs.inflationEnabled
    ? toTodayDollars(guaranteedNominal, y, inputs.inflationRate)
    : guaranteedNominal;

  const fromPortfolioToday = inputs.inflationEnabled
    ? toTodayDollars(fromPortfolioNominal, y, inputs.inflationRate)
    : fromPortfolioNominal;

  return (
    <div className="space-y-4">
      {/* Top row: existing 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Required */}
        <div className="glass-card p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Required Savings</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold">
            {formatCurrency(requiredSavings)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            at retirement to maintain lifestyle
          </p>
        </div>

        {/* Projected */}
        <div className="glass-card p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Projected Savings</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold gradient-text">
            {formatCurrency(projectedAtRetirement)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            at your target retirement age
          </p>
        </div>

        {/* Surplus / Gap */}
        <div
          className={cn(
            'glass-card p-4 sm:p-6 text-center border-2',
            isSurplus ? 'border-success/30' : 'border-warning/30'
          )}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {isSurplus ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-warning" />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {isSurplus ? 'Surplus' : 'Gap'}
            </span>
          </div>

          <div
            className={cn(
              'text-2xl sm:text-3xl font-bold',
              isSurplus ? 'text-success' : 'text-warning'
            )}
          >
            {isSurplus ? '+' : '-'}
            {formatCurrency(Math.abs(gap))}
          </div>

          {hasMC ? (
            <p className="text-xs text-muted-foreground mt-2">
              Plan held up in <strong>{heldUpCount} / {MC_RUNS}</strong> market scenarios
              {belowTarget && (
                <> (below {Math.round(CONFIDENCE_TARGET * 100)}% target)</>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              {isSurplus ? "You're ahead of your goal!" : 'Additional savings needed'}
            </p>
          )}
        </div>
      </div>

      {/* Second row: Retirement Paycheck (today's dollars) */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Retirement Paycheck (today’s dollars)</h3>
            <p className="text-xs text-muted-foreground">
              Shown at age {inputs.retirementAge}. Helps you understand “what it will feel like.”
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Spending</div>
            <div className="text-xl font-bold">{formatCurrency(spendingToday)}/mo</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Guaranteed income</div>
            <div className="text-xl font-bold">{formatCurrency(guaranteedToday)}/mo</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">From portfolio</div>
            <div className="text-xl font-bold">{formatCurrency(fromPortfolioToday)}/mo</div>
          </div>
        </div>

        {!retireCp && (
          <p className="text-xs text-muted-foreground mt-3">
            (Note: Retirement checkpoint not found yet. Ensure checkpoints include retirement age.)
          </p>
        )}
      </div>
    </div>
  );
}
