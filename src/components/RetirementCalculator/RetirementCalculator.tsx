import { useState, useMemo, useRef } from 'react';
import { Sparkles, Activity } from 'lucide-react';
import { CalculatorInputs } from '@/types/calculator';

import { DEFAULT_INPUTS } from '@/lib/defaults';
import { calculateRetirement, generateGuidance } from '@/utils/calculations';
import { OtherIncomeSourcesSection } from "./sections/OtherIncomeSourcesSection";

import { YourInformationSection } from "./sections/YourInformationSection";

import { InflationOptionSection } from "./sections/InflationOptionSection";
import { SpendingRuleSection } from "./sections/SpendingRuleSection";

import { StepInput } from "../calculator/StepInput";
import { StrategySelect } from "../calculator/StrategySelect";
import { ToggleOption } from "../calculator/ToggleOption";
import { PortfolioChart } from "../calculator/PortfolioChart";
import { IncomeCheckpoints } from "../calculator/IncomeCheckpoints";
import { GuidancePanel } from "../calculator/GuidancePanel";
import { EducationalBox } from "../calculator/EducationalBox";
import { ResultsSummary } from "../calculator/ResultsSummary";
import { ResetButtons } from "../calculator/ResetButtons";

import { ExportPDFButton } from "../calculator/ExportPDFButton";


