import { useId } from "react";
import type { CalculatorInputs, HousingPlan } from "@/types/calculator";
import { ToggleOption } from "@/components/calculator/ToggleOption";
import { StepInput } from "@/components/calculator/StepInput";
import {
  getHousingInputWarning,
  MAX_RENT_GROWTH_RATE,
} from "@/lib/calculations/housing";

type Props = {
  inputs: CalculatorInputs;
  updateInput: <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => void;
};

const HOUSING_PLANS: { value: HousingPlan; label: string; description: string }[] = [
  {
    value: "own",
    label: "Own",
    description: "Mortgage payment until payoff",
  },
  {
    value: "rent",
    label: "Rent",
    description: "Rent that increases each year",
  },
];

export function HousingSection({ inputs, updateInput }: Props) {
  const planGroupId = useId();
  const warning = getHousingInputWarning(inputs);

  return (
    <ToggleOption
      label="Housing Details"
      description="Model your housing cost separately so it can pay off or grow correctly"
      enabled={inputs.housePayoffEnabled}
      onToggle={(v) => updateInput("housePayoffEnabled", v)}
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">Housing plan</legend>
          <div
            role="radiogroup"
            aria-label="Housing plan"
            className="mt-2 grid gap-2 sm:grid-cols-2"
          >
            {HOUSING_PLANS.map((plan) => (
              <label
                key={plan.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
              >
                <input
                  type="radio"
                  name={`housing-plan-${planGroupId}`}
                  value={plan.value}
                  checked={inputs.housingPlan === plan.value}
                  onChange={() => updateInput("housingPlan", plan.value)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium">{plan.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {plan.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {inputs.housingPlan === "rent" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput
              label="Monthly rent in today’s dollars"
              value={inputs.monthlyRent}
              onChange={(v) => updateInput("monthlyRent", v)}
              helperText="Enter what you pay now, or what comparable rent costs today. Keep renters insurance and utilities in total monthly expenses."
              min={0}
              step={100}
              prefix="$"
            />
            <StepInput
              label="Expected annual rent increase"
              value={inputs.rentGrowthRate}
              onChange={(v) => updateInput("rentGrowthRate", v)}
              helperText="Rent increases annually using this selected rate. It stays active even if general inflation is turned off."
              min={0}
              max={MAX_RENT_GROWTH_RATE}
              step={0.1}
              suffix="%"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput
              label="Monthly mortgage payment"
              value={inputs.currentMortgagePayment}
              onChange={(v) => updateInput("currentMortgagePayment", v)}
              helperText="Enter principal and interest only. Keep property taxes, insurance, HOA, maintenance, and utilities in total monthly expenses."
              min={0}
              step={100}
              prefix="$"
            />
            <StepInput
              label="Mortgage payoff age"
              value={inputs.housePayoffAge}
              onChange={(v) => updateInput("housePayoffAge", v)}
              helperText="The mortgage payment remains fixed in nominal dollars until the payoff age, then it is removed. Payoff can be at or after retirement."
              min={inputs.currentAge}
              max={100}
              step={1}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-snug">
          {inputs.housingPlan === "rent"
            ? "Rent grows by the rate above. Your remaining non-housing spending follows the general inflation setting."
            : "Only the entered mortgage payment is treated as fixed. Property taxes, insurance, HOA, maintenance, and utilities stay in total monthly expenses and follow the general inflation setting."}
        </p>

        <p className="text-xs text-muted-foreground leading-snug">
          Include housing in your total monthly expenses. Housing Details separates the
          housing portion so the calculator can model its growth and payoff correctly; it
          is not added a second time.
        </p>

        {warning && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {warning}
          </p>
        )}
      </div>
    </ToggleOption>
  );
}
