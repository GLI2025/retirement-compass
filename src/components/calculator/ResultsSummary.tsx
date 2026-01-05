import { CalculatorResults } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface ResultsSummaryProps {
  results: CalculatorResults;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

export function ResultsSummary({ results }: ResultsSummaryProps) {
  const { requiredSavings, projectedAtRetirement, gap, isOnTrack, successProbability } = results;

  const CONFIDENCE_TARGET = 0.7;

  const isOnTrack70 =
    typeof successProbability === 'number'
      ? successProbability >= CONFIDENCE_TARGET
      : isOnTrack;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Required */}
      <div className="glass-card p-4 sm:p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Target className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Required Savings
          </span>
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
          <span className="text-sm font-medium text-muted-foreground">
            Projected Savings
          </span>
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
          isOnTrack70 ? 'border-success/30' : 'border-warning/30'
        )}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          {isOnTrack70 ? (
            <TrendingUp className="w-5 h-5 text-success" />
          ) : (
            <TrendingDown className="w-5 h-5 text-warning" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {gap >= 0 ? 'Surplus' : 'Gap'}
          </span>
        </div>

        <div
          className={cn(
            'text-2xl sm:text-3xl font-bold',
            gap >= 0 ? 'text-success' : 'text-warning'
          )}
        >
          {gap >= 0 ? '+' : '-'}
          {formatCurrency(Math.abs(gap))}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {typeof successProbability === 'number'
            ? `Plan held up in ${Math.round(successProbability * 100)} out of 100 market scenarios`
            : 'Based on portfolio value at retirement age'}
        </p>
      </div>
    </div>
  );
}
