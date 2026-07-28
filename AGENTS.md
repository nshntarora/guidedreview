# AGENTS.md

Guidance for coding agents working in this repository.

## Project

**Guided Review** is a Chrome MV3 extension (`@crxjs/vite-plugin`) that injects a "Start Guided Review" button on GitHub PR pages. It fetches the PR diff, sends it to the user's LLM (Anthropic / OpenAI / Grok), and turns the diff into ordered **review units** shown in a Shadow DOM overlay so a human can walk the PR schema → logic → call-sites → tests.

This repo is an **npm workspaces monorepo** (Node ≥ 22).

## Layout

| Path             | Package                    | Description                              |
| ---------------- | -------------------------- | ---------------------------------------- |
| `apps/extension` | `@guided-review/extension` | Chrome MV3 extension (product)           |
| `apps/web`       | `@guided-review/web`       | Marketing site (Next.js App Router, SSG) |
| `packages/ui`    | `@guided-review/ui`        | Shared tokens, brand assets, UI          |

**Chrome load path:** unpacked from **`apps/extension/dist` only** — never a root-level `dist/`.

## Commands

- `npm run dev` / `dev:extension` — extension Vite HMR (port **5173**)
- `npm run dev:web` — marketing site (port **3000**)
- `npm run build` — extension then web
- `npm run build:extension` → `apps/extension/dist`
- `npm run build:web` / `start:web`
- `npm run typecheck` / `npm test` / `npm run test:e2e` / `npm run test:e2e:web`
- `npm run lint` / `format` / `format:check`

Unit tests: next to source as `*.test.{ts,tsx}`. Extension e2e: `apps/extension/e2e/`. Web e2e: `apps/web/e2e/` (serves `apps/web/out`).

**Always run `npm run build:extension` after extension code changes**, even with `dev` running. Reload the extension in `chrome://extensions` and refresh the GitHub tab.

## Extension architecture

Three isolated contexts talk **only** via `chrome.runtime.sendMessage`:

| Context    | Path                             | Role                                      |
| ---------- | -------------------------------- | ----------------------------------------- |
| Content    | `apps/extension/src/content/`    | GitHub DOM, button inject, review overlay |
| Background | `apps/extension/src/background/` | Cross-origin fetch, API keys, LLM calls   |
| Options    | `apps/extension/src/options/`    | Provider / model / key settings           |

Shared contracts: `apps/extension/src/lib/types.ts` (start here for cross-context work). Messaging helpers: `apps/extension/src/lib/messaging.ts`.

### Review pipeline (file map)

1. `lib/github/diffParser.ts` — unified diff → hunks with stable ids (`${filePath}#${index}`)
2. `lib/review/buildPrompt.ts` — LLM text + chunking by file (~60k chars; never split a file)
3. `background/providers/*` — streaming `annotateReviewStream` per chunk (`REVIEW_PLAN_JSON_SCHEMA`)
4. `lib/review/streamPlanParser.ts` + `reviewPlan.ts` — validate units against real hunk ids; drop hallucinations
5. `content/overlay/` — render units; resolve refs against the **real** parsed diff

**Invariants:** the LLM plans structure and commentary only — it never supplies the code shown. Hallucinated file/hunk refs are dropped, never displayed.

### Sessions

Persisted to `chrome.storage.session`, keyed by **`owner/repo#number`** (`buildSessionKey` in `content/overlay/store.ts`), not the full URL. Background grants session storage access to content scripts on startup.

### Providers

`background/providers/types.ts` → `ProviderClient`. Register in `background/providers/index.ts`. Downstream schema, chunking, and validation are provider-agnostic. OpenAI and Grok share `openaiCompatible.ts`; Anthropic is separate.

## packages/ui

Source-only (no build emit). Apps transpile via Vite / Next `transpilePackages`.

- Tokens: `@guided-review/ui/theme.css`
- **No** `chrome.*`, extension messaging, GitHub API, or product types here (ESLint enforces)
- Tailwind v4 CSS entries that use ui components **must** `@source` `packages/ui/src/**/*.{ts,tsx}`

## apps/web

Next.js App Router, **static export** (`output: "export"`). Docs MDX: `apps/web/content/help/` (registered in `config/help-pages.ts` / `help-navigation.ts`). Build output: `apps/web/out/`. Deploy via Cloudflare Pages (see `.github/workflows/deploy.yml`).

## Voice (UI, docs, marketing)

Source of truth: landing copy in `apps/web` (`Hero`, `Why`, `FeatureGrid`, `TrustBand`, `Faqs`, `InstallCta`). Match that register — peer engineer, specific, dry; not corporate SaaS.

- AI **structures** the review; humans read and decide. Never imply auto-approve or "reviews for you."
- BYO LLM key; no product backend. Code only hits GitHub and the user's provider.
- Prefer concrete terms: review units, cluster, overlay, keyboard-first.
- Product name: **Guided Review**. CTA: **Start Guided Review**.
- Errors: what failed + what to try. No jokes that hide the fix.
- Avoid overclaiming model accuracy and SaaS clichés (_leverage, seamless, supercharge_).
