import type { IncomeCheckpoint } from '@/types/calculator';

export interface GuardrailDecisionPresentation {
  label: string;
  tone: 'good' | 'warn' | 'bad';
  plannedPortfolioWithdrawal: number;
  actualPortfolioWithdrawal: number;
  adjustmentAmount: number;
  resultingTotalSpending: number;
  description: string;
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
    const adjustmentPercent = plannedPortfolioWithdrawal > 0
      ? Math.round((adjustmentAmount / plannedPortfolioWithdrawal) * 100)
      : 0;

    return {
      label: adjustmentPercent > 0 ? `Reduce ${adjustmentPercent}%` : 'Reduce Withdrawal',
      tone: 'warn',
      plannedPortfolioWithdrawal,
      actualPortfolioWithdrawal,
      adjustmentAmount,
      resultingTotalSpending,
      description: `Guardrails reduces the portfolio withdrawal by approximately $${Math.round(adjustmentAmount).toLocaleString()}/mo at this checkpoint to protect the plan.`,
    };
  }

  if (checkpoint.guardrailAction === 'raise') {
    const adjustmentPercent = plannedPortfolioWithdrawal > 0
      ? Math.round((adjustmentAmount / plannedPortfolioWithdrawal) * 100)
      : 0;

    return {
      label: adjustmentPercent > 0 ? `Increase ${adjustmentPercent}%` : 'Increase Withdrawal',
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

export function getGuardrailRatePresentation(
  currentRate: number,
  increaseTrigger: number,
  reductionTrigger: number,
) {
  if (!Number.isFinite(currentRate)) {
    return {
      zone: 'unavailable' as const,
      label: 'Current Rate Unavailable',
      comparisonLabel: 'The portfolio has no balance available for a withdrawal-rate comparison',
    };
  }

  const current = Number.isFinite(currentRate) ? Math.max(0, currentRate) : 0;
  const increase = Number.isFinite(increaseTrigger) ? Math.max(0, increaseTrigger) : 0;
  const reduction = Number.isFinite(reductionTrigger)
    ? Math.max(increase, reductionTrigger)
    : increase;

  if (current > reduction) {
    return {
      zone: 'reduce' as const,
      label: 'Above Reduction Trigger',
      comparisonLabel: `${((current - reduction) * 100).toFixed(1)} percentage points above the trigger`,
    };
  }

  if (current < increase) {
    return {
      zone: 'increase' as const,
      label: 'Below Increase Trigger',
      comparisonLabel: `${((increase - current) * 100).toFixed(1)} percentage points below the trigger`,
    };
  }

  return {
    zone: 'hold' as const,
    label: 'Within Guardrails',
    comparisonLabel: 'No trigger crossed',
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
