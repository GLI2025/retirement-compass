import React, { useEffect, useMemo, useState } from 'react';
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
  helperText?: string;
}

function decimalsFromStep(step: number) {
  if (!step || step >= 1) return 0;
  const s = step.toString();
  if (s.includes('e-')) return parseInt(s.split('e-')[1]!, 10);
  const dot = s.indexOf('.');
  return dot >= 0 ? s.length - dot - 1 : 0;
}

function roundToDecimals(n: number, decimals: number) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
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
  helperText,
  className,
}: StepInputProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  // Keep display clean + prevent float creep (0.8100000000000001)
  const stepDecimals = useMemo(() => decimalsFromStep(step), [step]);

  // Display formatting rules:
  // - $: no forced decimals, use locale string
  // - %: show 2 decimals (common expectation)
  // - everything else: show step-based decimals (e.g., step=0.01 -> 2 decimals)
  const displayDecimals = useMemo(() => {
    if (suffix === '%') return 2;
    return stepDecimals;
  }, [suffix, stepDecimals]);

  const normalize = (n: number) => {
    const clamped = clamp(n);
    const rounded = roundToDecimals(clamped, displayDecimals);
    return rounded;
  };

  // Draft text to allow typing without snapping to 0
  const [draft, setDraft] = useState<string>('');

  useEffect(() => {
    // When parent value changes (reset/buttons), sync the input field
    if (!Number.isFinite(value)) {
      setDraft(displayDecimals > 0 ? (0).toFixed(displayDecimals) : '0');
      return;
    }

    if (prefix === '$') {
      setDraft(Math.round(value).toString());
      return;
    }

    // show fixed decimals for % and step-decimal fields
    setDraft(displayDecimals > 0 ? value.toFixed(displayDecimals) : String(Math.round(value)));
  }, [value, prefix, displayDecimals]);

  const handleIncrease = () => {
    const next = normalize(value + step);
    onChange(next);
    // draft will sync via effect, but setting immediately feels snappier
    setDraft(displayDecimals > 0 ? next.toFixed(displayDecimals) : String(next));
  };

  const handleDecrease = () => {
    const next = normalize(value - step);
    onChange(next);
    setDraft(displayDecimals > 0 ? next.toFixed(displayDecimals) : String(next));
  };

  const parseInput = (text: string) => {
    // Allow digits, minus, decimal. For $, allow commas while typing (we strip them).
    const cleaned = text.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return null;
    return num;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextText = e.target.value;
    setDraft(nextText);

    const parsed = parseInput(nextText);
    if (parsed === null) return; // user is mid-typing

    // For money fields, treat as whole dollars (no cents)
    const candidate = prefix === '$' ? Math.round(parsed) : parsed;
    const next = normalize(candidate);
    onChange(next);
  };

  const handleBlur = () => {
    // On blur: if user left it blank/invalid, revert to current value
    const parsed = parseInput(draft);

    let finalValue = value;
    if (parsed !== null) {
      const candidate = prefix === '$' ? Math.round(parsed) : parsed;
      finalValue = normalize(candidate);
      onChange(finalValue);
    }

    // Rewrite draft into normalized display format
    if (prefix === '$') {
      setDraft(String(Math.round(finalValue)));
    } else {
      setDraft(displayDecimals > 0 ? finalValue.toFixed(displayDecimals) : String(Math.round(finalValue)));
    }
  };

  const renderValue = () => {
    // This is what the user sees in the input box.
    // - We show the draft while typing.
    // - For $, we can keep it plain while typing; formatting with commas can be done on blur if you want.
    // (Keeping it plain avoids cursor jumps.)
    return draft;
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
            value={renderValue()}
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputMode={suffix === '%' ? 'decimal' : prefix === '$' ? 'numeric' : 'decimal'}
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

      {helperText && (
        <p className="text-xs text-muted-foreground leading-snug">
          {helperText}
        </p>
      )}
    </div>
  );
}
