![Guided Review](apps/extension/public/logomark.png)

# Guided Review

**AI-structured review plans for GitHub pull requests**

## Monorepo

This repository is an **npm workspaces** monorepo:

| Path             | Package                    | Description                              |
| ---------------- | -------------------------- | ---------------------------------------- |
| `apps/extension` | `@guided-review/extension` | Chrome Manifest V3 extension             |
| `apps/web`       | `@guided-review/web`       | Marketing site (Next.js App Router)      |
| `packages/ui`    | `@guided-review/ui`        | Shared design tokens & presentational UI |

### Commands

```bash
npm install                 # install all workspaces
npm run dev                 # extension HMR on :5173
npm run dev:web             # marketing site on :3000
npm run build               # extension + web
npm run build:extension     # → apps/extension/dist
npm run build:web           # next build
npm test                    # unit tests (extension + ui)
npm run test:e2e            # Playwright e2e (builds extension first)
npm run typecheck           # all workspaces
npm run lint                # ESLint
npm run format              # Prettier write
npm run format:check        # Prettier check
```

### GitHub OAuth (device flow)

Copy `.env.example` to `.env` at the **monorepo root** and set `VITE_GITHUB_CLIENT_ID` to your
GitHub OAuth App client ID (Device Flow enabled). The extension Vite build loads env from the
repo root, then inlines the value at build time — rebuild after changing it:

```bash
cp .env.example .env   # then edit VITE_GITHUB_CLIENT_ID
npm run build:extension
```

### Chrome load path

**Load unpacked → `apps/extension/dist`** (not a root-level `dist/`).

After the monorepo move, remove any old root `dist/` entry from `chrome://extensions` and load
`apps/extension/dist` instead. Always run `npm run build:extension` before reloading the extension.

### Ports

| Service                  | Port |
| ------------------------ | ---- |
| Extension Vite / crx HMR | 5173 |
| Marketing Next.js        | 3000 |

### Marketing site deploy (Cloudflare Pages)

The marketing site (`apps/web`) is a static export deployed to **Cloudflare
Pages** by `.github/workflows/deploy.yml` after **Lint and test** succeeds when
the web app or shared UI package changes (`wrangler pages deploy` →
`*.pages.dev`).

Set these GitHub Actions secrets before the first deploy:

- `CLOUDFLARE_API_TOKEN` — token with **Cloudflare Pages:Edit**
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

Pages project name defaults to `guidedreview` (edit the workflow / package
scripts if yours differs).

See [`apps/web/README.md`](apps/web/README.md) for full hosting notes.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
