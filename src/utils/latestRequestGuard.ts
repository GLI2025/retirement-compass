/**
 * Tracks asynchronous work so only the newest request may publish a result.
 *
 * This stays independent of Monte Carlo math; it only coordinates worker responses.
 */
export class LatestRequestGuard {
  private latestRequestId = 0;

  begin(): number {
    this.latestRequestId += 1;
    return this.latestRequestId;
  }

  invalidate(requestId?: number): void {
    if (requestId === undefined || this.isCurrent(requestId)) {
      this.latestRequestId += 1;
    }
  }

  isCurrent(requestId: number): boolean {
    return requestId === this.latestRequestId;
  }

  accept<T>(requestId: number, value: T): T | undefined {
    return this.isCurrent(requestId) ? value : undefined;
  }
}
