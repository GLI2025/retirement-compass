import { useState } from 'react';
import { OtherIncome } from '@/types/calculator';
import { StepInput } from './StepInput';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Briefcase, Home, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [newIncome, setNewIncome] = useState<Partial<OtherIncome>>({
    label: '',
    monthlyAmount: 1000,
    startAge: currentAge,
    hasCola: false
  });

  const addIncome = (preset?: typeof incomePresets[0]) => {
    const income: OtherIncome = {
      id: crypto.randomUUID(),
      label: preset?.label || newIncome.label || 'Other Income',
      monthlyAmount: preset?.defaultAmount || newIncome.monthlyAmount || 1000,
      startAge: newIncome.startAge || currentAge,
      endAge: newIncome.endAge,
      hasCola: newIncome.hasCola || false
    };
    
    onChange([...incomes, income]);
    setIsAdding(false);
    setNewIncome({
      label: '',
      monthlyAmount: 1000,
      startAge: currentAge,
      hasCola: false
    });
  };

  const updateIncome = (id: string, updates: Partial<OtherIncome>) => {
    onChange(incomes.map(inc => 
      inc.id === id ? { ...inc, ...updates } : inc
    ));
  };

  const removeIncome = (id: string) => {
    onChange(incomes.filter(inc => inc.id !== id));
  };

  return (
    <div className="space-y-4">
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
                onChange={(e) => updateIncome(income.id, { label: e.target.value })}
                className="bg-transparent font-semibold text-lg focus:outline-none focus:border-b border-primary"
                placeholder="Income source name"
              />
            </div>
            <button
              onClick={() => removeIncome(income.id)}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StepInput
              label="Monthly Amount"
              value={income.monthlyAmount}
              onChange={(v) => updateIncome(income.id, { monthlyAmount: v })}
              min={0}
              step={100}
              prefix="$"
            />
            
            <StepInput
              label="Start Age"
              value={income.startAge}
              onChange={(v) => updateIncome(income.id, { startAge: v })}
              min={currentAge}
              max={100}
              step={1}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                End Age (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={income.endAge || ''}
                  onChange={(e) => updateIncome(income.id, { 
                    endAge: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="Lifetime"
                  className="glass-input w-full px-4 py-3 text-center font-semibold"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank for lifetime</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Inflation Adjustment
              </label>
              <div className="flex items-center gap-3 h-12">
                <Switch
                  checked={income.hasCola}
                  onCheckedChange={(v) => updateIncome(income.id, { hasCola: v })}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm">
                  {income.hasCola ? 'COLA applied' : 'Fixed amount'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add new income */}
      {isAdding ? (
        <div className="glass-card p-4 border border-primary/30 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Add Income Source</h4>
            <button
              onClick={() => setIsAdding(false)}
              className="p-2 hover:bg-secondary/50 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {incomePresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.label}
                  onClick={() => addIncome(preset)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-primary/20 hover:border-primary/50 border border-transparent transition-all"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Or create a custom income source:
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Income Name
              </label>
              <input
                type="text"
                value={newIncome.label}
                onChange={(e) => setNewIncome(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Consulting"
                className="glass-input w-full px-4 py-3"
              />
            </div>

            <StepInput
              label="Monthly Amount"
              value={newIncome.monthlyAmount || 1000}
              onChange={(v) => setNewIncome(prev => ({ ...prev, monthlyAmount: v }))}
              min={0}
              step={100}
              prefix="$"
            />

            <StepInput
              label="Start Age"
              value={newIncome.startAge || currentAge}
              onChange={(v) => setNewIncome(prev => ({ ...prev, startAge: v }))}
              min={currentAge}
              max={100}
              step={1}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Inflation Adjustment
              </label>
              <div className="flex items-center gap-3 h-12">
                <Switch
                  checked={newIncome.hasCola || false}
                  onCheckedChange={(v) => setNewIncome(prev => ({ ...prev, hasCola: v }))}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm">
                  {newIncome.hasCola ? 'COLA applied' : 'Fixed amount'}
                </span>
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => addIncome()}
                disabled={!newIncome.label}
                className="gradient-button w-full py-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Income
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className={cn(
            "w-full p-4 rounded-xl border-2 border-dashed border-border/50",
            "hover:border-primary/50 hover:bg-primary/5 transition-all duration-200",
            "flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Income Source</span>
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
