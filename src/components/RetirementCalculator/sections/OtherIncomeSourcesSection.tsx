
/**
 * Plain-English guide
 *
 * Purpose: Introduces the additional-income inputs and connects the reusable
 * OtherIncomeSection form to the main calculator's otherIncome list.
 *
 * Inputs/outputs: Receives CalculatorInputs and returns the edited income-source
 * array to RetirementCalculator.tsx. Entered monthly amounts are today's dollars.
 * With COLA on, the engine grows an amount from current age; with COLA off, it
 * remains nominal. Income begins only at its selected start age.
 *
 * Important behavior: This wrapper performs no deterministic or Monte Carlo
 * math. Social Security has separate controls, while the engine combines all
 * applicable income with housing, deposits, inflation, and the spending rule.
 *
 * Financial impact: Medium. Incorrect wiring could omit, duplicate, or mistime
 * pensions and other income in every downstream projection.
 */
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
        pension. Enter each monthly amount in today&apos;s dollars.
        <span className="block mt-2">
          <strong>Pension tip:</strong> Add your pension starting at your
          retirement age. With COLA on, it grows from your current age to preserve
          today&apos;s buying power. With COLA off, it stays a fixed nominal payment.
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
