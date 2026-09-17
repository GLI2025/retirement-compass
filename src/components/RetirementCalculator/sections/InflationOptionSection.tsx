/**
 * Plain-English guide
 *
 * Purpose: Collects whether general inflation is modeled and the annual rate
 * used to convert today's-dollar spending into future nominal spending.
 *
 * Inputs/outputs: Receives CalculatorInputs and reports inflation edits to
 * RetirementCalculator.tsx. It displays no calculation results and performs no
 * deterministic or Monte Carlo math itself.
 *
 * Important behavior: The engine applies this setting to eligible expenses and
 * COLA income. Fixed nominal mortgage payments and non-COLA income do not grow;
 * rent follows its separately selected rent-growth rate. Deposits and the
 * Fixed/Guardrails/Die With Zero rules are handled by the financial engine.
 *
 * Financial impact: High. A wrong rate or toggle can change the future dollar
 * value of decades of spending and income across all projections.
 */
import type { CalculatorInputs } from "@/types/calculator";
import { ToggleOption } from "@/components/calculator/ToggleOption";
import { StepInput } from "@/components/calculator/StepInput";

type Props = {
  inputs: CalculatorInputs;
  updateInput: <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => void;
};

export function InflationOptionSection({ inputs, updateInput }: Props) {
  return (
    <ToggleOption
      label="Account for Inflation"
      description="Adjust projections for rising costs over time"
      enabled={inputs.inflationEnabled}
      onToggle={(v) => updateInput("inflationEnabled", v)}
    >
      <StepInput
        label="Inflation Rate"
        value={inputs.inflationRate}
        onChange={(v) => updateInput("inflationRate", v)}
        helperText="If expenses are entered in today’s dollars, inflation will scale them automatically."
        min={0}
        max={10}
        step={0.1}
        suffix="%"
      />
    </ToggleOption>
  );
}
