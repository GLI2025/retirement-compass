/**
 * Plain-English guide
 *
 * Purpose: Provides the add, edit, remove, and preset controls for pensions,
 * rental income, part-time work, and custom non-Social-Security income sources.
 *
 * Inputs/outputs: Receives the current OtherIncome array and current age from
 * OtherIncomeSourcesSection.tsx, then returns a replacement array after each saved
 * change. Monthly amounts are entered in today's dollars. With COLA enabled the
 * engine grows them from current age; otherwise they remain fixed nominal payments.
 * Start and optional end ages define when each source is available.
 *
 * Important behavior: Selecting a preset fills the form but does not add income
 * until Save is used. This component validates and stores inputs; it performs no
 * deterministic or Monte Carlo cash-flow math. The engine later combines saved
 * sources with Social Security, housing/mortgage, deposits, inflation, and the
 * selected Fixed/Guardrails/Die With Zero rule.
 *
 * Financial impact: High. Failure to save, update, or preserve timing and COLA
 * settings could omit or misstate income throughout retirement projections.
 */
import { useEffect, useRef, useState } from 'react';
import { Briefcase, DollarSign, Home, Plus, Trash2, X } from 'lucide-react';
import type { OtherIncome } from '@/types/calculator';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  applyIncomePreset,
  createIncomeSourceId,
  createOtherIncomeDraft,
  createOtherIncomeSource,
  type OtherIncomeDraft,
} from '@/utils/otherIncomeEntry';
import { StepInput } from './StepInput';

interface OtherIncomeSectionProps {
  incomes: OtherIncome[];
  onChange: (incomes: OtherIncome[]) => void;
  currentAge: number;
}

const incomePresets = [
  { label: 'Pension', icon: Briefcase, defaultAmount: 2000 },
  { label: 'Rental Income', icon: Home, defaultAmount: 1500 },
  { label: 'Part-time Work', icon: DollarSign, defaultAmount: 1000 },
];

