![Guided Review](packages/ui/src/assets/icons/icon128.png)

# Guided Review

![Tests](https://github.com/nshntarora/guidedreview/actions/workflows/tests.yml/badge.svg)

Chrome extension for GitHub pull requests that clusters related changes into ordered **review units** so you can actually read AI-generated code.

1. Open a pull request and hit **Start Guided Review**.
2. Your LLM clusters the diff into ordered units with short summaries — schema, then logic, then call-sites, then tests — instead of an alphabetical file dump.
3. Walk the change keyboard-first. AI structures the pass — **you still read the code and decide**.

Free, open source, bring your own LLM key. The extension talks to GitHub and your AI provider only — no Guided Review backend. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/pdnnimoajmnjpccboemeomoeomancodd), or build from source below. Site and docs: [guidedreview.dev](https://guidedreview.dev) · [docs](https://guidedreview.dev/docs).

- [Why?](#why)
- [How does it work?](#how-does-it-work)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Running](#running)
  - [Development](#development)
  - [Building](#building)
  - [Testing](#testing)
- [Usage](#usage)
- [Configuration](#configuration)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Why?

AI agents are writing a lot of the code landing in your PRs. Review agents help find bugs and edge cases you missed — useful — but they are not a replacement for you. They lack taste: product context, people, when an abstraction is unnecessary, when to break the rules.

Nothing beats reading the code. GitHub still hands you every changed file in alphabetical order and leaves you to reconstruct the story. That was awkward for human-written diffs; for large AI-shaped PRs it is actively hostile.

Guided Review uses AI only where it helps: clustering related hunks into a walkable order and adding short summaries you can take or ignore. It does not auto-approve, and it does not invent the code you see. You still decide.

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **npm** (workspaces)
- **Chrome**

### Running

Once you have the project cloned:

1. Install dependencies from the monorepo root:

```bash
npm install
```

2. Build the extension:

```bash
npm run build:extension
```

3. Load it in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - **Load unpacked** → select **`apps/extension/dist`** (never a root-level `dist/`)

4. Open Options → add an LLM API key → open a GitHub PR → **Start Guided Review**

That's it. You can start reviewing.

### Development

For day-to-day work with HMR:

```bash
npm run dev                 # extension Vite / crx on port 5173
```

After code changes, rebuild if needed (`npm run build:extension`), **Reload** the extension card in `chrome://extensions`, and refresh the PR tab. Chrome serves whatever is currently in `dist/` — a running dev server alone does not replace that reload.

Marketing site (optional):

```bash
npm run dev:web             # http://localhost:3000
```

More detail: [apps/extension/README.md](apps/extension/README.md) · [apps/web/README.md](apps/web/README.md).

### Building

```bash
npm run build:extension     # typecheck + Vite → apps/extension/dist (+ zip)
npm run build               # extension, then marketing site
npm run build:web           # Next.js static export → apps/web/out
```

### Testing

From the monorepo root:

```bash
npm test                    # unit tests (extension + UI)
npm run test:e2e:install    # Chromium for extension e2e (once)
npm run test:e2e            # extension Playwright e2e (builds first)
npm run test:e2e:web        # marketing site e2e (builds first)
```

Also available: `npm run typecheck`, `npm run lint`, `npm run format`. Workspace-scoped runs use `npm run <script> -w @guided-review/<package>`.

## Usage

On a GitHub pull request, click **Start Guided Review** (or open from the extension once you are on the PR). The overlay walks you through review units — related hunks grouped and ordered — with keyboard shortcuts for next/prev unit, commenting, and submit.

- Without an API key, you still get a **one unit per file** fallback so navigation and comments work; connect a provider for clustered plans.
- Reading a PR and generating a plan does **not** require GitHub OAuth. Submitting a review (approve / comment / request changes) does — device flow, public client id only.
- Line comments attach to the **real** diff lines shown for a unit, not to model-invented code.

Docs for the happy path: [Your first review](https://guidedreview.dev/docs/first-review) · [Keyboard shortcuts](https://guidedreview.dev/docs/keyboard-shortcuts) · [Submit a review](https://guidedreview.dev/docs/submit-review).

## Configuration

**LLM provider** — Options page: Anthropic, OpenAI, or Grok, with your own API key. Keys live in `chrome.storage.local` on your machine. See [Configure AI provider](https://guidedreview.dev/docs/configure-provider).

**GitHub OAuth (optional)** — needed only to submit reviews from the overlay. Create an OAuth App with **Device Flow** enabled, then at the monorepo root:

```bash
cp .env.example .env        # set VITE_GITHUB_CLIENT_ID
npm run build:extension
```

Full setup: [apps/extension/README.md — GitHub OAuth](apps/extension/README.md#github-oauth).

**Monorepo** — npm workspaces:

| Path                               | What                                           |
| ---------------------------------- | ---------------------------------------------- |
| [`apps/extension`](apps/extension) | Chrome MV3 extension (the product)             |
| [`apps/web`](apps/web)             | Marketing site and docs (Next.js)              |
| [`packages/ui`](packages/ui)       | Shared tokens, brand assets, presentational UI |

Package READMEs own architecture, deploy, and contribution detail for each.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
