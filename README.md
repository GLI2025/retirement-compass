# Retirement Compass

Retirement Compass is a React and TypeScript application for exploring retirement savings, income timing, withdrawal approaches, and related planning tools. It is educational only and does not provide financial, tax, or investment advice.

## Technology

- React 18
- TypeScript
- Vite
- Tailwind CSS and shadcn/ui components
- Recharts

## Local development

Install the dependencies recorded in the lockfile, then run the checks used for a change:

```bash
npm ci
npm test
npm run build
```

To start the local development server:

```bash
npm run dev
```

## Change and deployment workflow

GitHub is the source of truth and `main` is protected.

1. Start a feature branch from the latest `main`.
2. Keep the change focused and review the diff.
3. Run the relevant tests and the production build.
4. Push the feature branch and open a pull request targeting `main`.
5. Review the Cloudflare preview, including affected calculator paths and mobile layouts.
6. Merge only after the preview and pull-request checks are approved.

Cloudflare automatically deploys the production site when a pull request is merged into GitHub `main`.

## Project structure

- `src/` contains the application, calculator UI, and calculation modules.
- `public/` contains static assets served by Vite.
- `supabase/` contains the existing Supabase configuration and functions.

See [HANDOFF.md](./HANDOFF.md) for project-specific operating notes before making a change.
