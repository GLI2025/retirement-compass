import type { ChartDataPoint } from '@/types/calculator';

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
