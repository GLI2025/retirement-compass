
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
GuardrailsCalculator-fixed.tsx


import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { GuardrailsInputs, GuardrailsResults } from '@/types/guardrails';
import { GUARDRAILS_DEFAULTS, calculateGuardrails } from '@/lib/calculations/guardrails';
import { StepInput } from '../calculator/StepInput';

const money = (n: number) => '$' + Math.round(n).toLocaleString();
const pct0 = (n: number) => (n * 100).toFixed(0) + '%';

function band(p: number): { cls: string; label: string } {
  if (p >= 0.85) return { cls: 'text-emerald-600', label: 'On Track' };
  if (p >= 0.7) return { cls: 'text-amber-600', label: 'Watch List' };
  if (p >= 0.55) return { cls: 'text-red-600', label: 'Needs Attention' };
  return { cls: 'text-red-600', label: 'High Risk' };
}

export function GuardrailsCalculator() {
  const [inputs, setInputs] = useState<GuardrailsInputs>(GUARDRAILS_DEFAULTS);
  const [results, setResults] = useState<GuardrailsResults | null>(null);
  const [running, setRunning] = useState(false);

  const updateInput = <K extends keyof GuardrailsInputs>(key: K, value: GuardrailsInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const runSimulation = () => {
    setRunning(true);
    // Let the UI paint the loading state before the (synchronous) crunch runs.
    setTimeout(() => {
      const r = calculateGuardrails(inputs);
      setResults(r);
      setRunning(false);
    }, 30);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Flexible Spending, Modeled With Monte Carlo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Guardrails</span>
            <br />
            <span className="text-foreground">Retirement Calculator</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Instead of a fixed withdrawal, guardrails let your spending flex within a safe
            range based on how markets actually perform. This tool estimates your odds of
            success and shows when you could take a raise or should consider a cut.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 space-y-8">
        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Engine</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
              <input
                type="radio"
                checked={inputs.engine === 'total'}
                onChange={() => updateInput('engine', 'total')}
              />
              <span className="text-sm">
                <strong>Total income</strong>
                <br />
                <span className="text-muted-foreground">pension + Social Security</span>
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
              <input
                type="radio"
                checked={inputs.engine === 'legacy'}
                onChange={() => updateInput('engine', 'legacy')}
              />
              <span className="text-sm">
                <strong>Legacy</strong>
                <br />
                <span className="text-muted-foreground">portfolio withdrawals only</span>
              </span>
            </label>
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Ages</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Your Age (now)" value={inputs.ageNow} onChange={(v) => updateInput('ageNow', v)} min={18} max={95} step={1} />
            <StepInput label="Planned Retirement Age" value={inputs.ageRetire} onChange={(v) => updateInput('ageRetire', v)} min={30} max={95} step={1} />
            <StepInput label="SS Claim Age" value={inputs.ssAge} onChange={(v) => updateInput('ssAge', v)} min={60} max={70} step={1} />
            <StepInput label="Pension Start Age" value={inputs.pensionAge} onChange={(v) => updateInput('pensionAge', v)} min={21} max={80} step={1} />
            <StepInput label="Run Calculator Until Age" value={inputs.ageEnd} onChange={(v) => updateInput('ageEnd', v)} min={60} max={110} step={1} />
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Portfolio &amp; {inputs.engine === 'total' ? 'Spending Target' : 'Withdrawals'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Initial Portfolio" value={inputs.portfolio} onChange={(v) => updateInput('portfolio', v)} min={0} step={10000} prefix="$" />
            <StepInput label="CPI (% nominal)" value={inputs.inflation} onChange={(v) => updateInput('inflation', v)} min={0} max={6} step={0.5} suffix="%" />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={inputs.mode === 'tune'} onChange={() => updateInput('mode', 'tune')} />
              Tune to ~80% success
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={inputs.mode === 'manual' && inputs.byPercent}
                onChange={() => { updateInput('mode', 'manual'); updateInput('byPercent', true); }}
              />
              {inputs.engine === 'total' ? 'Manual spending by %' : 'Manual by %'}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={inputs.mode === 'manual' && !inputs.byPercent}
                onChange={() => { updateInput('mode', 'manual'); updateInput('byPercent', false); }}
              />
              {inputs.engine === 'total' ? 'Manual spending by $' : 'Manual by $'}
            </label>
          </div>

          {inputs.mode === 'manual' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {inputs.byPercent ? (
                <StepInput
                  label={inputs.engine === 'total' ? 'Annual Spending Target (% of portfolio)' : 'Initial Withdrawal Rate'}
                  value={inputs.withdrawRatePct}
                  onChange={(v) => updateInput('withdrawRatePct', v)}
                  min={0} max={12} step={0.1} suffix="%"
                />
              ) : (
                <StepInput
                  label={inputs.engine === 'total' ? 'Annual Spending Target' : 'Starting Portfolio Withdrawal'}
                  value={inputs.withdrawAmount}
                  onChange={(v) => updateInput('withdrawAmount', v)}
                  min={0} step={500} prefix="$"
                />
              )}
            </div>
          )}
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Guaranteed Income</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Annual Pension" value={inputs.pension} onChange={(v) => updateInput('pension', v)} min={0} step={1000} prefix="$" />
            <StepInput label="Pension COLA" value={inputs.pensionCola} onChange={(v) => updateInput('pensionCola', v)} min={0} max={6} step={0.5} suffix="%" />
            <StepInput label="Social Security" value={inputs.ss} onChange={(v) => updateInput('ss', v)} min={0} step={500} prefix="$" />
            <StepInput label="SS COLA" value={inputs.ssCola} onChange={(v) => updateInput('ssCola', v)} min={0} max={6} step={0.5} suffix="%" />
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Guardrails</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Raise Income Target" value={inputs.raisePct} onChange={(v) => updateInput('raisePct', v)} min={1} max={100} step={1} suffix="%" />
            <StepInput label="Monte Carlo Paths" value={inputs.numSims} onChange={(v) => updateInput('numSims', v)} min={200} max={5000} step={100} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inputs.applyGuardrails}
              onChange={(e) => updateInput('applyGuardrails', e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Apply guardrails during simulation (raise near 99% success, cut near 25%)</span>
          </label>
        </section>

        <div className="flex justify-center">
          <button
            onClick={runSimulation}
            disabled={running}
            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary/70 hover:brightness-105 transition disabled:opacity-60 flex items-center gap-2"
          >
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
            {running ? 'Running Monte Carlo…' : 'Run Monte Carlo'}
          </button>
        </div>

        {results && (
          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="text-muted-foreground">Engine</div>
              <div className="font-medium">
                {results.engine === 'total' ? 'Total income (pension + Social Security)' : 'Legacy (portfolio withdrawal)'}
              </div>

              <div className="text-muted-foreground">Spending stability</div>
              <div className={`font-semibold ${band(results.pHat).cls}`}>
                {results.pHat >= 0.99 ? '≥99%' : pct0(results.pHat)} — {band(results.pHat).label}
                {results.pHat < 0.99 && (
                  <span className="text-muted-foreground font-normal"> (likely {pct0(results.ciL)}–{pct0(results.ciU)})</span>
                )}
              </div>

              <div className="text-muted-foreground">{results.engine === 'total' ? 'Starting spending target' : 'Starting income'}</div>
              <div className="font-medium">{money(results.startIncome)}/yr</div>

              {results.raiseNowIncome != null && (
                <>
                  <div className="text-muted-foreground">Eligible raise now</div>
                  <div className="font-medium text-emerald-600">{money(results.raiseNowIncome)}/yr</div>
                </>
              )}

              <div className="text-muted-foreground">Year-0 breakdown</div>
              <div className="font-medium">
                Portfolio {money(results.W0_port)} ({(results.impliedWR * 100).toFixed(2)}%) + Guaranteed {money(results.P0)}
              </div>

              {results.pvForRaise != null && (
                <>
                  <div className="text-muted-foreground">Modest raise (+{results.raiseTargetPct}% target)</div>
                  <div className="font-medium">{money(results.pvForRaise)} portfolio needed</div>
                </>
              )}

              {results.W0_port === 0 ? (
                <>
                  <div className="text-muted-foreground">Portfolio guardrail</div>
                  <div className="font-medium text-emerald-600">
                    Guaranteed income fully covers the starting spending target, so no portfolio cut threshold applies today.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-muted-foreground">Cut threshold (≈25% today)</div>
                  <div className="font-medium text-amber-600">
                    {money(results.lowerPV)} — {results.lowerNote}, cut to ~{money(results.lowerIncome)}/yr
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <p className="mb-2">
            <strong>Educational purposes only.</strong> No calculator can guarantee outcomes.
            Markets, inflation, taxes, fees, and your spending can change. Treat these results
            as decision support, not a promise.
          </p>
          <p>Consult a qualified financial advisor before making retirement spending decisions.</p>
        </footer>
      </main>
    </div>
  );
}
Library
/
Retirement calculators
/
GuardrailsCalculator-fixed.tsx


import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { GuardrailsInputs, GuardrailsResults } from '@/types/guardrails';
import { GUARDRAILS_DEFAULTS, calculateGuardrails } from '@/lib/calculations/guardrails';
import { StepInput } from '../calculator/StepInput';

const money = (n: number) => '$' + Math.round(n).toLocaleString();
const pct0 = (n: number) => (n * 100).toFixed(0) + '%';

function band(p: number): { cls: string; label: string } {
  if (p >= 0.85) return { cls: 'text-emerald-600', label: 'On Track' };
  if (p >= 0.7) return { cls: 'text-amber-600', label: 'Watch List' };
  if (p >= 0.55) return { cls: 'text-red-600', label: 'Needs Attention' };
  return { cls: 'text-red-600', label: 'High Risk' };
}

export function GuardrailsCalculator() {
  const [inputs, setInputs] = useState<GuardrailsInputs>(GUARDRAILS_DEFAULTS);
  const [results, setResults] = useState<GuardrailsResults | null>(null);
  const [running, setRunning] = useState(false);

  const updateInput = <K extends keyof GuardrailsInputs>(key: K, value: GuardrailsInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const runSimulation = () => {
    setRunning(true);
    // Let the UI paint the loading state before the (synchronous) crunch runs.
    setTimeout(() => {
      const r = calculateGuardrails(inputs);
      setResults(r);
      setRunning(false);
    }, 30);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="py-8 sm:py-12 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Flexible Spending, Modeled With Monte Carlo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Guardrails</span>
            <br />
            <span className="text-foreground">Retirement Calculator</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Instead of a fixed withdrawal, guardrails let your spending flex within a safe
            range based on how markets actually perform. This tool estimates your odds of
            success and shows when you could take a raise or should consider a cut.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 space-y-8">
        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Engine</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
              <input
                type="radio"
                checked={inputs.engine === 'total'}
                onChange={() => updateInput('engine', 'total')}
              />
              <span className="text-sm">
                <strong>Total income</strong>
                <br />
                <span className="text-muted-foreground">pension + Social Security</span>
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer">
              <input
                type="radio"
                checked={inputs.engine === 'legacy'}
                onChange={() => updateInput('engine', 'legacy')}
              />
              <span className="text-sm">
                <strong>Legacy</strong>
                <br />
                <span className="text-muted-foreground">portfolio withdrawals only</span>
              </span>
            </label>
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Ages</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Your Age (now)" value={inputs.ageNow} onChange={(v) => updateInput('ageNow', v)} min={18} max={95} step={1} />
            <StepInput label="Planned Retirement Age" value={inputs.ageRetire} onChange={(v) => updateInput('ageRetire', v)} min={30} max={95} step={1} />
            <StepInput label="SS Claim Age" value={inputs.ssAge} onChange={(v) => updateInput('ssAge', v)} min={60} max={70} step={1} />
            <StepInput label="Pension Start Age" value={inputs.pensionAge} onChange={(v) => updateInput('pensionAge', v)} min={21} max={80} step={1} />
            <StepInput label="Run Calculator Until Age" value={inputs.ageEnd} onChange={(v) => updateInput('ageEnd', v)} min={60} max={110} step={1} />
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Portfolio &amp; {inputs.engine === 'total' ? 'Spending Target' : 'Withdrawals'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Initial Portfolio" value={inputs.portfolio} onChange={(v) => updateInput('portfolio', v)} min={0} step={10000} prefix="$" />
            <StepInput label="CPI (% nominal)" value={inputs.inflation} onChange={(v) => updateInput('inflation', v)} min={0} max={6} step={0.5} suffix="%" />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={inputs.mode === 'tune'} onChange={() => updateInput('mode', 'tune')} />
              Tune to ~80% success
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={inputs.mode === 'manual' && inputs.byPercent}
                onChange={() => { updateInput('mode', 'manual'); updateInput('byPercent', true); }}
              />
              {inputs.engine === 'total' ? 'Manual spending by %' : 'Manual by %'}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={inputs.mode === 'manual' && !inputs.byPercent}
                onChange={() => { updateInput('mode', 'manual'); updateInput('byPercent', false); }}
              />
              {inputs.engine === 'total' ? 'Manual spending by $' : 'Manual by $'}
            </label>
          </div>

          {inputs.mode === 'manual' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {inputs.byPercent ? (
                <StepInput
                  label={inputs.engine === 'total' ? 'Annual Spending Target (% of portfolio)' : 'Initial Withdrawal Rate'}
                  value={inputs.withdrawRatePct}
                  onChange={(v) => updateInput('withdrawRatePct', v)}
                  min={0} max={12} step={0.1} suffix="%"
                />
              ) : (
                <StepInput
                  label={inputs.engine === 'total' ? 'Annual Spending Target' : 'Starting Portfolio Withdrawal'}
                  value={inputs.withdrawAmount}
                  onChange={(v) => updateInput('withdrawAmount', v)}
                  min={0} step={500} prefix="$"
                />
              )}
            </div>
          )}
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Guaranteed Income</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Annual Pension" value={inputs.pension} onChange={(v) => updateInput('pension', v)} min={0} step={1000} prefix="$" />
            <StepInput label="Pension COLA" value={inputs.pensionCola} onChange={(v) => updateInput('pensionCola', v)} min={0} max={6} step={0.5} suffix="%" />
            <StepInput label="Social Security" value={inputs.ss} onChange={(v) => updateInput('ss', v)} min={0} step={500} prefix="$" />
            <StepInput label="SS COLA" value={inputs.ssCola} onChange={(v) => updateInput('ssCola', v)} min={0} max={6} step={0.5} suffix="%" />
          </div>
        </section>

        <section className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Guardrails</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StepInput label="Raise Income Target" value={inputs.raisePct} onChange={(v) => updateInput('raisePct', v)} min={1} max={100} step={1} suffix="%" />
            <StepInput label="Monte Carlo Paths" value={inputs.numSims} onChange={(v) => updateInput('numSims', v)} min={200} max={5000} step={100} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inputs.applyGuardrails}
              onChange={(e) => updateInput('applyGuardrails', e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Apply guardrails during simulation (raise near 99% success, cut near 25%)</span>
          </label>
        </section>

        <div className="flex justify-center">
          <button
            onClick={runSimulation}
            disabled={running}
            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary/70 hover:brightness-105 transition disabled:opacity-60 flex items-center gap-2"
          >
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
            {running ? 'Running Monte Carlo…' : 'Run Monte Carlo'}
          </button>
        </div>

        {results && (
          <section className="glass-card p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="text-muted-foreground">Engine</div>
              <div className="font-medium">
                {results.engine === 'total' ? 'Total income (pension + Social Security)' : 'Legacy (portfolio withdrawal)'}
              </div>

              <div className="text-muted-foreground">Spending stability</div>
              <div className={`font-semibold ${band(results.pHat).cls}`}>
                {results.pHat >= 0.99 ? '≥99%' : pct0(results.pHat)} — {band(results.pHat).label}
                {results.pHat < 0.99 && (
                  <span className="text-muted-foreground font-normal"> (likely {pct0(results.ciL)}–{pct0(results.ciU)})</span>
                )}
              </div>

              <div className="text-muted-foreground">{results.engine === 'total' ? 'Starting spending target' : 'Starting income'}</div>
              <div className="font-medium">{money(results.startIncome)}/yr</div>

              {results.raiseNowIncome != null && (
                <>
                  <div className="text-muted-foreground">Eligible raise now</div>
                  <div className="font-medium text-emerald-600">{money(results.raiseNowIncome)}/yr</div>
                </>
              )}

              <div className="text-muted-foreground">Year-0 breakdown</div>
              <div className="font-medium">
                Portfolio {money(results.W0_port)} ({(results.impliedWR * 100).toFixed(2)}%) + Guaranteed {money(results.P0)}
              </div>

              {results.pvForRaise != null && (
                <>
                  <div className="text-muted-foreground">Modest raise (+{results.raiseTargetPct}% target)</div>
                  <div className="font-medium">{money(results.pvForRaise)} portfolio needed</div>
                </>
              )}

              {results.W0_port === 0 ? (
                <>
                  <div className="text-muted-foreground">Portfolio guardrail</div>
                  <div className="font-medium text-emerald-600">
                    Guaranteed income fully covers the starting spending target, so no portfolio cut threshold applies today.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-muted-foreground">Cut threshold (≈25% today)</div>
                  <div className="font-medium text-amber-600">
                    {money(results.lowerPV)} — {results.lowerNote}, cut to ~{money(results.lowerIncome)}/yr
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <p className="mb-2">
            <strong>Educational purposes only.</strong> No calculator can guarantee outcomes.
            Markets, inflation, taxes, fees, and your spending can change. Treat these results
            as decision support, not a promise.
          </p>
          <p>Consult a qualified financial advisor before making retirement spending decisions.</p>
        </footer>
      </main>
    </div>
  );
}
