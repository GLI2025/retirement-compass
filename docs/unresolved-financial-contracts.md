# Unresolved financial contracts

These behaviors are intentionally **not** established as correct by the automated tests. They require a product and financial-methodology decision before their implementations are changed or locked down.

1. **Monte Carlo success after final balance** — A final balance above $0 does not necessarily prove that a simulated retirement path succeeded.
2. **Recovery after depletion** — A path that reaches $0 before the plan ends should not automatically become successful if a later one-time deposit restores a positive balance.
3. **Required-savings consistency** — The annual required-savings approximation has not been declared equivalent to the calculator's monthly portfolio projection.
4. **Expense-reduction guidance** — The current expense-reduction shortcut has not been proven to close the displayed gap.
5. **Other-income COLA timing** — Whether COLA for other income should accrue from the current age or only from that income source's start age remains undecided.

The Monte Carlo calculation accepts an optional deterministic random-number source solely for repeatable tests. Production calls still use `Math.random`, and the scaffold does not endorse the current Monte Carlo success definition.
