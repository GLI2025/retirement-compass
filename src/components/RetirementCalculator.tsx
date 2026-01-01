import { useState, useMemo, useRef } from 'react';
import { Calculator, Sparkles, Wallet, Activity } from 'lucide-react';
import { 
  CalculatorInputs, 
  DEFAULT_INPUTS,
} from '@/types/calculator';
import { calculateRetirement, generateGuidance } from '@/utils/calculations';
import { StepInput } from './calculator/StepInput';
import { StrategySelect } from './calculator/StrategySelect';
import { ToggleOption } from './calculator/ToggleOption';
import { PortfolioChart } from './calculator/PortfolioChart';
import { IncomeCheckpoints } from './calculator/IncomeCheckpoints';
import { GuidancePanel } from './calculator/GuidancePanel';
import { EducationalBox } from './calculator/EducationalBox';
import { ResultsSummary } from './calculator/ResultsSummary';
import { ResetButtons } from './calculator/ResetButtons';
import { OtherIncomeSection } from './calculator/OtherIncomeSection';
import { ExportPDFButton } from './calculator/ExportPDFButton';

export function RetirementCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const chartRef = useRef<HTMLDivElement>(null);

  const updateInput = <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const results = useMemo(() => calculateRetirement(inputs), [inputs]);
  const guidance = useMemo(() => generateGuidance(inputs, results), [inputs, results]);

  const handleResetSavings = () => {
    updateInput('currentSavings', DEFAULT_INPUTS.currentSavings);
    updateInput('monthlyContribution', DEFAULT_INPUTS.monthlyContribution);
    updateInput('employerContribution', DEFAULT_INPUTS.employerContribution);
  };

  const handleResetWhatIf = () => {
    updateInput('whatIfEnabled', false);
    updateInput('ssClaimAge', DEFAULT_INPUTS.ssClaimAge);
    updateInput('ssMonthlyBenefit', DEFAULT_INPUTS.ssMonthlyBenefit);
    updateInput('housePayoffEnabled', false);
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
            <span className="text-sm font-medium">Smart Retirement Planning</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Retirement Savings</span>
            <br />
            <span className="text-foreground">Calculator</span>
          </h1>
          
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Plan your financial future with confidence. Adjust your inputs and see 
            real-time projections of your retirement portfolio.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 space-y-8">
        {/* Educational Box */}
        <EducationalBox />

        {/* Your Information */}
        <section id="currentAge" className="glass-card p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Your Information</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StepInput
              label="Current Age"
              value={inputs.currentAge}
              onChange={(v) => updateInput('currentAge', v)}
              min={18}
              max={80}
              step={1}
              tooltip="Your current age in years"
            />
            
            <StepInput
              label="Retirement Age"
              value={inputs.retirementAge}
              onChange={(v) => updateInput('retirementAge', v)}
              min={inputs.currentAge + 1}
              max={80}
              step={1}
              tooltip="When you plan to retire"
            />
            
            <StepInput
              label="Monthly Expenses"
              value={inputs.monthlyExpenses}
              onChange={(v) => updateInput('monthlyExpenses', v)}
              min={0}
              max={50000}
              step={100}
              prefix="$"
              tooltip="Your expected monthly spending in retirement"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StepInput
              label="Current Savings"
              value={inputs.currentSavings}
              onChange={(v) => updateInput('currentSavings', v)}
              min={0}
              step={1000}
              prefix="$"
              tooltip="Total retirement savings today"
            />
            
            <StepInput
              label="Monthly Contribution"
              value={inputs.monthlyContribution}
              onChange={(v) => updateInput('monthlyContribution', v)}
              min={0}
              step={50}
              prefix="$"
              tooltip="Your monthly retirement savings"
            />
            
            <StepInput
              label="Employer Match"
              value={inputs.employerContribution}
              onChange={(v) => updateInput('employerContribution', v)}
              min={0}
              step={50}
              prefix="$"
              tooltip="Monthly employer contribution"
            />
          </div>
        </section>

        {/* Other Income Sources */}
        <section id="otherIncome" className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Other Income Sources</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Add any additional income you expect during retirement — pensions, rental properties, 
            part-time work, annuities, etc.
          </p>
          <OtherIncomeSection
            incomes={inputs.otherIncome}
            onChange={(incomes) => updateInput('otherIncome', incomes)}
            currentAge={inputs.currentAge}
          />
        </section>

        {/* Advanced Options */}
        <section id="inflation" className="space-y-4">
          <h2 className="text-lg font-semibold">Advanced Options</h2>
          
          <ToggleOption
            label="Account for Inflation"
            description="Adjust projections for rising costs over time"
            enabled={inputs.inflationEnabled}
            onToggle={(v) => updateInput('inflationEnabled', v)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <StepInput
                label="Inflation Rate"
                value={inputs.inflationRate}
                onChange={(v) => updateInput('inflationRate', v)}
                min={0}
                max={10}
                step={0.1}
                suffix="%"
              />
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.applyInflationToSS}
                    onChange={(e) => updateInput('applyInflationToSS', e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm">Apply COLA to Social Security</span>
                </label>
              </div>
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
            label="Different Retirement Strategy"
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

        {/* What-If Scenarios */}
        <section id="whatif">
          <ToggleOption
            label="What-If Scenarios"
            description="Model Social Security, mortgage payoff, and more"
            enabled={inputs.whatIfEnabled}
            onToggle={(v) => updateInput('whatIfEnabled', v)}
          >
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <StepInput
                  label="Social Security Claim Age"
                  value={inputs.ssClaimAge}
                  onChange={(v) => updateInput('ssClaimAge', v)}
                  min={62}
                  max={70}
                  step={1}
                  tooltip="Age when you'll start receiving SS benefits"
                />
                <StepInput
                  label="Expected SS Monthly Benefit"
                  value={inputs.ssMonthlyBenefit}
                  onChange={(v) => updateInput('ssMonthlyBenefit', v)}
                  min={0}
                  step={100}
                  prefix="$"
                  tooltip="Your estimated monthly SS benefit at claim age"
                />
              </div>
              
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
                    min={inputs.currentAge}
                    max={90}
                    step={1}
                  />
                  <StepInput
                    label="Current Mortgage Payment"
                    value={inputs.currentMortgagePayment}
                    onChange={(v) => updateInput('currentMortgagePayment', v)}
                    min={0}
                    step={100}
                    prefix="$"
                  />
                </div>
              </ToggleOption>
            </div>
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
            ssClaimAge={inputs.whatIfEnabled ? inputs.ssClaimAge : undefined}
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
                Running 1,000 simulations with randomized market returns based on your investment strategy's 
                stock/bond allocation. The chart shows the range of possible outcomes at each age.
              </p>
            </div>
          )}
        </section>

        {/* Results Summary with Export Button */}
        <div className="space-y-4">
          <ResultsSummary results={results} />
          <div className="flex justify-center">
            <ExportPDFButton results={results} inputs={inputs} chartRef={chartRef} />
          </div>
        </div>

        {/* Income Checkpoints */}
        <IncomeCheckpoints checkpoints={results.checkpoints} />

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
