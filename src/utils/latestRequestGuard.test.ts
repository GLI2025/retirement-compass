import { describe, expect, it } from 'vitest';

import { LatestRequestGuard } from '@/utils/latestRequestGuard';

describe('LatestRequestGuard', () => {
  it('uses latest-input-wins ordering after rapid requests', () => {
    const guard = new LatestRequestGuard();
    const firstRequest = guard.begin();
    const latestRequest = guard.begin();

    expect(guard.isCurrent(firstRequest)).toBe(false);
    expect(guard.isCurrent(latestRequest)).toBe(true);
    expect(guard.accept(firstRequest, 'first result')).toBeUndefined();
    expect(guard.accept(latestRequest, 'latest result')).toBe('latest result');
  });

  it('does not let a stale simulation replace a newer result', () => {
    const guard = new LatestRequestGuard();
    const staleRequest = guard.begin();
    const latestRequest = guard.begin();
    let displayedResult = 'deterministic result';

    displayedResult = guard.accept(latestRequest, 'latest simulation') ?? displayedResult;
    displayedResult = guard.accept(staleRequest, 'stale simulation') ?? displayedResult;

    expect(displayedResult).toBe('latest simulation');
  });

  it('rejects a response after its request is cancelled', () => {
    const guard = new LatestRequestGuard();
    const requestId = guard.begin();

    guard.invalidate(requestId);

    expect(guard.isCurrent(requestId)).toBe(false);
    expect(guard.accept(requestId, 'cancelled result')).toBeUndefined();
  });
});
