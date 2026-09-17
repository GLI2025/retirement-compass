/**
 * Plain-English guide
 *
 * Purpose: Route-level wrapper for the standalone Guardrails Calculator.
 * App.tsx maps the public Guardrails route to this page, and this page renders
 * GuardrailsCalculator without changing its inputs or results.
 *
 * Calculations: None. It has no dollar basis and performs neither deterministic
 * nor Monte Carlo work; all pension, Social Security, inflation, and Guardrails
 * behavior belongs to the component and its calculation library. The main
 * calculator's other income, housing/mortgage, deposits, Fixed, and Die With Zero
 * rules are not used here.
 *
 * Financial impact: Low. Changing the rendered component or export could break
 * routing or send users to the wrong calculator, but cannot alter formulas itself.
 */
import { GuardrailsCalculator } from "@/components/Guardrails/GuardrailsCalculator";

const Guardrails = () => {
  return <GuardrailsCalculator />;
};

export default Guardrails;
