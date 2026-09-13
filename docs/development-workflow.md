# GlassBridgePath development workflow

GitHub is the source of truth for this project. Production changes must move through a feature branch and review before reaching `main`.

## Deployment map

- Production: GitHub `main` -> Cloudflare Worker -> `glassbridgepath.com`
- Legacy: GitHub `main` -> Cloudflare Pages -> `pensionretirementcalc.com`

Do not change either deployment or redirect the legacy domain as part of an unrelated product change.

## Safe change sequence

1. Start a feature branch from the latest commit on `main`.
2. Make one focused change. Keep financial formula changes separate from UI changes.
3. Review the diff for unexpected files, dependency changes, configuration changes, and credential values.
4. In an isolated checkout, use the committed `package-lock.json`:
   - `npm ci`
   - `npm run build`
5. Push the feature branch and confirm Cloudflare builds that branch or commit successfully.
6. Review the Cloudflare preview and complete the pull-request checklist.
7. Merge into `main` only after the change is approved and validated.
8. Confirm the production Worker deployment for `glassbridgepath.com` succeeds.

Do not upgrade Node, change package managers, permanently change `PATH`, modify credential values, or merge into `main` without separate approval.

## Calculator protection

For UI-only changes, confirm that known inputs still produce the same financial outputs. At minimum, check:

- Fixed withdrawals
- Guardrails
- Die With Zero, including target age
- Inflation on and off
- Social Security on and off, including claim age
- Mortgage payoff on and off, including payoff age
- Guaranteed income start and end ages
- One-time deposits before and after retirement
- Monte Carlo probability labels and chart bands

Record the inputs and key outputs used for the check in the pull request. Any proposed formula change must be explained and approved separately.

## Review boundaries

A pull request is not ready to merge when:

- The local build or Cloudflare preview fails.
- The diff includes unplanned calculation, dependency, deployment, or credential changes.
- A UI-only change alters known calculator outputs.
- Nominal and inflation-adjusted dollars are presented ambiguously.
- The reviewer cannot tell which commit Cloudflare built.
