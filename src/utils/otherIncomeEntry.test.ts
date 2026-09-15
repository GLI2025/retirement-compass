import { describe, expect, it } from 'vitest';

import {
  applyIncomePreset,
  createIncomeSourceId,
  createOtherIncomeDraft,
  createOtherIncomeSource,
} from '@/utils/otherIncomeEntry';

describe('other income entry', () => {
  it('uses randomUUID when the browser provides it', () => {
    expect(createIncomeSourceId({ randomUUID: () => 'uuid-1' })).toBe('uuid-1');
  });

  it('creates an ID when randomUUID is unavailable on a mobile browser', () => {
    const id = createIncomeSourceId({
      getRandomValues: (values) => {
        values.set([1, 2, 3, 4]);
        return values;
      },
    });

    expect(id).toBe('income-00000001000000020000000300000004');
  });

  it('has a dependency-free fallback when the browser crypto API is unavailable', () => {
    expect(createIncomeSourceId(null, () => 1234, () => 0.5)).toBe(
      'income-ya-18ce53un18f',
    );
  });

  it('allows an unnamed source and gives it a useful default label', () => {
    const source = createOtherIncomeSource({
      label: '   ',
      monthlyAmount: 1800,
      startAge: 67,
      hasCola: true,
    }, 45, 'income-1');

    expect(source).toEqual({
      id: 'income-1',
      label: 'Other Income',
      monthlyAmount: 1800,
      startAge: 67,
      endAge: undefined,
      hasCola: true,
    });
  });

  it('preserves an explicitly entered zero-dollar source', () => {
    const source = createOtherIncomeSource({
      monthlyAmount: 0,
      startAge: 50,
    }, 45, 'income-2');

    expect(source.monthlyAmount).toBe(0);
    expect(source.startAge).toBe(50);
  });

  it('uses a preset to fill the draft without discarding its timing choices', () => {
    const draft = applyIncomePreset({
      ...createOtherIncomeDraft(45),
      startAge: 62,
      hasCola: true,
    }, {
      label: 'Pension',
      defaultAmount: 2000,
    });

    expect(draft).toMatchObject({
      label: 'Pension',
      monthlyAmount: 2000,
      startAge: 62,
      hasCola: true,
    });
  });
});
