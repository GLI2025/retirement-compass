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
