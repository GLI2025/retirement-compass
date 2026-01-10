export function toTodayDollars(nominal: number, yearsFromNow: number, inflationRatePct: number) {
  const r = inflationRatePct / 100;
  return yearsFromNow <= 0 ? nominal : nominal / Math.pow(1 + r, yearsFromNow);
}

export function yearsFromNow(currentAge: number, atAge: number) {
  return Math.max(0, atAge - currentAge);
}
