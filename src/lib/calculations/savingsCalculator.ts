import { SavingsCalculatorInputs, SavingsCalculatorResults, YearlySnapshot } from '@/types/savingsCalculator';

/**
 * Standard 401(k)-style savings + employer match projection.
 *
 * NOTE: This is a newly built engine, not a port. The original WordPress page
 * (savings_calculator/) had this exact form and results shell but the
 * calculation script was missing/broken on the live site — confirmed by
 * clicking "Calculate" live, which did nothing. This model uses the
 * conventional match structure implied by the form's own field labels:
 * "employer match rate (%)" applied to the employee's contribution, capped
 * at "match cap (% of salary)".
 */
export function calculateSavings(inputs: SavingsCalculatorInputs): SavingsCalculatorResults {
  const ppy = inputs.periodsPerYear;
  const perPeriodReturn = inputs.returnPct / 100 / ppy;

  let balance = inputs.start;
  let salary = inputs.salary;
  let totalEmployee = 0;
  let totalEmployer = 0;
  const yearly: YearlySnapshot[] = [];

  for (let year = 1; year <= inputs.years; year++) {
    let employeeThisYear = 0;
    let employerThisYear = 0;

    for (let period = 0; period < ppy; period++) {
      const periodSalary = salary / ppy;
      const employeeContrib = periodSalary * (inputs.empPct / 100);
      const employerMatchRaw = employeeContrib * (inputs.matchRate / 100);
      const employerCapAmount = periodSalary * (inputs.matchCap / 100);
      const employerContrib = Math.min(employerMatchRaw, employerCapAmount);

      balance += employeeContrib + employerContrib;
      balance *= 1 + perPeriodReturn;

      employeeThisYear += employeeContrib;
      employerThisYear += employerContrib;
    }

    totalEmployee += employeeThisYear;
    totalEmployer += employerThisYear;

    yearly.push({
      year,
      endingBalance: balance,
      salary,
      employeeContribThisYear: employeeThisYear,
      employerMatchThisYear: employerThisYear,
    });

    salary *= 1 + inputs.raisePct / 100;
  }

  const totalContributions = totalEmployee + totalEmployer;
  const totalGrowth = balance - inputs.start - totalContributions;

  return {
    finalBalance: balance,
    totalEmployeeContrib: totalEmployee,
    totalEmployerMatch: totalEmployer,
    totalContributions,
    totalGrowth,
    yearly,
  };
}

export const SAVINGS_CALCULATOR_DEFAULTS: SavingsCalculatorInputs = {
  start: 50000,
  salary: 80000,
  empPct: 10,
  matchRate: 50,
  matchCap: 6,
  returnPct: 6,
  raisePct: 3,
  years: 10,
  periodsPerYear: 26,
};
