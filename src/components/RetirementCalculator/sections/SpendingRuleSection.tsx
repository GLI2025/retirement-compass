import type { CalculatorInputs, SpendingRule } from "@/types/calculator";
import { StepInput } from "@/components/calculator/StepInput";
import { DEFAULT_RETIREMENT_GUARDRAILS } from "@/lib/calculations/spendingRules";

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
          <label className="text-sm font-medium" htmlFor="retirement-spending-rule">
            Spending Rule
          </label>
          <select
            id="retirement-spending-rule"
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={inputs.spendingRule}
            onChange={(e) => {
              const rule = e.target.value as SpendingRule;

              updateInput("spendingRule", rule);

              // Ensure defaults exist when switching
              if (rule === "guardrails" && !inputs.guardrails) {
                updateInput("guardrails", { ...DEFAULT_RETIREMENT_GUARDRAILS });
              }

              if (rule === "die_with_zero" && !inputs.dieWithZero) {
                updateInput("dieWithZero", { targetAge: 95, bufferAmount: 0 });
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
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The chart uses the retirement spending you enter and tests whether the portfolio
            reaches your target age with the selected ending buffer. If the projection can
            support more, the results show a separate spending amount you can choose to test.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StepInput
              label="Portfolio Target Age"
              value={inputs.dieWithZero.targetAge}
              onChange={(v) =>
                updateInput("dieWithZero", { ...inputs.dieWithZero!, targetAge: v })
              }
              min={inputs.retirementAge + 1}
              max={100}
              step={1}
            />
            <StepInput
              label="Ending Portfolio Buffer"
              value={inputs.dieWithZero.bufferAmount ?? 0}
              onChange={(v) =>
                updateInput("dieWithZero", { ...inputs.dieWithZero!, bufferAmount: v })
              }
              min={0}
              max={10000000}
              step={10000}
              prefix="$"
              helperText="Amount to preserve at the target age, in today's dollars."
            />
          </div>
        </div>
      )}
    </div>
  );
}
