## What changed

<!-- Describe the user-visible change and why it is needed. -->

## Change classification

- [ ] UI/copy only
- [ ] Financial calculation change (requires separate explanation and approval)
- [ ] Dependency or build configuration change
- [ ] Deployment configuration change

## Validation

- [ ] I reviewed the complete diff for unrelated files and credential values.
- [ ] `npm ci` completed using the committed `package-lock.json`.
- [ ] `npm run build` completed successfully.
- [ ] Cloudflare successfully built the feature branch or commit.
- [ ] I recorded the exact commit reviewed and preview URL below.
- [ ] The mobile layout has no clipped content or horizontal scrolling.

Commit reviewed:

Cloudflare preview:

## Calculator regression check

- [ ] Known baseline outputs are unchanged, or this approved calculation change explains every difference.
- [ ] Fixed withdrawals checked.
- [ ] Guardrails checked.
- [ ] Die With Zero and target age checked.
- [ ] Inflation checked.
- [ ] Social Security timing checked.
- [ ] Mortgage payoff timing checked.
- [ ] Guaranteed-income timing checked.
- [ ] One-time deposits checked.
- [ ] Monte Carlo labels and chart bands checked.

Baseline inputs and outputs:

## Production

- [ ] Ready to merge into `main` after review.
- [ ] After merge, confirm the `glassbridgepath.com` production Worker deployment succeeds.
- [ ] No legacy-domain redirect is included unless separately approved.
