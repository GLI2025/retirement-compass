import { Calculator } from "lucide-react";
import type { CalculatorInputs } from "@/types/calculator";
import { StepInput } from "@/components/calculator/StepInput";

type Props = {
  inputs: CalculatorInputs;
  updateInput: <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => void;
};

export function YourInformationSection({ inputs, updateInput }: Props) {
  return (
    <section id="currentAge" className="glass-card p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Your Information</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StepInput
          label="Current Age"
          value={inputs.currentAge}
          onChange={(v) => updateInput("currentAge", v)}
          min={18}
          max={80}
          step={1}
          tooltip="Your current age in years"
        />

        <StepInput
          label="Retirement Age"
          value={inputs.retirementAge}
          onChange={(v) => updateInput("retirementAge", v)}
          helperText="Pension tip: set this to the age your pension starts."
          min={inputs.currentAge + 1}
          max={80}
          step={1}
          tooltip="When you plan to retire"
        />

        <StepInput
          label="Monthly Expenses"
          value={inputs.monthlyExpenses}
          onChange={(v) => updateInput("monthlyExpenses", v)}
          helperText="Enter expenses in today’s dollars. If inflation is enabled, we increase these automatically over time."
          min={0}
          max={50000}
          step={100}
          prefix="$"
          tooltip="Monthly spending in today’s dollars. If this includes your mortgage payment, the Mortgage Payoff toggle will remove it at the payoff age."
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StepInput
          label="Total Retirement Savings"
          value={inputs.currentSavings}
          onChange={(v) => updateInput("currentSavings", v)}
          helperText="This is the total amount you already have saved for retirement. Monthly savings are entered separately below."
          min={0}
          step={1000}
          prefix="$"
          tooltip="Many use this amount as a bridge before a pension or SS begin."
        />

        <StepInput
          label="Monthly Contribution"
          value={inputs.monthlyContribution}
          onChange={(v) => updateInput("monthlyContribution", v)}
          helperText="If you stop working at retirement, contributions usually drop to $0."
          min={0}
          step={50}
          prefix="$"
          tooltip="Your monthly retirement savings"
        />

        <StepInput
          label="Employer Match"
          value={inputs.employerContribution}
          onChange={(v) => updateInput("employerContribution", v)}
          helperText="Employer contributions typically stop once you leave your job."
          min={0}
          step={50}
          prefix="$"
          tooltip="Monthly employer contribution"
        />
      </div>
    </section>
  );
}
