# Unresolved financial contracts

The Phase 4A financial-contract work resolved Monte Carlo path success, recovery after depletion, projection-backed expense guidance, and other-income COLA timing. The following behavior remains intentionally **not** established as correct by the automated tests.

1. **Required-savings consistency** — The annual required-savings approximation has not been declared equivalent to the calculator's monthly portfolio projection. Replacing `calculateRequiredSavings()` or consolidating the complete cash-flow engine remains deferred to Phase 4B.

Monte Carlo tests use the optional deterministic random-number source added in Phase 3. Production calls continue to use `Math.random`.
