/**
 * Plain-English guide
 *
 * Purpose: Converts completed main-calculator results into consistent funded,
 * gap, depletion, and checkpoint status labels for the screen and PDF.
 *
 * Inputs/outputs: It receives already-calculated balances and deterministic
 * plan outcomes, then returns labels, signs, amounts, depletion ages, and
 * green/amber/red checkpoint states. It does not project returns or cash flow.
 * Dollar values retain the basis supplied by calculations.ts.
 *
 * Important behavior: Checkpoint health follows the complete deterministic
 * plan, including permanent early-depletion failure and the Die With Zero
 * buffer. ResultsSummary, PortfolioChart, pdfGenerator, and calculations.ts
 * depend on these decisions.
 *
 * Financial impact: Medium to high. The math is upstream, but incorrect status
 * logic could present a failed plan as funded or create conflicting messages.
 */
import type {
  ChartDataPoint,
  IncomeCheckpoint,
  SpendingRule,
} from '@/types/calculator';

export interface FundingPresentationInput {
  isOnTrack: boolean;
  gap: number;
}

export function getFundingPresentation(result: FundingPresentationInput) {
  return {
    isFunded: result.isOnTrack,
    label: result.isOnTrack ? 'Surplus' as const : 'Gap' as const,
    amount: Math.abs(result.gap),
    sign: result.isOnTrack ? '+' as const : '-' as const,
  };
}

export function findDisplayedDepletionAge(
  data: ChartDataPoint[],
  retirementAge: number,
  planEndAge: number,
): number | undefined {
  const depletionAge = data.find(
    point => point.age >= retirementAge && point.balance < 1,
  )?.age;

  return depletionAge !== undefined && depletionAge < planEndAge
    ? depletionAge
    : undefined;
}

export type CheckpointStressLevel = IncomeCheckpoint['stressLevel'];

// The deterministic plan-level facts a checkpoint color is allowed to depend on.
// These come from the strict deterministic projection, never from scanning the
// yearly chart for a zero balance: a later deposit can lift the chart back above
// zero while the plan is already treated as failed.
export interface DeterministicPlanOutcome {
  spendingRule: SpendingRule;
  // Fractional age at which the strict projection first failed, undefined when
  // the path never depletes before plan end.
  depletionAge?: number;
  // Funded status used by Required Savings, the headline, and the chart.
  funded: boolean;
  // Die With Zero target assessment, including its ending buffer.
  targetStatus?: 'met' | 'buffer-short' | 'depleted';
}

export interface CheckpointStatusPoint {
  age: number;
  portfolioBalance: number;
  requestedPortfolioWithdrawal: number;
  isPlanEndAge: boolean;
  guardrailAction: 'raise' | 'cut' | 'none';
}

// Income Checkpoint colors report funded status, not a snapshot withdrawal rate:
// green while the deterministic plan stays funded through plan end, amber when it
// is projected to fail later, red at or after the failure itself.
export function resolveCheckpointStress(
  plan: DeterministicPlanOutcome,
  point: CheckpointStatusPoint,
): CheckpointStressLevel {
  const depletedByCheckpoint = plan.depletionAge !== undefined
    && point.age >= plan.depletionAge;
  // No withdrawal is taken at plan end, so the need shown on that card is
  // outside the funded horizon.
  const cannotFundWithdrawal = !point.isPlanEndAge
    && point.portfolioBalance < 1
    && point.requestedPortfolioWithdrawal > 0.5;

  if (depletedByCheckpoint || cannotFundWithdrawal) return 'bad';

  const planFailsLater = plan.depletionAge !== undefined || !plan.funded;

  if (plan.spendingRule === 'die_with_zero') {
    // A buffer shortfall without premature depletion stays amber, and depletion
    // that happens after this checkpoint does not backdate red onto it.
    const targetMet = plan.targetStatus ? plan.targetStatus === 'met' : plan.funded;
    return targetMet && !planFailsLater ? 'good' : 'warn';
  }

  // A complete path that fails later is never presented as healthy, so a normal
  // Guardrails action cannot hide it.
  if (planFailsLater) return 'warn';

  // Guardrails actions are intentional strategy decisions. Keep plan health
  // green here and present any increase or reduction separately in the UI.
  return 'good';
}
