export function toTodayDollars(
  nominal: number,
  yearsFromNow: number,
  inflationRatePct: number
) {
  const r = inflationRatePct / 100;
  return yearsFromNow <= 0 ? nominal : nominal / Math.pow(1 + r, yearsFromNow);
}

export function yearsFromNow(currentAge: number, atAge: number) {
  return Math.max(0, atAge - currentAge);
}

// Convenience helper: convert a future (nominal) amount at a specific age
// back into today's buying power.
// RealAmount = NominalAmount / (1 + inflationRate)^(age - currentAge)
export function toTodayDollarsAtAge(
  nominalAmount: number,
  age: number,
  currentAge: number,
  inflationRatePct: number
) {
  return toTodayDollars(nominalAmount, yearsFromNow(currentAge, age), inflationRatePct);
}
