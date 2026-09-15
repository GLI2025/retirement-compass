import type { OtherIncome } from '@/types/calculator';

export interface IncomePreset {
  label: string;
  defaultAmount: number;
}

export type OtherIncomeDraft = Partial<OtherIncome>;

export function createOtherIncomeDraft(currentAge: number): OtherIncomeDraft {
  return {
    label: '',
    monthlyAmount: 1000,
    startAge: currentAge,
    hasCola: false,
  };
}

export function applyIncomePreset(
  draft: OtherIncomeDraft,
  preset: IncomePreset,
): OtherIncomeDraft {
  return {
    ...draft,
    label: preset.label,
    monthlyAmount: preset.defaultAmount,
  };
}

export function createOtherIncomeSource(
  draft: OtherIncomeDraft,
  currentAge: number,
  id: string,
): OtherIncome {
  return {
    id,
    label: draft.label?.trim() || 'Other Income',
    monthlyAmount: draft.monthlyAmount ?? 1000,
    startAge: draft.startAge ?? currentAge,
    endAge: draft.endAge,
    hasCola: draft.hasCola ?? false,
  };
}
