# AGENTS.md

Chrome MV3 extension that turns GitHub PR diffs into ordered **review units** via the user's LLM (Anthropic / OpenAI / Grok). npm workspaces monorepo, Node ≥ 22.

## Layout

| Path             | Package                    | What                                                           |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| `apps/extension` | `@guided-review/extension` | Product (load unpacked from **`apps/extension/dist` only**)    |
| `apps/web`       | `@guided-review/web`       | Marketing site (Next.js static export)                         |
| `packages/ui`    | `@guided-review/ui`        | Shared tokens/UI — source-only, no `chrome.*` or product types |

## Commands

`npm run dev` · `dev:web` · `build` · `build:extension` · `typecheck` · `test` · `test:e2e` · `lint` · `format`

After extension changes: `npm run build:extension`, then reload in `chrome://extensions`.

Unit tests sit next to source (`*.test.{ts,tsx}`). Extension e2e: `apps/extension/e2e/`. Web e2e: `apps/web/e2e/`.

## Extension

Three contexts, messages only via `chrome.runtime.sendMessage`:

- **Content** (`src/content/`) — GitHub DOM, overlay
- **Background** (`src/background/`) — fetch, keys, LLM
- **Options** (`src/options/`) — settings

Contracts: `src/lib/types.ts`. Messaging: `src/lib/messaging.ts`.

**Review pipeline:** `diffParser` → `buildPrompt` (chunk by file, never split a file) → providers stream plan → `streamPlanParser` / `reviewPlan` validate against real hunk ids → overlay renders from the real diff.

**Invariant:** LLM plans structure and commentary only; it never supplies code. Hallucinated file/hunk refs are dropped.

Sessions: `chrome.storage.session`, key `owner/repo#number` (`buildSessionKey`). Providers: `background/providers/` (`ProviderClient`); OpenAI/Grok share `openaiCompatible.ts`.

## packages/ui

Source-only; apps transpile via `transpilePackages`. Tokens: `@guided-review/ui/theme.css`. Tailwind v4 entries that use ui must `@source packages/ui/src/**/*.{ts,tsx}`.

## apps/web

Static export (`output: "export"`). Help MDX in `content/help/` (see `config/help-pages.ts`). Output: `apps/web/out/`.

## Voice

Match landing copy in `apps/web` — peer engineer, specific, dry.

- AI **structures** the review; humans decide. Never imply auto-approve.
- BYO key; no product backend. Code hits GitHub + the user's provider only.
- Terms: review units, cluster, overlay, keyboard-first. Name: **Guided Review**. CTA: **Start Guided Review**.
- Errors: what failed + what to try. No SaaS clichés or overclaiming model accuracy.
