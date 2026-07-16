
Yesterday 1:33 PM
image.png
image(1).png
Need to make some choices? Stay with namecheap, keep websites, keep certificates? This is still a side project and I like having it on the web but want to control cost while keeping it good. 


Subscription	Plan	Status	Auto-Renew	Expiration	
glassbridgepath.com	Stellar Plus	  EXPIRING	

Aug 11, 2026	


Why not change companies? 

Today 1:10 AM
K, I'm ready to try to move everything. What can I provide to help you understand what steps to take? 

image(2).png
image(3).png
image(4).png
image(5).png

guardrails-retirement-calculator-main.zip
Zip Archive

retirement-compass-main (8).zip
Zip Archive
I'd like glassbridgepath.com to be the main site


The most useful next item is a full WordPress backup of glassbridgepath.com, preferably one of these: - A cPanel full account backup

How do I get this? 

I'm in c panel and I do not see a choice to file - download



backup-7.16.2026_03-39-48_glasxepk.tar.gz
File

do it

are we moving forward? 

Today 10:32 AM
Where do I go to find line 365 and how do I repair retirement compass


calculations.ts
TypeScript
Done 

Done, whats next

Build completed, Claude helped, Give me instructions on our path and what you already know clearly for claude to help finish the transition. 

Today 4:48 PM
The build failed because package.json has invalid JSON
The actual failure in the logs is:

npm error code EJSONPARSE
npm error JSON.parse Expected double-quoted property name in JSON at position 1570 (line 43 column 1)
The commit "Update package.json" introduced a JSON syntax error (likely a trailing comma or unquoted key around line 43). This must be fixed in the GitHub repo before any build will succeed.

The wrangler.json warning is a config mismatch, not the cause of failure
The logs show:

"A Wrangler configuration file was found but it does not appear to be valid. Did you mean to use wrangler.toml to configure Pages? If so, then make sure the file is valid and contains the pages_build_output_dir property. Skipping file and continuing."

This project is configured as a Cloudflare Pages project (not a Workers project). The Pages build system found your wrangler.json in the repo, but it's written in Workers format (using assets.directory instead of pages_build_output_dir). The Pages builder can't use Workers-style config, so it skips the file and falls back to the dashboard build settings.

What needs to happen
You have two paths depending on your goal:

Option A: Stay on Pages (quick fix)
Fix package.json — correct the JSON syntax error at line 43 and push to main. This alone will make the build succeed again.
Either remove wrangler.json from the repo or add "pages_build_output_dir": "dist" to it so the Pages builder can use it. The current Workers-style config (assets.directory) is ignored by Pages.
Option B: Migrate to Workers (proper fix for the wrangler.json warning)
If you want this to be a true Workers project where wrangler.json is the source of truth:

Fix package.json first (same JSON syntax fix).
Create a new Workers project with Workers Builds connected to the same GitHub repo (GLI2025/retirement-compass). The Workers build system will read your wrangler.json natively.
Update your wrangler.json to use the Workers format:
{
  "name": "retirement-compass",
  "compatibility_date": "2026-01-05",
  "assets": { "directory": "./dist" },
  // ... other config
}
Once the Workers project is live and serving correctly, you can delete the Pages project.

Since the core issue is the JSON syntax error, let’s fix that first. In your GitHub repository, open the package.json


Help me fix the issue above

Worked for 1m 48s
Yes. Since your goal is manual deployment with npx wrangler deploy, use the Workers static-assets path, not Cloudflare Pages.

The repository appears private from my side, so I cannot see the exact malformed character in the current package.json. Here is the clean repair sequence.

1. Repair package.json in GitHub
Open:

https://github.com/GLI2025/retirement-compass
Then:

Click package.json.

Click the pencil icon.

Go to approximately line 43.

Look for one of these errors:

Trailing comma
Wrong:

"@supabase/supabase-js": "^2.89.0",
}
Correct:

"@supabase/supabase-js": "^2.89.0"
}
Missing comma
Wrong:

"@supabase/supabase-js": "^2.89.0"
"@tanstack/react-query": "^5.83.0",
Correct:

"@supabase/supabase-js": "^2.89.0",
"@tanstack/react-query": "^5.83.0",
Unquoted property
Wrong:

deploy: "npm run build && wrangler deploy"
Correct:

"deploy": "npm run build && wrangler deploy"
Comment inside package.json
Wrong:

// Cloudflare deployment
"deploy": "npm run build && wrangler deploy"
Remove the comment. package.json must be actual JSON, not a JavaScript-style object with comments or loose syntax. 

Your scripts section can safely look like this:

"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "deploy": "npm run build && wrangler deploy"
},
Notice that:

Every property name uses double quotes.

Every line except the last property has a comma.

There is no comma after the final "deploy" line.

Commit the correction directly to main.

2. Replace the Cloudflare configuration
Delete the current:

wrangler.json
Create this file instead:

wrangler.jsonc
Paste exactly:

{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "retirement-compass",
  "compatibility_date": "2026-07-16",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
Commit it to main.

Why this version:

assets.directory tells Workers to deploy the Vite dist folder.

single-page-application prevents direct links or refreshed React routes from returning a 404.

No main field is needed because this is currently a static application without a Worker script.

No pages_build_output_dir should be added because you are not using the Pages deployment path. Cloudflare recommends wrangler.jsonc for new Wrangler configurations and documents this exact static-assets structure for SPA deployments. 

3. Validate the corrected file
After committing, open PowerShell and perform a completely fresh clone:

cd $HOME\Desktop

git clone https://github.com/GLI2025/retirement-compass.git retirement-compass-fresh

cd retirement-compass-fresh

git checkout main

git pull --ff-only origin main
Confirm you are using the correct branch:

git branch --show-current
It should return:

main
Now validate package.json before using npm:

node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json is valid JSON')"
Expected:

package.json is valid JSON
If this command still reports a position or line-number error, stop there and upload the current package.json to me. I can identify the exact character.

4. Install and build
Run:

npm install
Then:

npm run build
Confirm the folder exists:

Get-ChildItem dist
You should see at least:

index.html
assets
5. Authenticate Wrangler
Check whether Wrangler recognizes your Cloudflare account:

npx wrangler whoami
If it says you are not authenticated:

npx wrangler login
A browser window will open. Approve access, then return to PowerShell.

6. Deploy manually
From inside the fresh clone, run:

npx wrangler deploy
Wrangler will build the deployment from the configured dist directory and publish the static application as a Worker. 

The successful output should include a URL similar to:

https://retirement-compass.<your-workers-subdomain>.workers.dev
7. Ignore the old Pages failure for now
Because the old Pages project is still connected to GitHub, pushing these fixes may trigger another Pages build. That is separate from the manual Workers deployment.

Do not delete the Pages project until the new workers.dev site has been tested for:

Calculator inputs

Charts

Monte Carlo

PDF download

Mobile layout

Nested routes and browser refreshes

The immediate sequence is:

Fix package.json
→ replace wrangler.json with wrangler.jsonc
→ fresh clone
→ validate JSON
→ npm install
→ npm run build
→ npx wrangler deploy


retirement-compass-main (10).zip
Zip Archive
Does it look ready to deploy? 

Worked for 4m 11s
Verdict
Ready for a temporary workers.dev test deployment: yes.
Ready for the public GlassBridge launch and paid PDF sales: not yet.

I tested the uploaded project directly:

package.json parses successfully.

npm ci completes.

npm run build completes.

Local preview loads both / and /export-success.

npx wrangler deploy --dry-run succeeds and correctly reads the files from dist.

Your wrangler.jsonc uses the correct Workers static-assets and single-page-app configuration. 

You can deploy it to a temporary URL now:

npx wrangler login
npx wrangler deploy
Do not connect glassbridgepath.com yet.

What must be fixed before production
1. The paid PDF flow will probably fail
The checkout function places this into one Stripe metadata field:

metadata: {
  calculatorData: JSON.stringify(calculatorData),
}
That data includes the calculator results and a base64 chart image. Stripe limits each metadata value to 500 characters, so this payload will be far too large. 

The simplest repair is to stop placing the calculator data in Stripe.

In supabase/functions/create-pdf-checkout/index.ts, replace:

metadata: {
  calculatorData: JSON.stringify(calculatorData),
},
with:

metadata: {
  product: "retirement_pdf",
},
In verify-pdf-payment/index.ts, return only:

return new Response(
  JSON.stringify({
    success: true,
  }),
  {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  }
);
Your browser already stores the PDF information in sessionStorage, and ExportSuccess.tsx already falls back to that stored data. Therefore, the payment service does not need the calculator data.

2. Production dependencies have security findings
The production audit reported:

1 critical vulnerability

5 high vulnerabilities

1 moderate vulnerability

The critical issue is connected to the old jsPDF version. Run:

npm install jspdf@4.2.1 react-router-dom@6.30.4
npm audit fix
npm run build
Then test PDF generation carefully because moving from jsPDF 2.x to 4.x may require small code changes.

Do not use:

npm audit fix --force
until you have a backup or commit, because it may introduce broader breaking upgrades.

3. .env is included in the repository package
Your uploaded project contains .env, but .gitignore does not ignore it.

Add this to .gitignore:

.env
.env.*
!.env.example
Create .env.example:

VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
Then remove the live file from Git tracking while keeping your local copy:

git rm --cached .env
git add .gitignore .env.example
git commit -m "Secure environment configuration"
The Supabase browser key is labeled as publishable, but the .env file still should not be treated as normal source code.

4. Linting currently fails
npm run lint returns 11 errors and 8 warnings.

The build is not blocked, but these should be cleaned before the main-domain launch. Notable issues include:

Explicit any types in PortfolioChart.tsx

Four ternary assignment expressions in guardrails.ts

@ts-nocheck in pdfGenerator.ts

Empty interfaces in two UI components

A React effect dependency warning in ExportSuccess.tsx

These do not prevent a preview deployment, but pdfGenerator.ts using @ts-nocheck deserves review before charging customers for PDFs.

5. Remove remaining Lovable branding
Your page metadata still includes:

<meta property="og:image" content="https://lovable.dev/..." />
<meta name="twitter:site" content="@Lovable" />
<meta name="twitter:image" content="https://lovable.dev/..." />
Replace those before launching on glassbridgepath.com.

Recommended order
Deploy the current build to workers.dev.

Confirm the calculator, charts, Monte Carlo, and route refreshes work.

Repair the Stripe metadata flow.

Update jsPDF and the vulnerable packages.

secure .env.

Run build, lint, and PDF tests again.

Replace Lovable metadata.

Only then connect glassbridgepath.com.

So, yes: deploy the preview now. Do not launch the paid PDF or switch the main domain yet.


I am not running this locally, it is only on github and deployed through cloudflare. This is a personal project and not client facing currently, no one knows about the site. I do not need the print pdf to work at this time. I'd like to remove lovable branding.

Worked for 59s
Understood. Since this is private, lightly used, and the PDF can wait, the only immediate blocker is removing the public Lovable branding. You can do this entirely through GitHub.

I checked the project you uploaded. The branding visible to browsers and social previews is in index.html.

Remove the public branding now
In GitHub:

Open GLI2025/retirement-compass.

Open index.html.

Click the pencil icon.

Replace everything between <head> and </head> with:

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Retirement Compass | GlassBridge Path</title>

  <meta
    name="description"
    content="Explore how savings, spending, Social Security, inflation, and market uncertainty may shape your retirement plan."
  />

  <meta name="author" content="GlassBridge Path" />

  <meta property="og:title" content="Retirement Compass | GlassBridge Path" />
  <meta
    property="og:description"
    content="Build and explore a retirement plan using projections, retirement income, spending strategies, and Monte Carlo analysis."
  />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Retirement Compass | GlassBridge Path" />
  <meta
    name="twitter:description"
    content="Explore your retirement path using projections, retirement income, spending strategies, and Monte Carlo analysis."
  />
</head>
This removes:

https://lovable.dev/opengraph-image-p98pqg.png
and:

<meta name="twitter:site" content="@Lovable" />
Commit directly to main with:

Remove Lovable branding from site metadata
That is enough to remove Lovable from the deployed public page.

Fully remove Lovable from the source code
This part is optional. The remaining references are not displayed to visitors:

lovable-tagger in package.json

A Lovable import in vite.config.ts

Lovable instructions in README.md

An old fallback URL inside the unused PDF checkout function

Because removing the package also requires updating package-lock.json, use a browser-based GitHub Codespace rather than editing the dependency files manually.

Open a Codespace
In the GitHub repository:

Click Code.

Select Codespaces.

Click Create codespace on main.

Wait for the browser editor and terminal to open.

Run:

npm uninstall lovable-tagger
That updates both package.json and package-lock.json.

Then replace vite.config.ts with:

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
Run:

npm run build
Then commit and push:

git add index.html vite.config.ts package.json package-lock.json
git commit -m "Remove remaining Lovable dependencies"
git push origin main
Optional README cleanup
Replace the current Lovable-generated README.md with:

# Retirement Compass

Retirement Compass is an educational retirement-planning application developed for GlassBridge Path.

## Features

- Retirement savings projections
- Social Security and other retirement income
- Inflation-adjusted expenses
- Multiple retirement spending strategies
- Monte Carlo analysis
- Retirement checkpoints and guidance

## Technology

- React
- TypeScript
- Vite
- Cloudflare Workers static assets

## Development

Install dependencies:

```bash
npm install
Create a production build:

npm run build
Preview the application:

npm run preview
Deploy manually through Wrangler:

npx wrangler deploy
Disclaimer
This application is for educational purposes only and does not provide individualized investment, tax, legal, or financial advice.


## Old PDF-function reference

There is also an old Lovable fallback URL in:

```text
supabase/functions/create-pdf-checkout/index.ts
Change:

const origin =
  req.headers.get("origin") ||
  "https://kdiaurqxhmjgjcgnqtnj.lovableproject.com";
to:

const origin =
  req.headers.get("origin") ||
  "https://glassbridgepath.com";
That function is not important right now, but this prevents it from pointing back to Lovable later.

Recommended scope today
Do these now:

Update index.html.

Commit to main.

Deploy the updated build.

Confirm the browser tab says Retirement Compass | GlassBridge Path.

The dependency and README cleanup can happen afterward. None of those hidden references need to delay your current deployment.


the guardrails page is a 404 error

Worked for 1m 19s
The problem is in the React routing, not the Guardrails calculator itself.

Your project already contains:

src/pages/Guardrails.tsx
and:

src/components/Guardrails/GuardrailsCalculator.tsx
But /guardrails was never added to the router. I tested the fix against your uploaded project, and it builds successfully.

Fix it in GitHub
Open:

src/App.tsx
Be careful: edit src/App.tsx, not the separate App.tsx in the project root.

Replace the entire file with this:

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ExportSuccess from "./pages/ExportSuccess";
import Guardrails from "./pages/Guardrails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/guardrails" element={<Guardrails />} />
          <Route path="/export-success" element={<ExportSuccess />} />

          {/* Keep the catch-all route last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
Commit directly to main with:

Add Guardrails route
Deploy from GitHub Codespaces
Since you are not working locally:

In the repository, click Code.

Open the Codespaces tab.

Open your existing Codespace or create one on main.

In the terminal, run:

git pull origin main
npm ci
npm run build
npx wrangler deploy
Your existing wrangler.jsonc already has:

"not_found_handling": "single-page-application"
That means Cloudflare should serve the React app correctly when someone directly opens or refreshes:

/guardrails
Test after deployment
Open:

https://YOUR-WORKERS-URL/guardrails
Then test both:

Navigate to the page normally.

Refresh the browser while already on /guardrails.

Both should load the Guardrails calculator rather than the 404 page.

The essential change is this line:

<Route path="/guardrails" element={<Guardrails />} />
It must appear before:

<Route path="*" element={<NotFound />} />

RUnning the monte carlo on guardrails it is stuck at 0% chance even when stacking a pension beyond the need. 

Worked for 5m 10s
I found the bug. It was actually three related problems:

In the Total Income engine, the manual amount was treated as a portfolio withdrawal, then the pension was added on top. That meant more pension did not reduce the portfolio need.

A path automatically failed whenever the portfolio reached $0, even when pension and Social Security covered all spending.

The guardrail calibration could calculate an absurd spending raise because it did not recognize that $0 of portfolio could already support the target.

I corrected all three and confirmed the project still builds.

Replace these two GitHub files
1. Calculator logic
Replace:

src/lib/calculations/guardrails.ts
with:

guardrails-fixed.ts

2. Guardrails page wording
Replace:

src/components/Guardrails/GuardrailsCalculator.tsx
with:

GuardrailsCalculator-fixed.tsx

The second file changes confusing labels such as Starting Withdrawal to Annual Spending Target when using the Total Income engine. It also avoids showing a misleading portfolio cut threshold when guaranteed income already covers the entire target.

How to replace them through GitHub
For each file:

Open the repository.

Navigate to the existing file.

Click the pencil icon.

Select everything in the file and delete it.

Open the downloaded corrected file in Notepad.

Copy all its contents into GitHub.

Click Commit changes.

Commit directly to main.

Use this commit message:

Fix pension handling in Guardrails Monte Carlo
Once both files are committed, trigger your normal Cloudflare deployment.

What the result should now show
I tested these scenarios:

Scenario	Expected result
$0 portfolio, $40,000 spending target, $50,000 pension	100%
$100,000 portfolio, $40,000 target, $50,000 pension	100%
$0 portfolio, $40,000 target, $30,000 pension	0%
The last result is correct because the household still needs $10,000 per year from a nonexistent portfolio.

After deployment, test with:

Engine: Total income
Mode: Manual by $
Annual Spending Target: $40,000
Portfolio: $0
Pension: $50,000
Retirement Age: 65
Pension Start Age: 65
Pension COLA: 3%
CPI: 3%
That should now produce at least 99%, displayed as ≥99%.

A later pension starting age or a pension COLA below inflation can appropriately lower the result because the guaranteed income may not cover spending throughout the full retirement period.


Library
/
Retirement calculators
/
guardrails-fixed.ts


import { GuardrailsInputs, GuardrailsResults, IncomeStream } from '@/types/guardrails';

/**
 * Ported from the original standalone Guardrails Monte Carlo calculator
 * (glassbridgepath.com/guardrails/). Same market model, same triggers,
 * same binary-search calibration logic as the original — only the
 * language (vanilla JS -> TypeScript) and I/O (DOM -> function args) changed.
 *
 * Do not change these constants without explicit sign-off — they define
 * the product's risk model.
 */
const MU_S = 0.06, SIG_S = 0.18, MU_B = 0.0, SIG_B = 0.06, RHO = 0.1;
const W_S = 0.6, W_B = 0.4;
const START_TARGET = 0.8, UPPER_TRIGGER = 0.99, LOWER_TRIGGER = 0.25,
  UPPER_RESET = 0.8, LOWER_RESET = 0.45;

type RandFn = () => number;
type RandFactory = () => RandFn;

function mulberry32(a: number): RandFn {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: RandFn): number {
  let u = 0, v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function genReturn(rand: RandFn): number {
  const z1 = normal(rand), z2 = normal(rand);
  const sShock = z1, bShock = RHO * z1 + Math.sqrt(1 - RHO * RHO) * z2;
  const stock = Math.exp(MU_S - 0.5 * SIG_S * SIG_S) * Math.exp(SIG_S * sShock) - 1;
  const bond = Math.exp(MU_B - 0.5 * SIG_B * SIG_B) * Math.exp(SIG_B * bShock) - 1;
  return W_S * stock + W_B * bond;
}

function hashTag(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

function seqFactory(seedBase: number | null, tag: string): RandFactory {
  let i = 0;
  if (seedBase === null) {
    return () => Math.random;
  }
  const tagHash = hashTag(tag);
  return () => {
    const seed = ((seedBase ^ tagHash) + i++) >>> 0;
    return mulberry32(seed);
  };
}

interface PathResult {
  success: boolean;
  finalPV: number;
  vol: number;
  mdd: number;
}

function successRate(arr: PathResult[]): number {
  let s = 0;
  for (const r of arr) if (r.success) s++;
  return s / arr.length;
}

function toRealCola(stream: IncomeStream, cpi: number): number {
  return (stream.colaNom || 0) - (cpi || 0);
}

function incomeAt(t: number, incomes: IncomeStream[], cpi: number): number {
  let s = 0;
  for (const inc of incomes || []) {
    if (t >= (inc.start || 0)) {
      const yearsActive = t - (inc.start || 0);
      const colaReal = toRealCola(inc, cpi);
      s += inc.amt * Math.pow(1 + colaReal, yearsActive);
    }
  }
  return s;
}

interface WelfordState { n: number; mean: number; m2: number }
function welfordAdd(state: WelfordState, x: number) {
  state.n++;
  const delta = x - state.mean;
  state.mean += delta / state.n;
  state.m2 += delta * (x - state.mean);
}
function welfordStd(state: WelfordState) {
  return state.n > 1 ? Math.sqrt(state.m2 / (state.n - 1)) : 0;
}

interface BasePathParams {
  PV: number; W?: number; S0?: number; T: number; yD?: number; D?: number;
  incomes?: IncomeStream[]; cpi?: number; P?: number; pcola?: number;
}
interface Rails { upperS?: number; lowerS?: number; upperW?: number; lowerW?: number }

/* ---------- TOTAL-INCOME (pension-aware) engine ---------- */

function runPath_TOTAL(p: BasePathParams, randFactory: RandFactory, rails: Rails | null): PathResult {
  let PV = p.PV, S = p.S0 ?? 0;
  const T = p.T, yD = p.yD || 0, D = p.D || 0, incomes = p.incomes || [], cpi = p.cpi || 0;
  const rand = randFactory();

  let peak = PV, minDD = 0;
  const returnsVar: WelfordState = { n: 0, mean: 0, m2: 0 };

  for (let t = 0; t < T; t++) {
    if (t === yD) PV += D;

    if (rails) {
      const q = probe_TOTAL({ PV, S, T: T - t, incomes, cpi }, randFactory);
      if (q >= UPPER_TRIGGER) S = rails.upperS!;
      else if (q <= LOWER_TRIGGER) S = rails.lowerS!;
    }

    const P_t = incomeAt(t, incomes, cpi);
    const Wt = Math.max(0, S - P_t);

    // A zero portfolio is still successful when guaranteed income fully covers spending.
    // Fail only when the portfolio cannot fund the required withdrawal.
    if (Wt > PV) {
      return { success: false, finalPV: 0, vol: welfordStd(returnsVar), mdd: minDD };
    }
    PV -= Wt;

    const r = genReturn(rand);
    if (PV > 0) PV *= 1 + r;

    welfordAdd(returnsVar, r);
    if (PV > peak) peak = PV;
    const dd = (PV - peak) / peak;
    if (dd < minDD) minDD = dd;
  }
  return { success: true, finalPV: PV, vol: welfordStd(returnsVar), mdd: minDD };
}

function probe_TOTAL(
  params: { PV: number; S: number; T: number; incomes: IncomeStream[]; cpi: number },
  randFactory: RandFactory
): number {
  const K = 220;
  let ok = 0;
  for (let i = 0; i < K; i++) {
    let PV = params.PV;
    const S = params.S, T = params.T, incomes = params.incomes || [], cpi = params.cpi || 0;
    const rand = randFactory();
    let alive = true;
    for (let t = 0; t < T; t++) {
      const P_t = incomeAt(t, incomes, cpi);
      const Wt = Math.max(0, S - P_t);
      if (Wt > PV) { alive = false; break; }
      PV -= Wt;
      if (PV > 0) PV *= 1 + genReturn(rand);
    }
    if (alive) ok++;
  }
  return ok / K;
}

function findPV_TOTAL(base: BasePathParams, S0: number, target: number, randFactory: RandFactory): number {
  const estimate = (pv: number): number => {
    const trial = { ...base, PV: pv, S0 };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_TOTAL(trial, randFactory, null));
    return successRate(res);
  };

  // Guaranteed income may fully cover the spending target even with no portfolio.
  if (estimate(0) >= target) return 0;

  let lo = 0, hi = 5_000_000, best = hi;
  for (let it = 0; it < 22; it++) {
    const mid = Math.floor((lo + hi) / 2);
    const q = estimate(mid);
    if (q >= target) {
      best = mid;
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return best;
}

function findS_TOTAL(currentPV: number, base: BasePathParams, target: number, randFactory: RandFactory): number {
  const S_now = (base.W || 0) + incomeAt(0, base.incomes || [], base.cpi || 0);
  let lo = Math.max(0, S_now * 0.4), hi = Math.max(S_now * 2.0, S_now + 100_000), best = S_now;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    const trial = { ...base, PV: currentPV, S0: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_TOTAL(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (lo = mid) : (hi = mid);
  }
  return best;
}

/* ---------- LEGACY (portfolio-withdrawal W) engine ---------- */

function runPath_LEGACY(p: BasePathParams, randFactory: RandFactory, rails: Rails | null): PathResult {
  let PV = p.PV, W = p.W ?? 0, P = p.P ?? 0;
  const T = p.T, yD = p.yD || 0, D = p.D || 0, pcola = p.pcola || 0;
  const rand = randFactory();

  let peak = PV, minDD = 0;
  const returnsVar: WelfordState = { n: 0, mean: 0, m2: 0 };

  for (let t = 1; t <= T; t++) {
    if (t - 1 === yD) PV += D;

    if (rails) {
      const q = probe_LEGACY({ PV, W, P, T: T - t + 1, pcola }, randFactory);
      if (q >= UPPER_TRIGGER) W = rails.upperW!;
      else if (q <= LOWER_TRIGGER) W = rails.lowerW!;
    }

    PV -= W;
    if (PV <= 0) return { success: false, finalPV: 0, vol: welfordStd(returnsVar), mdd: minDD };

    const r = genReturn(rand);
    PV *= 1 + r;
    P *= 1 + pcola;

    welfordAdd(returnsVar, r);
    if (PV > peak) peak = PV;
    const dd = (PV - peak) / peak;
    if (dd < minDD) minDD = dd;
  }
  return { success: true, finalPV: PV, vol: welfordStd(returnsVar), mdd: minDD };
}

function probe_LEGACY(
  params: { PV: number; W: number; P: number; T: number; pcola: number },
  randFactory: RandFactory
): number {
  const K = 220;
  let ok = 0;
  for (let i = 0; i < K; i++) {
    let PV = params.PV;
    const W = params.W;
    let P = params.P;
    const rand = randFactory();
    let alive = true;
    for (let t = 1; t <= params.T; t++) {
      PV -= W;
      if (PV <= 0) { alive = false; break; }
      PV *= 1 + genReturn(rand);
      P *= 1 + params.pcola;
    }
    if (alive) ok++;
  }
  return ok / K;
}

function findPV_LEGACY(base: BasePathParams, target: number, randFactory: RandFactory): number {
  let lo = 50_000, hi = 5_000_000, best = base.PV;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const trial = { ...base, PV: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_LEGACY(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (hi = mid) : (lo = mid);
  }
  return best;
}

function findW_LEGACY(
  currentPV: number, currentW: number, base: BasePathParams, target: number, randFactory: RandFactory
): number {
  let lo = Math.max(1, currentW * 0.4), hi = Math.max(currentW * 2.0, currentW + 100_000), best = currentW;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    const trial = { ...base, PV: currentPV, W: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_LEGACY(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (lo = mid) : (hi = mid);
  }
  return best;
}

function pvForTargetIncome_TOTAL(
  base: BasePathParams, targetIncome: number, randFactory: RandFactory
): { pv: number; income80: number } {
  let lo = 0, hi = 5_000_000, ans = hi;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const s80 = findS_TOTAL(mid, { ...base }, UPPER_RESET, randFactory);
    if (Math.abs(s80 - targetIncome) <= 500) { ans = mid; break; }
    if (s80 < targetIncome) lo = mid; else hi = mid;
    ans = hi;
  }
  const s80f = findS_TOTAL(ans, { ...base }, UPPER_RESET, randFactory);
  return { pv: Math.round(ans), income80: Math.round(s80f) };
}

function pvForTargetIncome_LEGACY(
  base: BasePathParams, currentW: number, targetIncome: number, randFactory: RandFactory
): { pv: number; income80: number } {
  const P0 = incomeAt(0, base.incomes || [], base.cpi || 0);
  let lo = 50_000, hi = 5_000_000, ans = hi;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const w80 = findW_LEGACY(mid, Math.max(1, currentW), { ...base }, UPPER_RESET, randFactory);
    const s80 = w80 + P0;
    if (Math.abs(s80 - targetIncome) <= 500) { ans = mid; break; }
    if (s80 < targetIncome) lo = mid; else hi = mid;
    ans = hi;
  }
  const w80f = findW_LEGACY(ans, Math.max(1, currentW), { ...base }, UPPER_RESET, randFactory);
  return { pv: Math.round(ans), income80: Math.round(w80f + P0) };
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
  return a[idx];
}

/** Build the engine config from calculator inputs (mirrors buildConfig() in the original). */
function buildConfig(inputs: GuardrailsInputs) {
  const PV0 = inputs.portfolio;
  const r0 = inputs.withdrawRatePct / 100;
  const WA = inputs.withdrawAmount;
  const cpi = inputs.inflation / 100;

  const ageRet = inputs.ageRetire;
  const ageEnd = inputs.ageEnd;
  const ssAge = inputs.ssAge;
  const penAge = inputs.pensionAge;

  const T = Math.max(1, ageEnd - ageRet);
  const ssStart = Math.max(0, ssAge - ageRet);
  const pensionStart = Math.max(0, penAge - ageRet);

  const incomes: IncomeStream[] = [];
  if (inputs.pension > 0) incomes.push({ amt: inputs.pension, start: pensionStart, colaNom: inputs.pensionCola / 100 });
  if (inputs.ss > 0) incomes.push({ amt: inputs.ss, start: ssStart, colaNom: inputs.ssCola / 100 });

  const W0 = inputs.mode === 'tune' ? 0 : inputs.byPercent ? PV0 * r0 : WA;

  return {
    engine: inputs.engine,
    mode: inputs.mode,
    PV0, W0, T, cpi, incomes,
    D: 0, yD: 0,
    N: inputs.numSims,
    seed: inputs.seed,
    applyGuardrails: inputs.applyGuardrails ? 'yes' : 'no',
    raisePct: inputs.raisePct,
  };
}

/**
 * Run the full Guardrails Monte Carlo analysis. This mirrors the `onmessage`
 * router in the original worker script, just called directly instead of
 * via postMessage. It's synchronous and can take a moment for large N —
 * callers should show a loading state around it.
 */
export function calculateGuardrails(inputs: GuardrailsInputs): GuardrailsResults {
  const c = buildConfig(inputs);
  const seedBase = c.seed == null || Number(c.seed) === 0 ? null : Number(c.seed) >>> 0;

  const probeRF = seqFactory(seedBase, 'probe');
  const resRF = seqFactory(seedBase, 'res');

  const base: BasePathParams = {
    PV: c.PV0, W: c.W0, T: c.T, yD: c.yD || 0, D: c.D || 0,
    incomes: c.incomes || [], cpi: c.cpi || 0,
  };

  let startIncome = 0, upperPV = 0, lowerPV = 0, upperIncome = 0, lowerIncome = 0;
  const N = c.N;
  const results: PathResult[] = [];
  let S0 = 0;
  let W0_used = base.W || 0;

  if (c.engine === 'total') {
    S0 = c.mode === 'tune'
      ? findS_TOTAL(c.PV0, base, START_TARGET, probeRF)
      // In manual mode, the entered amount is the household's total annual spending target.
      // Guaranteed income offsets that target instead of increasing it one-for-one.
      : (base.W || 0);
    upperPV = findPV_TOTAL({ ...base }, S0, UPPER_TRIGGER, probeRF);
    lowerPV = findPV_TOTAL({ ...base }, S0, LOWER_TRIGGER, probeRF);
    const upperS = findS_TOTAL(upperPV, { ...base }, UPPER_RESET, probeRF);
    const lowerS = findS_TOTAL(lowerPV, { ...base }, LOWER_RESET, probeRF);
    const rails: Rails | null = c.applyGuardrails === 'yes' ? { upperS, lowerS } : null;
    for (let i = 0; i < N; i++) results.push(runPath_TOTAL({ ...base, S0 }, resRF, rails));

    startIncome = Math.round(S0);
    upperIncome = Math.round(upperS);
    lowerIncome = Math.round(lowerS);
  } else {
    W0_used = c.mode === 'tune'
      ? findW_LEGACY(c.PV0, Math.max(1, base.W || 1), base, START_TARGET, probeRF)
      : base.W || 0;
    upperPV = findPV_LEGACY({ ...base, W: W0_used }, UPPER_TRIGGER, probeRF);
    lowerPV = findPV_LEGACY({ ...base, W: W0_used }, LOWER_TRIGGER, probeRF);
    const upperW = findW_LEGACY(upperPV, W0_used, { ...base }, UPPER_RESET, probeRF);
    const lowerW = findW_LEGACY(lowerPV, W0_used, { ...base }, LOWER_RESET, probeRF);
    const rails: Rails | null = c.applyGuardrails === 'yes' ? { upperW, lowerW } : null;
    const P0_temp = incomeAt(0, base.incomes!, base.cpi!);
    for (let i = 0; i < N; i++) {
      results.push(runPath_LEGACY({ ...base, W: W0_used, P: P0_temp, pcola: 0 }, resRF, rails));
    }
    startIncome = Math.round(W0_used + P0_temp);
    upperIncome = Math.round(upperW + P0_temp);
    lowerIncome = Math.round(lowerW + P0_temp);
  }

  const pNow = c.engine === 'total'
    ? probe_TOTAL({ PV: c.PV0, S: S0, T: base.T, incomes: base.incomes!, cpi: base.cpi! }, probeRF)
    : probe_LEGACY({ PV: c.PV0, W: W0_used, P: incomeAt(0, base.incomes!, base.cpi!), T: base.T, pcola: 0 }, probeRF);

  let raiseNowIncome: number | null = null;
  if (pNow >= UPPER_TRIGGER) {
    if (c.engine === 'total') {
      raiseNowIncome = Math.round(findS_TOTAL(c.PV0, { ...base }, UPPER_RESET, probeRF));
    } else {
      const wNow80 = findW_LEGACY(c.PV0, Math.max(1, W0_used), { ...base }, UPPER_RESET, probeRF);
      raiseNowIncome = Math.round(wNow80 + incomeAt(0, base.incomes!, base.cpi!));
    }
  }

  const raiseFrac = Math.max(0, (c.raisePct || 0) / 100);
  let pvForRaise: number | null = null, incomeAtRaise: number | null = null;
  if (raiseFrac > 0) {
    const targetIncome = startIncome * (1 + raiseFrac);
    if (c.engine === 'total') {
      const out = pvForTargetIncome_TOTAL({ ...base }, targetIncome, probeRF);
      pvForRaise = out.pv; incomeAtRaise = out.income80;
    } else {
      const out = pvForTargetIncome_LEGACY({ ...base }, W0_used, targetIncome, probeRF);
      pvForRaise = out.pv; incomeAtRaise = out.income80;
    }
  }

  const pHat = successRate(results);
  const se = Math.sqrt((pHat * (1 - pHat)) / N);
  const ciL = Math.max(0, pHat - 1.96 * se);
  const ciU = Math.min(1, pHat + 1.96 * se);

  const P0 = incomeAt(0, base.incomes!, base.cpi!);
  const W0_port = Math.max(0, startIncome - P0);
  const impliedWR = c.PV0 > 0 ? W0_port / c.PV0 : 0;

  const upperNote = 'If your current wealth were ' + Math.round(upperPV).toLocaleString() + ' today';
  const lowerNote = 'If your current wealth were ' + Math.round(lowerPV).toLocaleString() + ' today';

  const finals = results.map((r) => r.finalPV ?? 0);
  const mdds = results.map((r) => r.mdd ?? 0);
  const vols = results.map((r) => r.vol ?? 0);

  const telemetry = {
    finalPV: {
      p10: Math.round(percentile(finals, 0.1)),
      p50: Math.round(percentile(finals, 0.5)),
      p90: Math.round(percentile(finals, 0.9)),
    },
    maxDrawdown: {
      p10: +percentile(mdds, 0.1).toFixed(3),
      p50: +percentile(mdds, 0.5).toFixed(3),
      p90: +percentile(mdds, 0.9).toFixed(3),
    },
    pathVol: {
      p10: +percentile(vols, 0.1).toFixed(3),
      p50: +percentile(vols, 0.5).toFixed(3),
      p90: +percentile(vols, 0.9).toFixed(3),
    },
  };

  return {
    pHat, ciL, ciU, startIncome,
    upperPV: Math.round(upperPV), lowerPV: Math.round(lowerPV),
    upperIncome, lowerIncome,
    engine: c.engine as GuardrailsResults['engine'],
    mode: c.mode as GuardrailsResults['mode'],
    P0: Math.round(P0), W0_port: Math.round(W0_port), impliedWR,
    upperNote, lowerNote,
    pNow, raiseNowIncome,
    raiseTargetPct: c.raisePct || 0, pvForRaise, incomeAtRaise,
    UPPER_TRIGGER, LOWER_TRIGGER, UPPER_RESET, LOWER_RESET,
    telemetry,
  };
}

export const GUARDRAILS_DEFAULTS: GuardrailsInputs = {
  engine: 'total',
  mode: 'manual',
  byPercent: true,
  ageNow: 21,
  ageRetire: 65,
  ageEnd: 90,
  ssAge: 67,
  pensionAge: 67,
  portfolio: 100000,
  inflation: 3,
  withdrawRatePct: 3.5,
  withdrawAmount: 3500,
  pension: 0,
  pensionCola: 2.5,
  ss: 0,
  ssCola: 2.5,
  raisePct: 10,
  applyGuardrails: true,
  seed: null,
  numSims: 1000,
};
Library
/
Retirement calculators
/
guardrails-fixed.ts


import { GuardrailsInputs, GuardrailsResults, IncomeStream } from '@/types/guardrails';

/**
 * Ported from the original standalone Guardrails Monte Carlo calculator
 * (glassbridgepath.com/guardrails/). Same market model, same triggers,
 * same binary-search calibration logic as the original — only the
 * language (vanilla JS -> TypeScript) and I/O (DOM -> function args) changed.
 *
 * Do not change these constants without explicit sign-off — they define
 * the product's risk model.
 */
const MU_S = 0.06, SIG_S = 0.18, MU_B = 0.0, SIG_B = 0.06, RHO = 0.1;
const W_S = 0.6, W_B = 0.4;
const START_TARGET = 0.8, UPPER_TRIGGER = 0.99, LOWER_TRIGGER = 0.25,
  UPPER_RESET = 0.8, LOWER_RESET = 0.45;

type RandFn = () => number;
type RandFactory = () => RandFn;

function mulberry32(a: number): RandFn {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: RandFn): number {
  let u = 0, v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function genReturn(rand: RandFn): number {
  const z1 = normal(rand), z2 = normal(rand);
  const sShock = z1, bShock = RHO * z1 + Math.sqrt(1 - RHO * RHO) * z2;
  const stock = Math.exp(MU_S - 0.5 * SIG_S * SIG_S) * Math.exp(SIG_S * sShock) - 1;
  const bond = Math.exp(MU_B - 0.5 * SIG_B * SIG_B) * Math.exp(SIG_B * bShock) - 1;
  return W_S * stock + W_B * bond;
}

function hashTag(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

function seqFactory(seedBase: number | null, tag: string): RandFactory {
  let i = 0;
  if (seedBase === null) {
    return () => Math.random;
  }
  const tagHash = hashTag(tag);
  return () => {
    const seed = ((seedBase ^ tagHash) + i++) >>> 0;
    return mulberry32(seed);
  };
}

interface PathResult {
  success: boolean;
  finalPV: number;
  vol: number;
  mdd: number;
}

function successRate(arr: PathResult[]): number {
  let s = 0;
  for (const r of arr) if (r.success) s++;
  return s / arr.length;
}

function toRealCola(stream: IncomeStream, cpi: number): number {
  return (stream.colaNom || 0) - (cpi || 0);
}

function incomeAt(t: number, incomes: IncomeStream[], cpi: number): number {
  let s = 0;
  for (const inc of incomes || []) {
    if (t >= (inc.start || 0)) {
      const yearsActive = t - (inc.start || 0);
      const colaReal = toRealCola(inc, cpi);
      s += inc.amt * Math.pow(1 + colaReal, yearsActive);
    }
  }
  return s;
}

interface WelfordState { n: number; mean: number; m2: number }
function welfordAdd(state: WelfordState, x: number) {
  state.n++;
  const delta = x - state.mean;
  state.mean += delta / state.n;
  state.m2 += delta * (x - state.mean);
}
function welfordStd(state: WelfordState) {
  return state.n > 1 ? Math.sqrt(state.m2 / (state.n - 1)) : 0;
}

interface BasePathParams {
  PV: number; W?: number; S0?: number; T: number; yD?: number; D?: number;
  incomes?: IncomeStream[]; cpi?: number; P?: number; pcola?: number;
}
interface Rails { upperS?: number; lowerS?: number; upperW?: number; lowerW?: number }

/* ---------- TOTAL-INCOME (pension-aware) engine ---------- */

function runPath_TOTAL(p: BasePathParams, randFactory: RandFactory, rails: Rails | null): PathResult {
  let PV = p.PV, S = p.S0 ?? 0;
  const T = p.T, yD = p.yD || 0, D = p.D || 0, incomes = p.incomes || [], cpi = p.cpi || 0;
  const rand = randFactory();

  let peak = PV, minDD = 0;
  const returnsVar: WelfordState = { n: 0, mean: 0, m2: 0 };

  for (let t = 0; t < T; t++) {
    if (t === yD) PV += D;

    if (rails) {
      const q = probe_TOTAL({ PV, S, T: T - t, incomes, cpi }, randFactory);
      if (q >= UPPER_TRIGGER) S = rails.upperS!;
      else if (q <= LOWER_TRIGGER) S = rails.lowerS!;
    }

    const P_t = incomeAt(t, incomes, cpi);
    const Wt = Math.max(0, S - P_t);

    // A zero portfolio is still successful when guaranteed income fully covers spending.
    // Fail only when the portfolio cannot fund the required withdrawal.
    if (Wt > PV) {
      return { success: false, finalPV: 0, vol: welfordStd(returnsVar), mdd: minDD };
    }
    PV -= Wt;

    const r = genReturn(rand);
    if (PV > 0) PV *= 1 + r;

    welfordAdd(returnsVar, r);
    if (PV > peak) peak = PV;
    const dd = (PV - peak) / peak;
    if (dd < minDD) minDD = dd;
  }
  return { success: true, finalPV: PV, vol: welfordStd(returnsVar), mdd: minDD };
}

function probe_TOTAL(
  params: { PV: number; S: number; T: number; incomes: IncomeStream[]; cpi: number },
  randFactory: RandFactory
): number {
  const K = 220;
  let ok = 0;
  for (let i = 0; i < K; i++) {
    let PV = params.PV;
    const S = params.S, T = params.T, incomes = params.incomes || [], cpi = params.cpi || 0;
    const rand = randFactory();
    let alive = true;
    for (let t = 0; t < T; t++) {
      const P_t = incomeAt(t, incomes, cpi);
      const Wt = Math.max(0, S - P_t);
      if (Wt > PV) { alive = false; break; }
      PV -= Wt;
      if (PV > 0) PV *= 1 + genReturn(rand);
    }
    if (alive) ok++;
  }
  return ok / K;
}

function findPV_TOTAL(base: BasePathParams, S0: number, target: number, randFactory: RandFactory): number {
  const estimate = (pv: number): number => {
    const trial = { ...base, PV: pv, S0 };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_TOTAL(trial, randFactory, null));
    return successRate(res);
  };

  // Guaranteed income may fully cover the spending target even with no portfolio.
  if (estimate(0) >= target) return 0;

  let lo = 0, hi = 5_000_000, best = hi;
  for (let it = 0; it < 22; it++) {
    const mid = Math.floor((lo + hi) / 2);
    const q = estimate(mid);
    if (q >= target) {
      best = mid;
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return best;
}

function findS_TOTAL(currentPV: number, base: BasePathParams, target: number, randFactory: RandFactory): number {
  const S_now = (base.W || 0) + incomeAt(0, base.incomes || [], base.cpi || 0);
  let lo = Math.max(0, S_now * 0.4), hi = Math.max(S_now * 2.0, S_now + 100_000), best = S_now;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    const trial = { ...base, PV: currentPV, S0: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_TOTAL(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (lo = mid) : (hi = mid);
  }
  return best;
}

/* ---------- LEGACY (portfolio-withdrawal W) engine ---------- */

function runPath_LEGACY(p: BasePathParams, randFactory: RandFactory, rails: Rails | null): PathResult {
  let PV = p.PV, W = p.W ?? 0, P = p.P ?? 0;
  const T = p.T, yD = p.yD || 0, D = p.D || 0, pcola = p.pcola || 0;
  const rand = randFactory();

  let peak = PV, minDD = 0;
  const returnsVar: WelfordState = { n: 0, mean: 0, m2: 0 };

  for (let t = 1; t <= T; t++) {
    if (t - 1 === yD) PV += D;

    if (rails) {
      const q = probe_LEGACY({ PV, W, P, T: T - t + 1, pcola }, randFactory);
      if (q >= UPPER_TRIGGER) W = rails.upperW!;
      else if (q <= LOWER_TRIGGER) W = rails.lowerW!;
    }

    PV -= W;
    if (PV <= 0) return { success: false, finalPV: 0, vol: welfordStd(returnsVar), mdd: minDD };

    const r = genReturn(rand);
    PV *= 1 + r;
    P *= 1 + pcola;

    welfordAdd(returnsVar, r);
    if (PV > peak) peak = PV;
    const dd = (PV - peak) / peak;
    if (dd < minDD) minDD = dd;
  }
  return { success: true, finalPV: PV, vol: welfordStd(returnsVar), mdd: minDD };
}

function probe_LEGACY(
  params: { PV: number; W: number; P: number; T: number; pcola: number },
  randFactory: RandFactory
): number {
  const K = 220;
  let ok = 0;
  for (let i = 0; i < K; i++) {
    let PV = params.PV;
    const W = params.W;
    let P = params.P;
    const rand = randFactory();
    let alive = true;
    for (let t = 1; t <= params.T; t++) {
      PV -= W;
      if (PV <= 0) { alive = false; break; }
      PV *= 1 + genReturn(rand);
      P *= 1 + params.pcola;
    }
    if (alive) ok++;
  }
  return ok / K;
}

function findPV_LEGACY(base: BasePathParams, target: number, randFactory: RandFactory): number {
  let lo = 50_000, hi = 5_000_000, best = base.PV;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const trial = { ...base, PV: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_LEGACY(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (hi = mid) : (lo = mid);
  }
  return best;
}

function findW_LEGACY(
  currentPV: number, currentW: number, base: BasePathParams, target: number, randFactory: RandFactory
): number {
  let lo = Math.max(1, currentW * 0.4), hi = Math.max(currentW * 2.0, currentW + 100_000), best = currentW;
  for (let it = 0; it < 18; it++) {
    const mid = (lo + hi) / 2;
    const trial = { ...base, PV: currentPV, W: mid };
    const res: PathResult[] = [];
    for (let i = 0; i < 300; i++) res.push(runPath_LEGACY(trial, randFactory, null));
    const q = successRate(res);
    best = mid;
    if (Math.abs(q - target) < 0.02) return mid;
    q > target ? (lo = mid) : (hi = mid);
  }
  return best;
}

function pvForTargetIncome_TOTAL(
  base: BasePathParams, targetIncome: number, randFactory: RandFactory
): { pv: number; income80: number } {
  let lo = 0, hi = 5_000_000, ans = hi;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const s80 = findS_TOTAL(mid, { ...base }, UPPER_RESET, randFactory);
    if (Math.abs(s80 - targetIncome) <= 500) { ans = mid; break; }
    if (s80 < targetIncome) lo = mid; else hi = mid;
    ans = hi;
  }
  const s80f = findS_TOTAL(ans, { ...base }, UPPER_RESET, randFactory);
  return { pv: Math.round(ans), income80: Math.round(s80f) };
}

function pvForTargetIncome_LEGACY(
  base: BasePathParams, currentW: number, targetIncome: number, randFactory: RandFactory
): { pv: number; income80: number } {
  const P0 = incomeAt(0, base.incomes || [], base.cpi || 0);
  let lo = 50_000, hi = 5_000_000, ans = hi;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) >> 1;
    const w80 = findW_LEGACY(mid, Math.max(1, currentW), { ...base }, UPPER_RESET, randFactory);
    const s80 = w80 + P0;
    if (Math.abs(s80 - targetIncome) <= 500) { ans = mid; break; }
    if (s80 < targetIncome) lo = mid; else hi = mid;
    ans = hi;
  }
  const w80f = findW_LEGACY(ans, Math.max(1, currentW), { ...base }, UPPER_RESET, randFactory);
  return { pv: Math.round(ans), income80: Math.round(w80f + P0) };
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
  return a[idx];
}

/** Build the engine config from calculator inputs (mirrors buildConfig() in the original). */
function buildConfig(inputs: GuardrailsInputs) {
  const PV0 = inputs.portfolio;
  const r0 = inputs.withdrawRatePct / 100;
  const WA = inputs.withdrawAmount;
  const cpi = inputs.inflation / 100;

  const ageRet = inputs.ageRetire;
  const ageEnd = inputs.ageEnd;
  const ssAge = inputs.ssAge;
  const penAge = inputs.pensionAge;

  const T = Math.max(1, ageEnd - ageRet);
  const ssStart = Math.max(0, ssAge - ageRet);
  const pensionStart = Math.max(0, penAge - ageRet);

  const incomes: IncomeStream[] = [];
  if (inputs.pension > 0) incomes.push({ amt: inputs.pension, start: pensionStart, colaNom: inputs.pensionCola / 100 });
  if (inputs.ss > 0) incomes.push({ amt: inputs.ss, start: ssStart, colaNom: inputs.ssCola / 100 });

  const W0 = inputs.mode === 'tune' ? 0 : inputs.byPercent ? PV0 * r0 : WA;

  return {
    engine: inputs.engine,
    mode: inputs.mode,
    PV0, W0, T, cpi, incomes,
    D: 0, yD: 0,
    N: inputs.numSims,
    seed: inputs.seed,
    applyGuardrails: inputs.applyGuardrails ? 'yes' : 'no',
    raisePct: inputs.raisePct,
  };
}

/**
 * Run the full Guardrails Monte Carlo analysis. This mirrors the `onmessage`
 * router in the original worker script, just called directly instead of
 * via postMessage. It's synchronous and can take a moment for large N —
 * callers should show a loading state around it.
 */
export function calculateGuardrails(inputs: GuardrailsInputs): GuardrailsResults {
  const c = buildConfig(inputs);
  const seedBase = c.seed == null || Number(c.seed) === 0 ? null : Number(c.seed) >>> 0;

  const probeRF = seqFactory(seedBase, 'probe');
  const resRF = seqFactory(seedBase, 'res');

  const base: BasePathParams = {
    PV: c.PV0, W: c.W0, T: c.T, yD: c.yD || 0, D: c.D || 0,
    incomes: c.incomes || [], cpi: c.cpi || 0,
  };

  let startIncome = 0, upperPV = 0, lowerPV = 0, upperIncome = 0, lowerIncome = 0;
  const N = c.N;
  const results: PathResult[] = [];
  let S0 = 0;
  let W0_used = base.W || 0;

  if (c.engine === 'total') {
    S0 = c.mode === 'tune'
      ? findS_TOTAL(c.PV0, base, START_TARGET, probeRF)
      // In manual mode, the entered amount is the household's total annual spending target.
      // Guaranteed income offsets that target instead of increasing it one-for-one.
      : (base.W || 0);
    upperPV = findPV_TOTAL({ ...base }, S0, UPPER_TRIGGER, probeRF);
    lowerPV = findPV_TOTAL({ ...base }, S0, LOWER_TRIGGER, probeRF);
    const upperS = findS_TOTAL(upperPV, { ...base }, UPPER_RESET, probeRF);
    const lowerS = findS_TOTAL(lowerPV, { ...base }, LOWER_RESET, probeRF);
    const rails: Rails | null = c.applyGuardrails === 'yes' ? { upperS, lowerS } : null;
    for (let i = 0; i < N; i++) results.push(runPath_TOTAL({ ...base, S0 }, resRF, rails));

    startIncome = Math.round(S0);
    upperIncome = Math.round(upperS);
    lowerIncome = Math.round(lowerS);
  } else {
    W0_used = c.mode === 'tune'
      ? findW_LEGACY(c.PV0, Math.max(1, base.W || 1), base, START_TARGET, probeRF)
      : base.W || 0;
    upperPV = findPV_LEGACY({ ...base, W: W0_used }, UPPER_TRIGGER, probeRF);
    lowerPV = findPV_LEGACY({ ...base, W: W0_used }, LOWER_TRIGGER, probeRF);
    const upperW = findW_LEGACY(upperPV, W0_used, { ...base }, UPPER_RESET, probeRF);
    const lowerW = findW_LEGACY(lowerPV, W0_used, { ...base }, LOWER_RESET, probeRF);
    const rails: Rails | null = c.applyGuardrails === 'yes' ? { upperW, lowerW } : null;
    const P0_temp = incomeAt(0, base.incomes!, base.cpi!);
    for (let i = 0; i < N; i++) {
      results.push(runPath_LEGACY({ ...base, W: W0_used, P: P0_temp, pcola: 0 }, resRF, rails));
    }
    startIncome = Math.round(W0_used + P0_temp);
    upperIncome = Math.round(upperW + P0_temp);
    lowerIncome = Math.round(lowerW + P0_temp);
  }

  const pNow = c.engine === 'total'
    ? probe_TOTAL({ PV: c.PV0, S: S0, T: base.T, incomes: base.incomes!, cpi: base.cpi! }, probeRF)
    : probe_LEGACY({ PV: c.PV0, W: W0_used, P: incomeAt(0, base.incomes!, base.cpi!), T: base.T, pcola: 0 }, probeRF);

  let raiseNowIncome: number | null = null;
  if (pNow >= UPPER_TRIGGER) {
    if (c.engine === 'total') {
      raiseNowIncome = Math.round(findS_TOTAL(c.PV0, { ...base }, UPPER_RESET, probeRF));
    } else {
      const wNow80 = findW_LEGACY(c.PV0, Math.max(1, W0_used), { ...base }, UPPER_RESET, probeRF);
      raiseNowIncome = Math.round(wNow80 + incomeAt(0, base.incomes!, base.cpi!));
    }
  }

  const raiseFrac = Math.max(0, (c.raisePct || 0) / 100);
  let pvForRaise: number | null = null, incomeAtRaise: number | null = null;
  if (raiseFrac > 0) {
    const targetIncome = startIncome * (1 + raiseFrac);
    if (c.engine === 'total') {
      const out = pvForTargetIncome_TOTAL({ ...base }, targetIncome, probeRF);
      pvForRaise = out.pv; incomeAtRaise = out.income80;
    } else {
      const out = pvForTargetIncome_LEGACY({ ...base }, W0_used, targetIncome, probeRF);
      pvForRaise = out.pv; incomeAtRaise = out.income80;
    }
  }

  const pHat = successRate(results);
  const se = Math.sqrt((pHat * (1 - pHat)) / N);
  const ciL = Math.max(0, pHat - 1.96 * se);
  const ciU = Math.min(1, pHat + 1.96 * se);

  const P0 = incomeAt(0, base.incomes!, base.cpi!);
  const W0_port = Math.max(0, startIncome - P0);
  const impliedWR = c.PV0 > 0 ? W0_port / c.PV0 : 0;

  const upperNote = 'If your current wealth were ' + Math.round(upperPV).toLocaleString() + ' today';
  const lowerNote = 'If your current wealth were ' + Math.round(lowerPV).toLocaleString() + ' today';

  const finals = results.map((r) => r.finalPV ?? 0);
  const mdds = results.map((r) => r.mdd ?? 0);
  const vols = results.map((r) => r.vol ?? 0);

  const telemetry = {
    finalPV: {
      p10: Math.round(percentile(finals, 0.1)),
      p50: Math.round(percentile(finals, 0.5)),
      p90: Math.round(percentile(finals, 0.9)),
    },
    maxDrawdown: {
      p10: +percentile(mdds, 0.1).toFixed(3),
      p50: +percentile(mdds, 0.5).toFixed(3),
      p90: +percentile(mdds, 0.9).toFixed(3),
    },
    pathVol: {
      p10: +percentile(vols, 0.1).toFixed(3),
      p50: +percentile(vols, 0.5).toFixed(3),
      p90: +percentile(vols, 0.9).toFixed(3),
    },
  };

  return {
    pHat, ciL, ciU, startIncome,
    upperPV: Math.round(upperPV), lowerPV: Math.round(lowerPV),
    upperIncome, lowerIncome,
    engine: c.engine as GuardrailsResults['engine'],
    mode: c.mode as GuardrailsResults['mode'],
    P0: Math.round(P0), W0_port: Math.round(W0_port), impliedWR,
    upperNote, lowerNote,
    pNow, raiseNowIncome,
    raiseTargetPct: c.raisePct || 0, pvForRaise, incomeAtRaise,
    UPPER_TRIGGER, LOWER_TRIGGER, UPPER_RESET, LOWER_RESET,
    telemetry,
  };
}

export const GUARDRAILS_DEFAULTS: GuardrailsInputs = {
  engine: 'total',
  mode: 'manual',
  byPercent: true,
  ageNow: 21,
  ageRetire: 65,
  ageEnd: 90,
  ssAge: 67,
  pensionAge: 67,
  portfolio: 100000,
  inflation: 3,
  withdrawRatePct: 3.5,
  withdrawAmount: 3500,
  pension: 0,
  pensionCola: 2.5,
  ss: 0,
  ssCola: 2.5,
  raisePct: 10,
  applyGuardrails: true,
  seed: null,
  numSims: 1000,
};