export function RetirementCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const chartRef = useRef<HTMLDivElement>(null);

  const updateInput = <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const results = useMemo(() => calculateRetirement(inputs), [inputs]);
  const guidance = useMemo(
    () => generateGuidance(inputs, results),
    [inputs, results]
  );

  const handleResetSavings = () => {
    updateInput('currentSavings', DEFAULT_INPUTS.currentSavings);
    updateInput('monthlyContribution', DEFAULT_INPUTS.monthlyContribution);
    updateInput('employerContribution', DEFAULT_INPUTS.employerContribution);
  };

  const handleResetWhatIf = () => {
    updateInput('ssEnabled', false);
    updateInput('ssClaimAge', DEFAULT_INPUTS.ssClaimAge);
    updateInput('ssMonthlyBenefit', DEFAULT_INPUTS.ssMonthlyBenefit);
    updateInput('applyInflationToSS', DEFAULT_INPUTS.applyInflationToSS);

    updateInput('housePayoffEnabled', false);
    updateInput('housePayoffAge', DEFAULT_INPUTS.housePayoffAge);
    updateInput('currentMortgagePayment', DEFAULT_INPUTS.currentMortgagePayment);

    updateInput('annualIncreaseEnabled', false);
    updateInput('annualIncreaseRate', DEFAULT_INPUTS.annualIncreaseRate);

    updateInput('retirementStrategyEnabled', false);
    updateInput('retirementStrategy', DEFAULT_INPUTS.retirementStrategy);

    updateInput('otherIncome', []);
  };

  const handleResetAll = () => {
    setInputs(DEFAULT_INPUTS);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">A Starting Place for Retirement Planning</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Retirement Savings</span>
            <br />
            <span className="text-foreground">Calculator</span>
          </h1>

          <p className="text-muted-foreground max-w-2xl mx-auto">
            Estimate you financial future potential. Adjust your inputs and see
            real-time projections of your retirement portfolio. Connect with a Financial professional for advanced views like taxes, extra outcomes, and as a second opinion to risks to any assumptions.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 space-y-8">
        {/* Educational Box */}
        <EducationalBox />

        {/* Your Information */}
      <YourInformationSection inputs={inputs} updateInput={updateInput} />


        {/* Other Income Sources */}
        <OtherIncomeSourcesSection inputs={inputs} updateInput={updateInput} />


       {/* Advanced Options */}
        <section id="inflation" className="space-y-4">
          <h2 className="text-lg font-semibold">Advanced Options</h2>
        
          <InflationOptionSection inputs={inputs} updateInput={updateInput} />
          <SpendingRuleSection inputs={inputs} updateInput={updateInput} />
        </section>


        {/* What-If Scenarios */}
        <section id="whatif" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">What-If Scenarios</h2>
            <p className="text-sm text-muted-foreground mt-1">
              What-If scenarios let you test assumptions without changing your baseline plan.
            </p>
          </div>

          <ToggleOption
            label="Include Social Security"
            description="Add expected Social Security income to your retirement plan"
            enabled={inputs.ssEnabled}
            onToggle={(v) => updateInput('ssEnabled', v)}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <StepInput
                  label="Social Security Claim Age"
                  value={inputs.ssClaimAge}
                  onChange={(v) => updateInput('ssClaimAge', v)}
                  helperText="This is a timing lever. Delaying can reduce how much you withdraw from savings."
                  min={62}
                  max={70}
                  step={1}
                  tooltip="Age when you'll start receiving SS benefits"
                />
                <StepInput
                  label="Expected SS Monthly Benefit"
                  value={inputs.ssMonthlyBenefit}
                  onChange={(v) => updateInput('ssMonthlyBenefit', v)}
                  helperText="Use the amount shown on SSA (today’s dollars). Don’t inflate it yourself."
                  min={0}
                  step={100}
                  prefix="$"
                  tooltip="Your estimated monthly SS benefit at claim age"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.applyInflationToSS}
                  onChange={(e) => updateInput('applyInflationToSS', e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Apply COLA to Social Security</span>
              </label>

              <p className="text-xs text-muted-foreground leading-snug">
                If inflation is enabled, COLA grows Social Security over time. (You should
                enter SS in today’s dollars.)
              </p>
            </div>
          </ToggleOption>

          <ToggleOption
            label="Mortgage Payoff"
            description="Account for reduced expenses after paying off your home"
            enabled={inputs.housePayoffEnabled}
            onToggle={(v) => updateInput('housePayoffEnabled', v)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <StepInput
                label="Payoff Age"
                value={inputs.housePayoffAge}
                onChange={(v) => updateInput('housePayoffAge', v)}
                helperText="At and after this age, we subtract your mortgage from expenses (in the same inflated dollars as expenses)."
                min={inputs.currentAge}
                max={90}
                step={1}
              />
              <StepInput
                label="Current Mortgage Payment"
                value={inputs.currentMortgagePayment}
                onChange={(v) => updateInput('currentMortgagePayment', v)}
                helperText="Enter today’s monthly payment (don’t inflate it)."
                min={0}
                step={100}
                prefix="$"
              />
            </div>
          </ToggleOption>

          <ToggleOption
            label="Annual Contribution Increases"
            description="Increase your contributions each year as your income grows"
            enabled={inputs.annualIncreaseEnabled}
            onToggle={(v) => updateInput('annualIncreaseEnabled', v)}
          >
            <StepInput
              label="Annual Increase"
              value={inputs.annualIncreaseRate}
              onChange={(v) => updateInput('annualIncreaseRate', v)}
              min={0}
              max={10}
              step={0.5}
              suffix="%"
            />
          </ToggleOption>

          <ToggleOption
            label="Different Investment Strategy in Retirement"
            description="Use a more conservative approach after retirement"
            enabled={inputs.retirementStrategyEnabled}
            onToggle={(v) => updateInput('retirementStrategyEnabled', v)}
          >
            <StrategySelect
              label="Retirement Investment Strategy"
              value={inputs.retirementStrategy}
              onChange={(v) => updateInput('retirementStrategy', v)}
            />
          </ToggleOption>
        </section>

        {/* Investment Strategy */}
        <section id="strategy" className="glass-card p-4 sm:p-6">
          <StrategySelect
            value={inputs.investmentStrategy}
            onChange={(v) => updateInput('investmentStrategy', v)}
          />
        </section>

        {/* Portfolio Chart */}
        <div ref={chartRef}>
          <PortfolioChart
            data={results.chartData}
            retirementAge={inputs.retirementAge}
            ssClaimAge={inputs.ssEnabled ? inputs.ssClaimAge : undefined}
            monteCarloEnabled={inputs.monteCarloEnabled}
            successProbability={results.successProbability}
          />
        </div>

        {/* Monte Carlo Toggle */}
        <section className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold">Monte Carlo Simulation</h3>
                <p className="text-sm text-muted-foreground">
                  Model market volatility with probability bands
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inputs.monteCarloEnabled}
                onChange={(e) => updateInput('monteCarloEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          {inputs.monteCarloEnabled && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                Running 1,000 simulations with randomized market returns based on your
                investment strategy&apos;s stock/bond allocation. The chart shows the
                range of possible outcomes at each age.
              </p>
            </div>
          )}
        </section>

        {/* Results Summary with Export Button */}
        <div className="space-y-4">
         <ResultsSummary results={results} inputs={inputs} />
          <div className="flex justify-center">
            <ExportPDFButton results={results} inputs={inputs} chartRef={chartRef} />
          </div>
        </div>

        {/* Income Checkpoints */}
        <IncomeCheckpoints checkpoints={results.checkpoints} inputs={inputs} />

        {/* Guidance Panel */}
        <GuidancePanel items={guidance} isOnTrack={results.isOnTrack} />

        {/* Reset Buttons */}
        <div className="flex justify-center">
          <ResetButtons
            onResetSavings={handleResetSavings}
            onResetWhatIf={handleResetWhatIf}
            onResetAll={handleResetAll}
          />
        </div>

        {/* Footer/Disclosure */}
        <footer className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <p className="mb-2">
            <strong>Educational purposes only.</strong> This calculator provides estimates
            based on the assumptions you enter. Actual investment returns, inflation,
            and other factors may vary significantly.
          </p>
          <p>
            Consult a qualified financial advisor before making investment decisions.
            Past performance does not guarantee future results.
          </p>
        </footer>
      </main>
    </div>
  );
}
