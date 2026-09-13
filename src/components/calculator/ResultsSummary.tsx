import type { CalculatorInputs, CalculatorResults } from '@/types/calculator';
import { useState } from 'react';
import { calculateSSIncome, calculateOtherIncome } from '@/utils/calculations';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { yearsFromNow, toTodayDollars } from '@/utils/money';

interface ResultsSummaryProps {
  results: CalculatorResults;
  inputs: CalculatorInputs;
}

const CONFIDENCE_TARGET = 0.7;
const MC_RUNS = 1000;

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

export function ResultsSummary({ results, inputs }: ResultsSummaryProps) {
  const [combineIncome, setCombineIncome] = useState(false);
  const {
    requiredSavings,
    projectedAtRetirement,
    gap,
    successProbability,
    checkpoints,
    sustainableMonthlySpending
  } = results;

  const isSurplus = gap >= 0;
  const hasMC = typeof successProbability === 'number';
  const heldUpCount = hasMC ? Math.round((successProbability ?? 0) * MC_RUNS) : 0;
  const successPercent = hasMC ? Math.round((successProbability ?? 0) * 100) : 0;
  const belowTarget = hasMC ? (successProbability ?? 0) < CONFIDENCE_TARGET : false;
  const shortfallPercent = requiredSavings > 0 ? Math.abs(gap) / requiredSavings : 0;
  const deterministicOutlook = results.targetStatus
    ? (results.targetStatus === 'met' ? 'on-track' : results.targetStatus === 'buffer-short' ? 'close' : 'short')
    : isSurplus ? 'on-track' : shortfallPercent <= 0.1 ? 'close' : 'short';
  const outlook = hasMC
    ? (belowTarget ? (successPercent >= 50 ? 'close' : 'short') : 'on-track')
    : deterministicOutlook;

  const outlookContent = hasMC ? {
    eyebrow: belowTarget ? 'Monte Carlo below target' : 'Monte Carlo target met',
    headline: `${successPercent} out of 100 simulated paths met the complete plan target.`,
    detail: inputs.spendingRule === 'die_with_zero'
      ? `A path succeeds only if it stays funded through age ${results.planEndAge} and finishes with at least your ${formatCurrency(inputs.dieWithZero?.bufferAmount ?? 0)} ending buffer in today's dollars.`
      : `A path succeeds only if it stays funded through age ${results.planEndAge}.`,
  } : results.targetStatus ? {
    met: { eyebrow: 'Target met', headline: 'Your spending and ending buffer fit this projection.', detail: 'Based on the selected investment returns and income timing.' },
    'buffer-short': { eyebrow: 'Buffer short', headline: 'Spending funded, buffer short.', detail: 'The portfolio lasts through the target age but finishes below your selected buffer.' },
    depleted: { eyebrow: 'Short', headline: 'Portfolio depleted early.', detail: 'Your entered spending exhausts the portfolio before the plan is complete.' },
  }[results.targetStatus] : {
    'on-track': {
      eyebrow: 'On track',
      headline: `You have an estimated ${formatCurrency(gap)} cushion at retirement.`,
      detail: 'Your projected savings meet or exceed the amount this plan estimates you will need.',
    },
    close: {
      eyebrow: 'Close',
      headline: `You are within ${Math.round(shortfallPercent * 100)}% of your retirement target.`,
      detail: `The estimated shortfall is ${formatCurrency(Math.abs(gap))}. A modest change may be enough to close it.`,
    },
    short: {
      eyebrow: 'Short',
      headline: `Your plan has an estimated ${formatCurrency(Math.abs(gap))} shortfall at retirement.`,
      detail: 'Focus first on the savings path and retirement income need shown below.',
    },
  }[outlook];

  // Use the retirement checkpoint for the paycheck breakdown
  const retireCp = checkpoints?.find(c => c.age === inputs.retirementAge);

  // Pull NOMINAL values from the checkpoint (these may include inflation when inflationEnabled is true)
  const spendingNominal = retireCp?.monthlyNeed ?? 0;
  const guaranteedNominal = (retireCp?.ssIncome ?? 0) + (retireCp?.otherIncome ?? 0);
  const fromPortfolioNominal = retireCp?.fromPortfolio ?? 0;

  // Convert NOMINAL -> TODAY'S BUYING POWER (real dollars) for the card
  // NOTE: toTodayDollars expects inflation rate in PERCENT (e.g. 3), not decimal (0.03)
  const y = yearsFromNow(inputs.currentAge, retireCp?.age ?? inputs.retirementAge);

  const spendingToday = inputs.inflationEnabled
    ? toTodayDollars(spendingNominal, y, inputs.inflationRate)
    : spendingNominal;

  const guaranteedToday = inputs.inflationEnabled
    ? toTodayDollars(guaranteedNominal, y, inputs.inflationRate)
    : guaranteedNominal;

  const fromPortfolioToday = inputs.inflationEnabled
    ? toTodayDollars(fromPortfolioNominal, y, inputs.inflationRate)
    : fromPortfolioNominal;

  const bufferToday = Math.max(0, inputs.dieWithZero?.bufferAmount ?? 0);
  const incomeInTodayDollars = (amount: number, age: number) => inputs.inflationEnabled
    ? toTodayDollars(amount, yearsFromNow(inputs.currentAge, age), inputs.inflationRate)
    : amount;
  const ssDisplayAge = Math.max(inputs.retirementAge, inputs.ssClaimAge);
  const incomeChangeAges = Array.from(new Set([
    ...(inputs.ssEnabled ? [inputs.ssClaimAge] : []),
    ...inputs.otherIncome.flatMap(income => [income.startAge, ...(income.endAge ? [income.endAge + 1] : [])]),
  ])).filter(age => age > inputs.retirementAge).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <section
        className={cn(
          'glass-card border-2 p-4 sm:p-6',
          outlook === 'on-track' && 'border-success/30 bg-success/5',
          outlook === 'close' && 'border-warning/30 bg-warning/5',
          outlook === 'short' && 'border-destructive/30 bg-destructive/5'
        )}
        aria-labelledby="retirement-outlook-heading"
      >
        <div className="flex flex-col gap-5">
          <div>
            <p
              className={cn(
                'text-sm font-semibold uppercase tracking-wide',
                outlook === 'on-track' && 'text-success',
                outlook === 'close' && 'text-warning',
                outlook === 'short' && 'text-destructive'
              )}
            >
              Retirement outlook: {outlookContent.eyebrow}
            </p>
            <h2 id="retirement-outlook-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
              {outlookContent.headline}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {outlookContent.detail}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">The two biggest drivers</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-medium">1. Your savings path</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You are projected to have <strong className="text-foreground">{formatCurrency(projectedAtRetirement)}</strong> at age {inputs.retirementAge}, compared with <strong className="text-foreground">{formatCurrency(requiredSavings)}</strong> needed.
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-medium">2. Your retirement income need</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your plan needs <strong className="text-foreground">{formatCurrency(spendingToday)}/mo</strong> in today&apos;s buying power. Guaranteed income covers <strong className="text-foreground">{formatCurrency(guaranteedToday)}/mo</strong>, leaving <strong className="text-foreground">{formatCurrency(fromPortfolioToday)}/mo</strong> for investments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top row: existing 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Required */}
        <div className="glass-card p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Required Savings
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold">
            {formatCurrency(requiredSavings)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            at retirement to maintain lifestyle
          </p>
        </div>

        {/* Projected */}
        <div className="glass-card p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Projected Savings</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold gradient-text">
            {formatCurrency(projectedAtRetirement)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            at your target retirement age
          </p>
        </div>

        {/* Surplus / Gap */}
        <div
          className={cn(
            'glass-card p-4 sm:p-6 text-center border-2',
            isSurplus ? 'border-success/30' : 'border-warning/30'
          )}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {isSurplus ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-warning" />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {isSurplus ? 'Surplus' : 'Gap'}
            </span>
          </div>

          <div
            className={cn(
              'text-2xl sm:text-3xl font-bold',
              isSurplus ? 'text-success' : 'text-warning'
            )}
          >
            {isSurplus ? '+' : '-'}
            {formatCurrency(Math.abs(gap))}
          </div>

          {hasMC ? (
            <p className="text-xs text-muted-foreground mt-2">
              Complete plan success in <strong>{heldUpCount} / {MC_RUNS}</strong> market scenarios
              {belowTarget && <> (below {Math.round(CONFIDENCE_TARGET * 100)}% target)</>}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              {isSurplus ? "You're ahead of your goal!" : 'Additional savings needed'}
            </p>
          )}
        </div>
      </div>

      {/* Second row: Monthly retirement income (today’s buying power) */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">
              Your spending plan at retirement (today’s dollars)
            </h3>
            <p className="text-xs text-muted-foreground">
              Spending and portfolio withdrawals are shown at age {retireCp?.age ?? inputs.retirementAge}.
              Income amounts show their timing below. All amounts are in today’s buying power.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Planned monthly spending</div>
            <div className="text-xl font-bold">{formatCurrency(spendingToday)}/mo</div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <input type="checkbox" checked={combineIncome}
                onChange={event => setCombineIncome(event.target.checked)} />
              Combine income
            </label>
            {combineIncome ? (
              <div className="text-sm">
                <div>Social Security + other income</div>
                <strong>{formatCurrency(guaranteedToday)}/mo at age {inputs.retirementAge}</strong>
                {incomeChangeAges.map(age => (
                  <span key={age} className="block mt-1 text-xs text-muted-foreground">
                    Age {age}: {formatCurrency(incomeInTodayDollars(
                      calculateSSIncome(inputs, age) + calculateOtherIncome(inputs, age), age
                    ))}/mo combined
                  </span>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Social Security</div>
                  {inputs.ssEnabled ? (
                    <>
                      <strong>{formatCurrency(incomeInTodayDollars(calculateSSIncome(inputs, ssDisplayAge), ssDisplayAge))}/mo</strong>
                      <p className="text-xs text-muted-foreground">
                        {inputs.ssClaimAge > inputs.retirementAge
                          ? `Starts at age ${inputs.ssClaimAge} · not included at retirement`
                          : `Included at retirement · starts at age ${inputs.ssClaimAge}`}
                      </p>
                    </>
                  ) : <span className="text-xs text-muted-foreground">Not included in this plan</span>}
                </div>
                <div>
                  <div className="text-muted-foreground">Other income</div>
                  {inputs.otherIncome.length === 0
                    ? <span className="text-xs text-muted-foreground">None entered</span>
                    : inputs.otherIncome.map(income => {
                      const age = Math.max(inputs.currentAge, income.startAge);
                      const amount = incomeInTodayDollars(calculateOtherIncome(
                        { ...inputs, otherIncome: [income] }, age
                      ), age);
                      return (
                        <p key={income.id} className="mt-1 text-xs">
                          {income.label || 'Other income'}: <strong>{formatCurrency(amount)}/mo</strong>
                          <span className="block text-muted-foreground">
                            From age {income.startAge}{income.endAge ? ` through ${income.endAge}` : ' onward'}
                            {income.startAge > inputs.retirementAge ? ' · starts after retirement' : ''}
                          </span>
                        </p>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              {inputs.spendingRule === 'die_with_zero'
                ? 'Requested from investments'
                : 'Needed from investments'}
            </div>
            <div className="text-xl font-bold">{formatCurrency(fromPortfolioToday)}/mo</div>
          </div>
        </div>

        {inputs.spendingRule === 'die_with_zero' &&
          sustainableMonthlySpending !== undefined && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Try planned spending of{' '}
                <strong>${sustainableMonthlySpending.toLocaleString()}/mo</strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This estimate aims to reach age {inputs.dieWithZero?.targetAge ?? 95}{' '}
                {bufferToday > 0
                  ? `with a ${formatCurrency(bufferToday)} buffer in today's dollars.`
                  : 'and finish near $0.'}{' '}
                The graph still uses your entered {formatCurrency(inputs.monthlyExpenses)}/mo.
                {' '}Change your monthly spending input to test this estimate. Based on assumed
                returns, not a guarantee.
              </p>
            </div>
          )}

        {!retireCp && (
          <p className="text-xs text-muted-foreground mt-3">
            (Note: Retirement checkpoint not found yet. Ensure checkpoints include retirement age.)
          </p>
        )}
      </div>
    </div>
  );
}
