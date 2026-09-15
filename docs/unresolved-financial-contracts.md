# Financial-contract status

Phase 4A resolved Monte Carlo path success, recovery after depletion, projection-backed expense guidance, and other-income COLA timing.

Phase 4B resolves required-savings consistency. Required Savings, deterministic status, plan-end balance, depletion timing, and sustainable-spending calculations now use the same deterministic monthly retirement simulation as the chart. The previous annual present-value approximation is no longer used.

Monte Carlo tests use the optional deterministic random-number source added in Phase 3. Production calls continue to use `Math.random`.

Housing Details (phase 1: Own and Rent) resolves how housing enters the cash flow. Monthly Expenses remains total lifestyle spending including housing, and one shared schedule in `src/lib/calculations/housing.ts` produces the monthly housing cost that `calculateMonthlyExpenses` adds to the inflated non-housing portion. An owned mortgage is fixed nominal until payoff; rent is a today-dollar amount that grows only by the selected rent-growth rate, deliberately independent of the general inflation toggle. Sustainable spending now distinguishes a solved lifestyle budget from a housing cost that cannot be funded at all.

Income Checkpoint status is resolved as presentation, not as a separate financial definition. Checkpoint colors previously came from hard-coded snapshot withdrawal-rate thresholds (4%/6% drifting with age), which could report every checkpoint red on a plan that Required Savings, the deterministic chart, and the headline all treated as funded. Colors now come from the strict deterministic projection: funded through plan end is green, projected depletion later is amber, and at or after depletion is red. Guardrails keeps its planned-cut amber, Die With Zero keeps its target-age and ending-buffer contract, and depletion is read from the projection rather than from a zero point in the yearly chart so a later deposit cannot restore a failed path to green. No cash flow, Required Savings, sustainable spending, housing, or Monte Carlo result changes with this contract.

Open items deferred from this phase: whether a future Rent-then-Buy or Own-then-Rent plan should also model home equity, sale proceeds, and transaction costs; and whether property taxes, insurance, and maintenance should eventually be separated from general expenses so they can grow at a housing-specific rate.
