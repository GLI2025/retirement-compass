import { describe, expect, it } from 'vitest';

import type { IncomeCheckpoint } from '@/types/calculator';
import {
  getGuardrailDecision,
  getGuardrailRatePresentation,
  getGuardrailScale,
} from '@/utils/checkpointPresentation';

function checkpoint(overrides: Partial<IncomeCheckpoint> = {}): IncomeCheckpoint {
  return {
    age: 70,
    label: 'Age 70',
    monthlyNeed: 5_000,
    ssIncome: 1_000,
    otherIncome: 500,
    plannedFromPortfolio: 3_500,
    fromPortfolio: 3_500,
    spendingGap: 0,
    portfolioBalance: 1_000_000,
    withdrawalRate: 0.042,
    stressLevel: 'good',
    guardrailAction: 'none',
    ...overrides,
  };
}

describe('checkpoint strategy presentation', () => {
  it('presents a within-range Guardrails checkpoint without an adjustment', () => {
    const decision = getGuardrailDecision(checkpoint());

    expect(decision.label).toBe('Within Guardrails');
    expect(decision.adjustmentAmount).toBe(0);
    expect(decision.resultingTotalSpending).toBe(5_000);
  });

  it('presents an intentional Guardrails cut as a planned adjustment', () => {
    const decision = getGuardrailDecision(checkpoint({
      fromPortfolio: 3_150,
      guardrailAction: 'cut',
      spendingGap: 350,
      spendingGapKind: 'guardrail-adjustment',
      stressLevel: 'warn',
    }));

    expect(decision.label).toBe('Reduce 10%');
    expect(decision.adjustmentAmount).toBe(350);
    expect(decision.resultingTotalSpending).toBe(4_650);
    expect(decision.description).not.toContain('gap');
  });

  it('presents a Guardrails raise and resulting total spending', () => {
    const decision = getGuardrailDecision(checkpoint({
      fromPortfolio: 3_850,
      guardrailAction: 'raise',
    }));

    expect(decision.label).toBe('Increase 10%');
    expect(decision.adjustmentAmount).toBe(350);
    expect(decision.resultingTotalSpending).toBe(5_350);
  });

  it('does not misstate excess guaranteed income as additional spending', () => {
    const decision = getGuardrailDecision(checkpoint({
      monthlyNeed: 3_000,
      ssIncome: 2_500,
      otherIncome: 1_500,
      plannedFromPortfolio: 0,
      fromPortfolio: 0,
    }));

    expect(decision.resultingTotalSpending).toBe(3_000);
  });

  it('does not present a Guardrails adjustment after depletion as healthy', () => {
    const decision = getGuardrailDecision(checkpoint({
      portfolioBalance: 0,
      fromPortfolio: 0,
      guardrailAction: 'cut',
      stressLevel: 'bad',
    }));

    expect(decision.label).toBe('Portfolio Depleted');
    expect(decision.tone).toBe('bad');
    expect(decision.description).toContain('cannot fund');
  });

  it('keeps finite indicator positions within the visual scale', () => {
    const scale = getGuardrailScale(0.054, 0.032, 0.048);

    expect(scale.lower).toBeGreaterThanOrEqual(0);
    expect(scale.lower).toBeLessThan(scale.upper);
    expect(scale.upper).toBeLessThan(scale.current);
    expect(scale.current).toBeLessThanOrEqual(100);
    expect(getGuardrailScale(Infinity, -1, Number.NaN)).toEqual({
      current: 0,
      lower: 0,
      upper: 0,
    });
  });

  it('describes rates above the reduction trigger in percentage points', () => {
    expect(getGuardrailRatePresentation(0.206, 0.092, 0.138)).toEqual({
      zone: 'reduce',
      label: 'Above Reduction Trigger',
      comparisonLabel: '6.8 percentage points above the trigger',
    });
  });

  it('distinguishes increase, hold, and reduction zones at their exact boundaries', () => {
    expect(getGuardrailRatePresentation(0.091, 0.092, 0.138).zone).toBe('increase');
    expect(getGuardrailRatePresentation(0.092, 0.092, 0.138).zone).toBe('hold');
    expect(getGuardrailRatePresentation(0.138, 0.092, 0.138).zone).toBe('hold');
    expect(getGuardrailRatePresentation(0.139, 0.092, 0.138).zone).toBe('reduce');
  });

  it('does not describe a depleted portfolio as being below the increase trigger', () => {
    expect(getGuardrailRatePresentation(Infinity, 0.092, 0.138)).toEqual({
      zone: 'unavailable',
      label: 'Current Rate Unavailable',
      comparisonLabel: 'The portfolio has no balance available for a withdrawal-rate comparison',
    });
  });
});
