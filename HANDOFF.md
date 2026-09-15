# Retirement Compass — Developer Handoff
Retirement Compass (Retirement Cash-Flow Calculator)
What this app is

A single-page retirement planning calculator that helps a user answer:

Will my retirement cash flow cover my spending?

How sensitive is that outcome to a few key levers (retire 1–2 years later, change spending rule, Social Security timing, inflation, etc.)

How do different spending rules change the story:

Fixed withdrawals → “Savings rate matters more than you think.”

Guardrails → “Controlling spending matters more than you think.”

Die With Zero → “Spending more safely matters more than you think.”

This is educational, not advice.

Tech stack (high level)

React + TypeScript + Vite

UI components: shadcn/ui + Radix

Styling: Tailwind

Deployment: currently set up for Cloudflare Pages (there is a wrangler.jsonc)

Development workflow:

Create a feature branch, run tests and the production build, open a pull request,
review the Cloudflare branch preview, and merge only after approval. Merging into
GitHub `main` triggers the existing Cloudflare production deployment.

Local setup (developer quick start)
1) Install
npm install

2) Run locally
npm run dev

3) Production build
npm run build
npm run preview

Project structure (the important parts)
Main page

src/pages/Index.tsx
Renders <RetirementCalculator />

Calculator UI container (now split into sections)

src/components/RetirementCalculator/RetirementCalculator.tsx
This is the “page orchestrator”: holds state, calls calculation engine, and composes UI sections.

Calculator UI sections (the refactor direction)

src/components/RetirementCalculator/sections/YourInformationSection.tsx

src/components/RetirementCalculator/sections/OtherIncomeSourcesSection.tsx

src/components/RetirementCalculator/sections/InflationOptionSection.tsx

src/components/RetirementCalculator/sections/SpendingRuleSection.tsx

(optional/next) CalculatorHeader.tsx exists in this folder too

Shared UI widgets used across sections

