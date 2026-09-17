/**
 * Plain-English guide
 *
 * Purpose: Converts a future nominal dollar amount into today's buying power
 * and calculates the number of years between two ages.
 *
 * Inputs/outputs: It receives a nominal amount, time, and annual inflation rate
 * and returns the equivalent today-dollar amount. ResultsSummary and
 * IncomeCheckpoints use these helpers for explanatory displays; this file does
 * not run the retirement projection itself.
 *
 * Financial impact: Medium. Incorrect conversion would not change portfolio
 * balances, but it would make displayed future and today-dollar values disagree.
 */
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
