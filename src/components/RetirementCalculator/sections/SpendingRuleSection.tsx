/**
 * Plain-English guide
 *
 * Purpose: Lets the user select Fixed, Guardrails, or Die With Zero and enter
 * the additional settings required by the selected retirement spending rule.
 *
 * Inputs/outputs: Receives CalculatorInputs and returns rule, trigger, target-age,
 * and buffer edits to RetirementCalculator.tsx. A Die With Zero ending buffer is
 * entered in today's dollars; guardrail values are multipliers or percentages.
 *
 * Important behavior: This component supplies defaults when a newly selected
 * rule has no settings, but it does not calculate withdrawals. The deterministic
 * engine and Monte Carlo paths apply the selected rule alongside Social Security,
 * other income, housing/mortgage, deposits, and inflation. Fixed leaves spending
 * unchanged, Guardrails may adjust portfolio-funded spending, and Die With Zero
 * tests entered spending against its target age and ending buffer.
 *
 * Financial impact: High. Incorrect settings could change withdrawal timing,
 * spending adjustments, plan end, or the required ending target.
 */
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

const SPENDING_RULE_SUMMARIES: Record<
  SpendingRule,
  { title: string; description: string }
> = {
  fixed: {
    title: "Fixed — Maintain Purchasing Power",
    description:
      "Keep approximately the same lifestyle each year after inflation. Spending does not automatically react to market changes.",
  },
  guardrails: {
    title: "Guardrails — Adjust With Markets",
    description:
      "Allow portfolio-funded spending to increase or decrease when the withdrawal rate crosses your selected boundaries.",
  },
  die_with_zero: {
    title: "Die With Zero — Target an Ending Balance",
    description:
      "Test your entered spending through the target age while aiming to finish with your selected buffer.",
  },
};

export function SpendingRuleSection({ inputs, updateInput }: Props) {
  const selectedRuleSummary = SPENDING_RULE_SUMMARIES[inputs.spendingRule];

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

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="text-sm font-semibold">{selectedRuleSummary.title}</div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {selectedRuleSummary.description}
        </p>
      </div>

      {inputs.spendingRule === "guardrails" && inputs.guardrails && (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StepInput
              label={`Increase trigger (${Math.round(inputs.guardrails.lowerBand * 100)}% of starting rate)`}
              value={inputs.guardrails.lowerBand}
              onChange={(v) =>
                updateInput("guardrails", { ...inputs.guardrails!, lowerBand: v })
              }
              min={0.1}
              max={1.0}
              step={0.01}
            />
            <StepInput
              label={`Reduction trigger (${Math.round(inputs.guardrails.upperBand * 100)}% of starting rate)`}
              value={inputs.guardrails.upperBand}
              onChange={(v) =>
                updateInput("guardrails", { ...inputs.guardrails!, upperBand: v })
              }
              min={1.0}
              max={3.0}
              step={0.01}
            />
            <StepInput
              label={`Portfolio withdrawal reduction (${Math.round(inputs.guardrails.cutPct * 100)}%)`}
              value={inputs.guardrails.cutPct}
              onChange={(v) =>
                updateInput("guardrails", { ...inputs.guardrails!, cutPct: v })
              }
              min={0}
              max={0.5}
              step={0.01}
            />
            <StepInput
              label={`Portfolio withdrawal increase (${Math.round(inputs.guardrails.raisePct * 100)}%)`}
              value={inputs.guardrails.raisePct}
              onChange={(v) =>
                updateInput("guardrails", { ...inputs.guardrails!, raisePct: v })
              }
              min={0}
              max={0.5}
              step={0.01}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Trigger percentages are measured against the withdrawal rate established at
            retirement. The entered values are multipliers: 0.80 means 80% and 1.20 means 120%.
          </p>
        </div>
      )}

      {inputs.spendingRule === "die_with_zero" && inputs.dieWithZero && (
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
      )}
    </div>
  );
}
