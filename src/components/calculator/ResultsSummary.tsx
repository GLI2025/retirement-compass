import { CalculatorResults } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface ResultsSummaryProps {
  results: CalculatorResults;
}

const CONFIDENCE_TARGET = 0.7;

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

export function ResultsSummary({ results }: ResultsSummaryProps) {
  const { requiredSavings, projectedAtRetirement, gap, successProbability } = results;

  const isSurplus = gap >= 0;

  // Monte Carlo “confidence” line (only when MC is enabled and successProbability exists)
  const hasMC = typeof successProbability === 'number';
  const heldUpCount = hasMC ? Math.round(successProbability * 100) : 0;
  const belowTarget = hasMC ? successProbability < CONFIDENCE_TARGET : false;

  return (
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

        {/* Always keep this line separate from surplus/gap */}
        {hasMC ? (
          <p className="text-xs text-muted-foreground mt-2">
            Plan held up in <strong>{heldUpCount} out of 100</strong> market scenarios
            {belowTarget && (
              <> (below {Math.round(CONFIDENCE_TARGET * 100)} target)</>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            {isSurplus ? "You're ahead of your goal!" : 'Additional savings needed'}
          </p>
        )}
      </div>
    </div>
  );
}
