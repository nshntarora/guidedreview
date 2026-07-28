![Guided Review](packages/ui/src/assets/icons/icon48.png)

# Guided Review

**A better way for humans to review AI-generated code.**

Guided Review is a free, open-source Chrome extension for GitHub pull requests. It clusters related changes into ordered **review units**, adds short summaries, and gives you a keyboard-first overlay so you can walk the PR schema-first, then logic, then call-sites, then tests — instead of drowning in an alphabetical file dump.

AI helps structure the review. **You still read the code and have the final say.**

- **Bring your own LLM key** — Anthropic, OpenAI, or Grok (xAI). No Guided Review backend.
- **No servers of ours** — the extension talks to GitHub and your AI provider only.
- **Free · Open source** — fork it, audit it, keep it.

|                      |                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Website**          | [guidedreview.dev](https://guidedreview.dev)                                                       |
| **Docs**             | [guidedreview.dev/docs](https://guidedreview.dev/docs)                                             |
| **Chrome Web Store** | [Install Guided Review](https://chromewebstore.google.com/detail/pdnnimoajmnjpccboemeomoeomancodd) |
| **License**          | [Apache-2.0](LICENSE)                                                                              |

---

## Repository layout

This is an **npm workspaces** monorepo.

| Path                               | Package                    | Description                                           |
| ---------------------------------- | -------------------------- | ----------------------------------------------------- |
| [`apps/extension`](apps/extension) | `@guided-review/extension` | Chrome Manifest V3 extension (the product)            |
| [`apps/web`](apps/web)             | `@guided-review/web`       | Marketing site & product docs (Next.js)               |
| [`packages/ui`](packages/ui)       | `@guided-review/ui`        | Shared design tokens, brand assets, presentational UI |

Package-specific setup, architecture, deploy, and tests live in each package’s README:

- **[Extension](apps/extension/README.md)** — load unpacked, OAuth, dev HMR, architecture, [adding an AI provider](apps/extension/README.md#adding-a-new-ai-provider)
- **[Marketing site](apps/web/README.md)** — routes, analytics, Cloudflare Pages deploy
- **[Shared UI](packages/ui/README.md)** — tokens, components, contribution rules

---

## Requirements

- **Node.js** ≥ 22
- **npm** (workspaces)
- **Chrome** (for the extension)

---

## Getting started

```bash
git clone https://github.com/nshntarora/guidedreview.git
cd guidedreview
npm install
```

### Run the extension (local)

```bash
npm run build:extension
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select **`apps/extension/dist`** (never a root-level `dist/`)
4. Open Options → add an LLM API key → open a GitHub PR → **Start Guided Review**

For day-to-day development with HMR:

```bash
npm run dev                 # extension Vite / crx on :5173
```

After code changes, rebuild if needed (`npm run build:extension`), reload the extension card in `chrome://extensions`, and refresh the PR tab. Full details: **[apps/extension/README.md](apps/extension/README.md)**.

### Run the marketing site

```bash
npm run dev:web             # http://localhost:3000
```

Full details: **[apps/web/README.md](apps/web/README.md)**.

### Optional: GitHub OAuth (device flow)

Submitting reviews from the overlay needs a GitHub OAuth App client ID (device flow). Copy the example env and set the client ID, then rebuild the extension:

```bash
cp .env.example .env        # set VITE_GITHUB_CLIENT_ID
npm run build:extension
```

See **[apps/extension/README.md](apps/extension/README.md#github-oauth)** for the full setup.

---

## Command index

All commands below are run from the **monorepo root** unless noted.

### Develop

| Command                 | What it does                   |
| ----------------------- | ------------------------------ |
| `npm install`           | Install all workspaces         |
| `npm run dev`           | Extension HMR (port **5173**)  |
| `npm run dev:extension` | Same as `dev`                  |
| `npm run dev:web`       | Marketing site (port **3000**) |

### Build & preview

| Command                   | What it does                                           |
| ------------------------- | ------------------------------------------------------ |
| `npm run build`           | Extension, then web                                    |
| `npm run build:extension` | Typecheck + Vite build → `apps/extension/dist` (+ zip) |
| `npm run build:web`       | Next.js static export → `apps/web/out`                 |
| `npm run start:web`       | Production preview of the marketing site               |

### Test

| Command                    | What it does                                 |
| -------------------------- | -------------------------------------------- |
| `npm test`                 | Unit tests (extension + UI)                  |
| `npm run test:watch`       | Extension unit tests in watch mode           |
| `npm run test:coverage`    | Extension unit coverage                      |
| `npm run test:e2e`         | Extension Playwright e2e (builds first)      |
| `npm run test:e2e:ui`      | Extension e2e with Playwright UI             |
| `npm run test:e2e:install` | Install Chromium for extension e2e           |
| `npm run test:e2e:web`     | Marketing site Playwright e2e (builds first) |
| `npm run test:e2e:web:ui`  | Marketing site e2e with Playwright UI        |

### Quality

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run typecheck`    | Typecheck all workspaces that define the script |
| `npm run lint`         | ESLint                                          |
| `npm run lint:fix`     | ESLint with autofix                             |
| `npm run format`       | Prettier write                                  |
| `npm run format:check` | Prettier check                                  |

### Workspace-scoped examples

```bash
npm run test -w @guided-review/extension
npm run test -w @guided-review/ui
npm run deploy -w @guided-review/web          # local Cloudflare Pages deploy
```

---

## Ports

| Service                     | Port |
| --------------------------- | ---- |
| Extension Vite / crx HMR    | 5173 |
| Marketing site (`next dev`) | 3000 |
| Web e2e static server       | 4173 |

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
