
import { Wallet } from "lucide-react";
import type { CalculatorInputs } from "@/types/calculator";
import { OtherIncomeSection } from "@/components/calculator/OtherIncomeSection";

type Props = {
  inputs: CalculatorInputs;
  updateInput: <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => void;
};

export function OtherIncomeSourcesSection({ inputs, updateInput }: Props) {
  return (
    <section id="otherIncome" className="glass-card p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Other Income Sources</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Add any additional income you expect during retirement — especially a
        pension.
        <span className="block mt-2">
          <strong>Pension tip:</strong> Add your pension starting at your
          retirement age. Turn COLA on only if your pension increases over time.
        </span>
      </p>

      <OtherIncomeSection
        incomes={inputs.otherIncome}
        onChange={(incomes) => updateInput("otherIncome", incomes)}
        currentAge={inputs.currentAge}
      />
    </section>
  );
}