export function OtherIncomeSection({ incomes, onChange, currentAge }: OtherIncomeSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newIncome, setNewIncome] = useState<OtherIncomeDraft>(() =>
    createOtherIncomeDraft(currentAge),
  );
  const [lastAddedIncome, setLastAddedIncome] = useState<OtherIncome>();
  const [saveError, setSaveError] = useState<string>();
  const addedStatusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNewIncome((previous) => ({
      ...previous,
      startAge: Math.max(currentAge, previous.startAge ?? currentAge),
    }));
  }, [currentAge]);

  useEffect(() => {
    if (lastAddedIncome) addedStatusRef.current?.focus();
  }, [lastAddedIncome]);

  const addIncome = () => {
    setSaveError(undefined);

    try {
      const income = createOtherIncomeSource(
        newIncome,
        currentAge,
        createIncomeSourceId(),
      );

      onChange([...incomes, income]);
      setIsAdding(false);
      setNewIncome(createOtherIncomeDraft(currentAge));
      setLastAddedIncome(income);
    } catch {
      setSaveError('We could not add this income source. Please try again.');
    }
  };

  const startAdding = () => {
    setLastAddedIncome(undefined);
    setSaveError(undefined);
    setIsAdding(true);
  };

  const updateIncome = (id: string, updates: Partial<OtherIncome>) => {
    onChange(incomes.map(income =>
      income.id === id ? { ...income, ...updates } : income,
    ));
  };

  const removeIncome = (id: string) => {
    onChange(incomes.filter(income => income.id !== id));
    if (lastAddedIncome?.id === id) setLastAddedIncome(undefined);
  };

  return (
    <div className="space-y-4">
      {incomes.length > 0 && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {incomes.length} income {incomes.length === 1 ? 'source' : 'sources'} included in this plan
        </div>
      )}

      {/* Existing income sources */}
      {incomes.map((income) => (
        <div
          key={income.id}
          className="glass-card p-4 border border-border/50 animate-fade-in"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <input
                type="text"
                value={income.label}
                onChange={(event) => updateIncome(income.id, { label: event.target.value })}
                aria-label="Income source name"
                className="bg-transparent font-semibold text-lg focus:outline-none focus:border-b border-primary"
                placeholder="Income source name"
              />
            </div>
            <button
              type="button"
              onClick={() => removeIncome(income.id)}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              aria-label={`Remove ${income.label || 'income source'}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StepInput
              label="Monthly amount (today’s dollars)"
              value={income.monthlyAmount}
              onChange={(value) => updateIncome(income.id, { monthlyAmount: value })}
              min={0}
              step={100}
              prefix="$"
            />

            <StepInput
              label="Start Age"
              value={income.startAge}
              onChange={(value) => updateIncome(income.id, { startAge: value })}
              min={currentAge}
              max={100}
              step={1}
            />

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-muted-foreground"
                htmlFor={`income-${income.id}-end-age`}
              >
                End Age (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`income-${income.id}-end-age`}
                  type="number"
                  value={income.endAge || ''}
                  onChange={(event) => updateIncome(income.id, {
                    endAge: event.target.value ? parseInt(event.target.value) : undefined,
                  })}
                  aria-describedby={`income-${income.id}-end-age-help`}
                  placeholder="Lifetime"
                  className="glass-input w-full px-4 py-3 text-center font-semibold"
                />
              </div>
              <p id={`income-${income.id}-end-age-help`} className="text-xs text-muted-foreground">
                Leave blank for lifetime
              </p>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-muted-foreground"
                htmlFor={`income-${income.id}-cola`}
              >
                Inflation Adjustment
              </label>
              <div className="flex items-center gap-3 h-12">
                <Switch
                  id={`income-${income.id}-cola`}
                  checked={income.hasCola}
                  onCheckedChange={(value) => updateIncome(income.id, { hasCola: value })}
                  aria-label={`Inflation adjustment for ${income.label || 'income source'}`}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm">
                  {income.hasCola ? 'COLA from current age' : 'Fixed nominal amount'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {lastAddedIncome && !isAdding && (
        <div
          ref={addedStatusRef}
          role="status"
          tabIndex={-1}
          className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <span className="font-semibold text-success">Income source added.</span>{' '}
          <span className="text-muted-foreground">
            {lastAddedIncome.label} — ${Math.round(lastAddedIncome.monthlyAmount).toLocaleString()}/mo
            starting at age {lastAddedIncome.startAge}.
          </span>
        </div>
      )}

      {/* Add new income */}
      {isAdding ? (
        <div className="glass-card p-4 border border-primary/30 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Add Income Source</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-2 hover:bg-secondary/50 rounded-lg"
              aria-label="Close add income source"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            Choose a preset to fill the form, then review and save:
          </p>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {incomePresets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = newIncome.label === preset.label
                && newIncome.monthlyAmount === preset.defaultAmount;

              return (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => setNewIncome((previous) =>
                    applyIncomePreset(previous, preset)
                  )}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-transparent bg-secondary/50 hover:border-primary/50 hover:bg-primary/20',
                  )}
                  aria-label={`Use ${preset.label} preset at $${preset.defaultAmount.toLocaleString()} per month`}
                  aria-pressed={isSelected}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm font-medium">{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Or enter a custom income source:
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="new-income-name">
                Income name (optional)
              </label>
              <input
                id="new-income-name"
                type="text"
                value={newIncome.label}
                onChange={(event) => setNewIncome(previous => ({
                  ...previous,
                  label: event.target.value,
                }))}
                placeholder="e.g., Consulting"
                aria-describedby="new-income-name-help"
                className="glass-input w-full px-4 py-3"
              />
              <p id="new-income-name-help" className="text-xs text-muted-foreground">
                Leave blank to use “Other Income.”
              </p>
            </div>

            <StepInput
              label="Monthly amount (today’s dollars)"
              value={newIncome.monthlyAmount ?? 1000}
              onChange={(value) => setNewIncome(previous => ({
                ...previous,
                monthlyAmount: value,
              }))}
              min={0}
              step={100}
              prefix="$"
            />

            <StepInput
              label="Start Age"
              value={newIncome.startAge ?? currentAge}
              onChange={(value) => setNewIncome(previous => ({
                ...previous,
                startAge: value,
              }))}
              min={currentAge}
              max={100}
              step={1}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="new-income-cola">
                Inflation Adjustment
              </label>
              <div className="flex items-center gap-3 h-12">
                <Switch
                  id="new-income-cola"
                  checked={newIncome.hasCola ?? false}
                  onCheckedChange={(value) => setNewIncome(previous => ({
                    ...previous,
                    hasCola: value,
                  }))}
                  aria-label="Inflation adjustment for new income source"
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm">
                  {newIncome.hasCola ? 'COLA from current age' : 'Fixed nominal amount'}
                </span>
              </div>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={addIncome}
                className="gradient-button w-full py-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save Income Source
              </Button>
            </div>
          </div>

          {saveError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdding}
          className={cn(
            "w-full p-4 rounded-xl border-2 border-dashed border-border/50",
            "hover:border-primary/50 hover:bg-primary/5 transition-all duration-200",
            "flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">
            {incomes.length > 0 ? 'Add Another Income Source' : 'Add Income Source'}
          </span>
        </button>
      )}

      {incomes.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Add pensions, rental income, part-time work, or any other income you expect in retirement.
        </p>
      )}
    </div>
  );
}
