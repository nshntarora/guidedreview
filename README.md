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

### Chrome load path

**Load unpacked → `apps/extension/dist`** (not a root-level `dist/`).

After the monorepo move, remove any old root `dist/` entry from `chrome://extensions` and load
`apps/extension/dist` instead. Always run `npm run build:extension` before reloading the extension.

### Ports

| Service                  | Port |
| ------------------------ | ---- |
| Extension Vite / crx HMR | 5173 |
| Marketing Next.js        | 3000 |
