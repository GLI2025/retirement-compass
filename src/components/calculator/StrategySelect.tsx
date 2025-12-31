import { InvestmentStrategy, STRATEGIES } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface StrategySelectProps {
  value: InvestmentStrategy;
  onChange: (value: InvestmentStrategy) => void;
  label?: string;
  className?: string;
}

export function StrategySelect({
  value,
  onChange,
  label = 'Investment Strategy',
  className
}: StrategySelectProps) {
  const strategies = Object.entries(STRATEGIES) as [InvestmentStrategy, typeof STRATEGIES[InvestmentStrategy]][];

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        {label}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {strategies.map(([key, strategy]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'glass-input px-3 py-3 text-center transition-all duration-200',
              value === key 
                ? 'border-primary bg-primary/20 ring-2 ring-primary/50' 
                : 'hover:border-primary/50'
            )}
          >
            <div className="font-semibold text-sm">{strategy.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {(strategy.expectedReturn * 100).toFixed(0)}% return
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {STRATEGIES[value].description}
      </p>
    </div>
  );
}
