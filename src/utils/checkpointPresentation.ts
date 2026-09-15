import { getNormalizedDieWithZeroTargetAge } from '@/lib/calculations/spendingRules';
import type { CalculatorInputs, IncomeCheckpoint } from '@/types/calculator';

export interface StrategyCheckpointExplanation {
  title: string;
  description: string;
}

export interface GuardrailDecisionPresentation {
  label: 'Within Guardrails' | 'Planned Spending Increase' | 'Planned Spending Cut' | 'Portfolio Depleted';
  tone: 'good' | 'warn' | 'bad';
  plannedPortfolioWithdrawal: number;
  actualPortfolioWithdrawal: number;
  adjustmentAmount: number;
  resultingTotalSpending: number;
  description: string;
}

export function getStrategyCheckpointExplanation(
  inputs: CalculatorInputs,
): StrategyCheckpointExplanation {
  if (inputs.spendingRule === 'guardrails') {
    return {
      title: 'How Guardrails responds',
      description:
        'Guardrails starts with your planned spending and adjusts the portfolio withdrawal when its withdrawal rate moves outside your selected range. A planned cut protects the portfolio; an increase allows more spending when the portfolio is ahead.',
    };
  }

  if (inputs.spendingRule === 'die_with_zero') {
    const targetAge = getNormalizedDieWithZeroTargetAge(inputs);
    const buffer = Math.max(0, inputs.dieWithZero?.bufferAmount ?? 0);

    return {
      title: 'How Die With Zero is evaluated',
      description:
        `This projection follows your entered spending through age ${targetAge} and checks whether the portfolio stays funded while preserving your $${Math.round(buffer).toLocaleString()} ending buffer in today’s dollars. It does not change your spending to force the balance toward zero.`,
    };
  }

  return {
    title: 'How Fixed Spending works',
    description:
      'Fixed Spending follows your entered retirement spending. Social Security and other income reduce the amount withdrawn from investments when they begin, but this strategy does not automatically adjust spending as the portfolio changes.',
  };
}

export function getGuardrailDecision(
  checkpoint: IncomeCheckpoint,
): GuardrailDecisionPresentation {
  const plannedPortfolioWithdrawal = Math.max(
    0,
    checkpoint.plannedFromPortfolio ?? checkpoint.fromPortfolio ?? 0,
  );
  const actualPortfolioWithdrawal = Math.max(0, checkpoint.fromPortfolio ?? 0);
  const adjustmentAmount = Math.abs(actualPortfolioWithdrawal - plannedPortfolioWithdrawal);
  const incomeUsedForSpending = Math.min(
    Math.max(0, checkpoint.monthlyNeed ?? 0),
    Math.max(0, (checkpoint.ssIncome ?? 0) + (checkpoint.otherIncome ?? 0)),
  );
  const resultingTotalSpending = incomeUsedForSpending + actualPortfolioWithdrawal;

  if (checkpoint.stressLevel === 'bad') {
    return {
      label: 'Portfolio Depleted',
      tone: 'bad',
      plannedPortfolioWithdrawal,
      actualPortfolioWithdrawal,
      adjustmentAmount,
      resultingTotalSpending,
      description: checkpoint.portfolioBalance > 0
        ? 'This path depleted earlier. A later deposit restored a balance, but it does not restore the plan’s funded status.'
        : 'The portfolio has depleted, so Guardrails cannot fund the planned portfolio withdrawal at this checkpoint.',
    };
  }

  if (checkpoint.guardrailAction === 'cut') {
    return {
      label: 'Planned Spending Cut',
      tone: 'warn',
      plannedPortfolioWithdrawal,
      actualPortfolioWithdrawal,
      adjustmentAmount,
      resultingTotalSpending,
      description: `Guardrails reduces the portfolio withdrawal by approximately $${Math.round(adjustmentAmount).toLocaleString()}/mo at this checkpoint to protect the plan.`,
    };
  }

  if (checkpoint.guardrailAction === 'raise') {
    return {
      label: 'Planned Spending Increase',
      tone: checkpoint.stressLevel === 'warn' ? 'warn' : 'good',
      plannedPortfolioWithdrawal,
      actualPortfolioWithdrawal,
      adjustmentAmount,
      resultingTotalSpending,
      description: `Guardrails permits approximately $${Math.round(adjustmentAmount).toLocaleString()}/mo more from the portfolio at this checkpoint.${checkpoint.stressLevel === 'warn' ? ' The complete deterministic plan still needs attention.' : ''}`,
    };
  }

  return {
    label: 'Within Guardrails',
    tone: checkpoint.stressLevel === 'warn' ? 'warn' : 'good',
    plannedPortfolioWithdrawal,
    actualPortfolioWithdrawal,
    adjustmentAmount,
    resultingTotalSpending,
    description: checkpoint.stressLevel === 'warn'
      ? 'The current withdrawal rate is inside the selected range, so no adjustment is made. The complete deterministic plan is still projected to fall short later.'
      : 'The current withdrawal rate is inside the selected range, so no adjustment is made.',
  };
}

export function getGuardrailScale(
  currentRate: number,
  lowerRate: number,
  upperRate: number,
) {
  const safeCurrent = Number.isFinite(currentRate) ? Math.max(0, currentRate) : 0;
  const safeLower = Number.isFinite(lowerRate) ? Math.max(0, lowerRate) : 0;
  const safeUpper = Number.isFinite(upperRate)
    ? Math.max(safeLower, upperRate)
    : safeLower;
  const maximum = Math.max(safeUpper * 1.25, safeCurrent * 1.05, 0.01);
  const toPercent = (rate: number) => Math.min(100, Math.max(0, (rate / maximum) * 100));

  return {
    current: toPercent(safeCurrent),
    lower: toPercent(safeLower),
    upper: toPercent(safeUpper),
  };
}
