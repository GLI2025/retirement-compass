import { IncomeCheckpoint } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface IncomeCheckpointsProps {
  checkpoints: IncomeCheckpoint[];
}

const formatCurrency = (value: number) => {
  return `$${Math.round(value).toLocaleString()}`;
};

export function IncomeCheckpoints({ checkpoints }: IncomeCheckpointsProps) {
  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Retirement Income Checkpoints</h3>
      
      <div className="grid gap-4 sm:grid-cols-3">
        {checkpoints.map((checkpoint) => (
          <div
            key={checkpoint.age}
            className={cn(
              'rounded-xl p-4 border',
              checkpoint.stressLevel === 'good' && 'checkpoint-good',
              checkpoint.stressLevel === 'warn' && 'checkpoint-warn',
              checkpoint.stressLevel === 'bad' && 'checkpoint-bad'
            )}
          >
            <div className="text-sm font-medium opacity-80">{checkpoint.label}</div>
            <div className="text-2xl font-bold mt-1">Age {checkpoint.age}</div>
            
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Monthly need</span>
                <span className="font-semibold">{formatCurrency(checkpoint.monthlyNeed)}</span>
              </div>
              
              {checkpoint.ssIncome > 0 && (
                <div className="flex justify-between">
                  <span className="opacity-70">Social Security</span>
                  <span className="font-semibold text-success">{formatCurrency(checkpoint.ssIncome)}</span>
                </div>
              )}
              
              {checkpoint.otherIncome > 0 && (
                <div className="flex justify-between">
                  <span className="opacity-70">Other income</span>
                  <span className="font-semibold text-success">{formatCurrency(checkpoint.otherIncome)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t border-current/20">
                <span className="opacity-70">From portfolio</span>
                <span className="font-semibold">{formatCurrency(checkpoint.fromPortfolio)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="opacity-70">Balance</span>
                <span className="font-bold">{formatCurrency(checkpoint.portfolioBalance)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
