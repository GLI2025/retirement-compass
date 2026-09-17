/**
 * Plain-English guide
 *
 * Purpose: Route-level wrapper for the standalone Guardrails Volatility page.
 * App.tsx maps the volatility route here, and this file renders
 * GuardrailsVolatility without changing its saved simulation data.
 *
 * Calculations: None. It has no dollar basis and runs neither deterministic nor
 * Monte Carlo logic itself. The rendered component rebuilds percentile paths
 * from the saved pension, Social Security, inflation, and Guardrails assumptions;
 * the main calculator's other income, housing/mortgage, deposits, Fixed, and Die
 * With Zero rules are not used.
 *
 * Financial impact: Low. An incorrect import or export would break the route or
 * display the wrong analysis, but could not alter the simulation formulas itself.
 */
import { GuardrailsVolatility } from "@/components/Guardrails/GuardrailsVolatility";

const Volatility = () => {
  return <GuardrailsVolatility />;
};

export default Volatility;