src/components/calculator/*

StepInput.tsx (the numeric stepper input used everywhere)

ToggleOption.tsx (collapsible toggle section)

StrategySelect.tsx (investment strategy selector)

PortfolioChart.tsx (visual output)

ResultsSummary.tsx, IncomeCheckpoints.tsx, GuidancePanel.tsx

ExportPDFButton.tsx (PDF export)

Calculation engine (core logic)

src/utils/calculations.ts
The main projection loop. Produces:

chart series

checkpoints

“on track” status

success probability (when Monte Carlo is on)

Spending rules (core behavioral logic)

src/lib/calculations/spendingRules.ts
The spending-rule switch:

fixed

guardrails

die_with_zero (DWZ amortization-style)

Types / inputs model

src/types/calculator.ts
Defines CalculatorInputs, CalculatorResults, strategies, etc.

Defaults

src/lib/defaults.ts
Canonical defaults + default life expectancy used across app.

Data flow (how the app works)
1) UI state lives in RetirementCalculator.tsx

Holds:

inputs (CalculatorInputs)

updateInput(key, value) helper

Calculates:

results = calculateRetirement(inputs)

guidance = generateGuidance(inputs, results)

2) Results fan out into components

Chart gets results.chartData

Summary/checkpoints/guidance consume results + inputs

3) Retirement projection loop (high level)

calculateRetirement() in src/utils/calculations.ts:

Accumulates savings until retirement

After retirement:

computes baseline withdrawal need

applies spending rule via applySpendingRule(inputs, ctx)

applies deterministic expected-return assumptions, or randomized market returns
for Monte Carlo when enabled

End age:

normally life expectancy

DWZ uses one normalized target age: it is rounded, constrained to at least one
year after retirement, and capped at age 120. That same age controls both the
plan horizon and the inflation-adjusted ending-buffer target.

Cash-flow conventions:

- Spending inputs are entered in today's dollars and inflated when inflation is on.
- Social Security and other income are entered in today's dollars; COLA grows them
  from the current age when enabled, while non-COLA income remains nominal.
- The mortgage payment is treated as a fixed nominal payment. Lifestyle expenses
  inflate separately, and the mortgage is removed at the selected payoff age.
- If guaranteed income exceeds planned spending, portfolio withdrawal is floored
  at $0. The excess is intentionally ignored rather than added to the portfolio;
  changing that meaning requires a separate approved financial-contract decision.

Where to make changes safely (common tasks)
Add / remove a UI section

Do it inside:

src/components/RetirementCalculator/RetirementCalculator.tsx

Pattern:

Keep state + updateInput + results here

Move big JSX blocks into sections/* components

Change “Die With Zero” behavior

File:

src/lib/calculations/spendingRules.ts

DWZ currently projects the user's entered spending and tests it against the selected
target age and ending buffer. It does not silently increase the displayed chart
withdrawal. A separate projection-backed sustainable-spending result estimates a
monthly amount the user can choose to test.

Change chart horizon / end age rules

File:

src/utils/calculations.ts
Function:

getEndAge(inputs)

DWZ should end at user target age (clamped).

Known gotchas / checks (things a dev should verify)
1) Imports break if folders/files move

If you move sections, you must keep imports aligned:

Example:

./sections/YourInformationSection

2) DWZ “target age” must match chart horizon

End age comes from getEndAge() in src/utils/calculations.ts.
If users choose 95, chart should reach 95.

3) “Unexpected end of file” errors happen when copying JSX mid-block

If Cloudflare build fails with “Unexpected end of file”:

open the file mentioned in the build log

ensure:

component returns a single JSX root

all {} and ()</> are closed

the export is complete

4) .env values

There is a .env file with Supabase vars:

VITE_SUPABASE_URL

VITE_SUPABASE_PROJECT_ID

VITE_SUPABASE_PUBLISHABLE_KEY

A developer should confirm these are real and not placeholder/truncated, and confirm whether Supabase features are required for production (PDF checkout functions exist under /supabase/functions).

Deployment notes (Cloudflare Pages)

Build command:

npm run build

Output directory (Vite default):

dist

If Cloudflare Pages is configured manually:

Framework preset: Vite

Build command: npm run build

Build output directory: dist

There is a wrangler.jsonc. If Pages complains about wrangler config, dev should confirm Pages settings are correct and that any wrangler file present is valid for Pages use.

Product intent (so the dev “gets it”)

This is not trying to out-Boldin Boldin.

It’s a fast “free look”:

“Am I basically okay or basically short?”

“If I work 1–2 more years, does it flip the result?”

“If I spend a little less, does it flip the result?”

“If I use a smarter spending rule, does it flip the result?”

A dev should optimize for:

clarity

speed

few inputs

easy “what-if” toggles

explainable outputs (checkpoints + simple story)

Suggested next refactor (optional, recommended)

Right now RetirementCalculator.tsx is improved, but still a “hub.”

A clean end-state:

Keep only:

state (inputs)

updateInput

results memo

reset handlers

layout composition

Move remaining big blocks into sections:

WhatIfScenariosSection

InvestmentStrategySection

MonteCarloSection

ResultsSection (summary + PDF + checkpoints + guidance + reset)

This makes future edits safer and reduces accidental JSX breakage.

Quick “definition of done” test checklist

A developer can validate without deep finance knowledge:

Baseline

With default inputs, page loads, chart renders, checkpoints show.

Inflation toggle

Turning inflation ON changes long-run expense curve and results.

Spending rules

Fixed vs Guardrails vs DWZ produce visibly different drawdown paths.

DWZ horizon

Set DWZ target age to 95 → chart reaches 95.

Set to 90 → chart reaches 90.

Spending increases relative to fixed (when feasible).

What-if toggles

SS on/off changes withdrawals.

Mortgage payoff reduces expenses after payoff age.

Mortgage helper text must preserve the model: the mortgage payment is nominal and
fixed; only the non-mortgage lifestyle portion follows inflation.

Monte Carlo

Monte Carlo uses 1,000 randomized paths. Its probability and percentile bands are
separate from deterministic Required Savings, Projected Savings, Gap, and the
deterministic income checkpoints. Percentiles use the conventional
`floor(q * (n - 1))` index.

Build

npm run build succeeds locally.

Contact / ownership

Product owner: Brandon Glass
Goal: free look retirement cash-flow estimation tool, strategy comparisons, explainable outputs.
