import type { CalculatorInputs, SpendingRule } from "@/types/calculator";
import { StepInput } from "@/components/calculator/StepInput";

type Props = {
  inputs: CalculatorInputs;
  updateInput: <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => void;
};

export function SpendingRuleSection({ inputs, updateInput }: Props) {
  return (
    <div className="glass-card p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Spending Rule (Post-Retirement)</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This controls how withdrawals from your portfolio adjust after retirement.
          Fixed is the default.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Spending Rule</label>
          <select
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={inputs.spendingRule}
            onChange={(e) => {
              const rule = e.target.value as SpendingRule;

              updateInput("spendingRule", rule);

              // Ensure defaults exist when switching
              if (rule === "guardrails" && !inputs.guardrails) {
                updateInput("guardrails", {
                  lowerBand: 0.8,
                  upperBand: 1.2,
                  cutPct: 0.1,
                  raisePct: 0.1,
                });
              }

              if (rule === "die_with_zero" && !inputs.dieWithZero) {
                updateInput("dieWithZero", { targetAge: 95 });
              }
            }}
          >
            <option value="fixed">Fixed spending (default)</option>
            <option value="guardrails">Guardrails</option>
            <option value="die_with_zero">Die With Zero</option>
          </select>
        </div>
      </div>

      {inputs.spendingRule === "guardrails" && inputs.guardrails && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StepInput
            label="Lower Band (0.80 = 80%)"
            value={inputs.guardrails.lowerBand}
            onChange={(v) =>
              updateInput("guardrails", { ...inputs.guardrails!, lowerBand: v })
            }
            min={0.1}
            max={1.0}
            step={0.01}
          />
          <StepInput
            label="Upper Band (1.20 = 120%)"
            value={inputs.guardrails.upperBand}
            onChange={(v) =>
              updateInput("guardrails", { ...inputs.guardrails!, upperBand: v })
            }
            min={1.0}
            max={3.0}
            step={0.01}
          />
          <StepInput
            label="Cut % (0.10 = 10%)"
            value={inputs.guardrails.cutPct}
            onChange={(v) =>
              updateInput("guardrails", { ...inputs.guardrails!, cutPct: v })
            }
            min={0}
            max={0.5}
            step={0.01}
          />
          <StepInput
            label="Raise % (0.10 = 10%)"
            value={inputs.guardrails.raisePct}
            onChange={(v) =>
              updateInput("guardrails", { ...inputs.guardrails!, raisePct: v })
            }
            min={0}
            max={0.5}
            step={0.01}
          />
        </div>
      )}

      {inputs.spendingRule === "die_with_zero" && inputs.dieWithZero && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StepInput
            label="Target Age (spend down to ~$0)"
            value={inputs.dieWithZero.targetAge}
            onChange={(v) =>
              updateInput("dieWithZero", { ...inputs.dieWithZero!, targetAge: v })
            }
            min={inputs.retirementAge}
            max={100}
            step={1}
          />
        </div>
      )}
    </div>
  );
}
