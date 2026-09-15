import { describe, expect, it } from 'vitest';

import { DEFAULT_INPUTS } from '@/lib/defaults';
import type { IncomeCheckpoint } from '@/types/calculator';
import {
  getGuardrailDecision,
  getGuardrailScale,
  getStrategyCheckpointExplanation,
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
  it('explains Fixed Spending without promising automatic adjustments', () => {
    const explanation = getStrategyCheckpointExplanation({
      ...DEFAULT_INPUTS,
      spendingRule: 'fixed',
    });

    expect(explanation.title).toBe('How Fixed Spending works');
    expect(explanation.description).toContain('does not automatically adjust spending');
  });

  it('explains Guardrails as rule-based portfolio withdrawal adjustments', () => {
    const explanation = getStrategyCheckpointExplanation({
      ...DEFAULT_INPUTS,
      spendingRule: 'guardrails',
    });

    expect(explanation.title).toBe('How Guardrails responds');
    expect(explanation.description).toContain('planned cut');
    expect(explanation.description).toContain('portfolio withdrawal');
  });

  it('explains the normalized Die With Zero target and today-dollar buffer', () => {
    const explanation = getStrategyCheckpointExplanation({
      ...DEFAULT_INPUTS,
      retirementAge: 67,
      spendingRule: 'die_with_zero',
      dieWithZero: { targetAge: 95, bufferAmount: 50_000 },
    });

    expect(explanation.title).toBe('How Die With Zero is evaluated');
    expect(explanation.description).toContain('age 95');
    expect(explanation.description).toContain('$50,000 ending buffer in today’s dollars');
    expect(explanation.description).toContain('does not change your spending');
  });

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

    expect(decision.label).toBe('Planned Spending Cut');
    expect(decision.adjustmentAmount).toBe(350);
    expect(decision.resultingTotalSpending).toBe(4_650);
    expect(decision.description).not.toContain('gap');
  });

  it('presents a Guardrails raise and resulting total spending', () => {
    const decision = getGuardrailDecision(checkpoint({
      fromPortfolio: 3_850,
      guardrailAction: 'raise',
    }));

    expect(decision.label).toBe('Planned Spending Increase');
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
});
