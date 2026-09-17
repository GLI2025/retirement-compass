/**
 * Plain-English guide
 *
 * Purpose: Route-level wrapper for the standalone Guardrails Methods page.
 * App.tsx maps the methods route here, and this file renders GuardrailsMethods
 * without transforming its saved snapshot or explanatory output.
 *
 * Calculations: None. It has no dollar basis and performs neither deterministic
 * nor Monte Carlo work. The rendered component explains pension, Social Security,
 * inflation, withdrawals, and Guardrails from the saved standalone run; the main
 * calculator's other income, housing/mortgage, deposits, Fixed, and Die With Zero
 * rules are not used.
 *
 * Financial impact: Low. An incorrect import or export would break the route or
 * display the wrong page, but would not change the underlying financial results.
 */
import { GuardrailsMethods } from "@/components/Guardrails/GuardrailsMethods";

const Methods = () => {
  return <GuardrailsMethods />;
};

export default Methods;
