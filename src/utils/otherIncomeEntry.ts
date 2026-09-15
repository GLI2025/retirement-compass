import type { OtherIncome } from '@/types/calculator';

export interface IncomePreset {
  label: string;
  defaultAmount: number;
}

export type OtherIncomeDraft = Partial<OtherIncome>;

interface IncomeIdCrypto {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint32Array) => Uint32Array;
}

export function createIncomeSourceId(
  cryptoApi: IncomeIdCrypto | null | undefined = globalThis.crypto,
  now: () => number = Date.now,
  random: () => number = Math.random,
): string {
  const availableCrypto = cryptoApi ?? undefined;

  try {
    const uuid = availableCrypto?.randomUUID?.();
    if (uuid) return uuid;
  } catch {
    // Fall through to older-browser ID generation.
  }

  try {
    if (availableCrypto?.getRandomValues) {
      const values = availableCrypto.getRandomValues(new Uint32Array(4));
      return `income-${Array.from(values, value => value.toString(16).padStart(8, '0')).join('')}`;
    }
  } catch {
    // Fall through to the dependency-free final fallback.
  }

  const timePart = now().toString(36);
  const randomPart = Math.floor(random() * Number.MAX_SAFE_INTEGER).toString(36);
  return `income-${timePart}-${randomPart}`;
}

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
