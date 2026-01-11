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

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr>
              <th className="py-2 pr-4">Checkpoint</th>
              <th className="py-2 pr-4">Age</th>
              <th className="py-2 pr-4">Portfolio</th>
              <th className="py-2 pr-4">Monthly Need</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((c) => (
              <tr
                key={c.age}
                className={cn(
                  "border-t",
                  c.stressLevel === "good" && "checkpoint-good",
                  c.stressLevel === "warn" && "checkpoint-warn",
                  c.stressLevel === "bad" && "checkpoint-bad"
                )}
              >
                <td className="py-3 pr-4 font-medium">{c.label}</td>
                <td className="py-3 pr-4">Age {c.age}</td>
                <td className="py-3 pr-4">{formatCurrency(c.portfolioBalance)}</td>
                <td className="py-3 pr-4">{formatCurrency(c.monthlySpend)}</td>
                <td className="py-3 pr-4 capitalize">{c.stressLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {checkpoints.map((checkpoint) => (
          <div
            key={checkpoint.age}
            className={cn(
              "rounded-xl p-4 border",
              checkpoint.stressLevel === "good" && "checkpoint-good",
              checkpoint.stressLevel === "warn" && "checkpoint-warn",
              checkpoint.stressLevel === "bad" && "checkpoint-bad"
            )}
          >
            {/* keep your existing card layout here */}
            <div className="text-sm font-medium opacity-80">{checkpoint.label}</div>
            <div className="text-2xl font-bold mt-1">Age {checkpoint.age}</div>
            {/* ... */}
          </div>
        ))}
      </div>
    </div>
  );
}
