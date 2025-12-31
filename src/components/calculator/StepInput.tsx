import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  className?: string;
}

export function StepInput({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  prefix,
  suffix,
  tooltip,
  className
}: StepInputProps) {
  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.-]/g, '');
    const numValue = parseFloat(rawValue) || 0;
    onChange(Math.min(max, Math.max(min, numValue)));
  };

  const formatValue = () => {
    if (prefix === '$') {
      return value.toLocaleString();
    }
    return value.toString();
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && (
          <span className="tooltip-trigger text-xs" title={tooltip}>
            ⓘ
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrease}
          className="step-button"
          disabled={value <= min}
        >
          <Minus className="w-4 h-4" />
        </button>
        
        <div className="glass-input flex-1 flex items-center px-4 py-3">
          {prefix && <span className="text-muted-foreground mr-1">{prefix}</span>}
          <input
            type="text"
            value={formatValue()}
            onChange={handleInputChange}
            className="bg-transparent w-full text-center font-semibold text-lg focus:outline-none"
          />
          {suffix && <span className="text-muted-foreground ml-1">{suffix}</span>}
        </div>
        
        <button
          type="button"
          onClick={handleIncrease}
          className="step-button"
          disabled={value >= max}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
