# AGENTS.md

Chrome MV3 extension: GitHub PR diff → user's LLM → ordered **review units** in a Shadow DOM overlay. npm workspaces, Node ≥ 22.

| Path             | What                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| `apps/extension` | Chrome MV3 product — load unpacked from **`apps/extension/dist` only**       |
| `apps/cli`       | Local git review — CLI server + browser UI                                   |
| `apps/web`       | Marketing + docs (Next.js static export → `out/`)                            |
| `packages/core`  | Review engine — parse, cluster, summarise, providers; no `chrome.*` or React |
| `packages/ui`    | Shared tokens/UI — source-only; no `chrome.*` or extension imports           |

## Import aliases

Prefer absolute imports over deep `../../` relatives:

| Alias                 | Resolves to            |
| --------------------- | ---------------------- |
| `@extension/*`        | `apps/extension/src/*` |
| `@web/*`              | `apps/web/*`           |
| `@guided-review/core` | `packages/core/src`    |

Same-directory `./foo` is fine. Cross-folder imports should use the alias.

## Commands

`npm run dev` · `dev:web` · `dev:cli` · `build` · `build:extension` · `build:cli` · `typecheck` · `test` · `test:e2e` · `test:e2e:web` · `test:e2e:cli` · `lint` · `format`

After CLI edits: `npm test -w @guided-review/cli`, then `npm run build:cli && npm run review`. Never `npx guided-review` — that hits a different npm package.

After extension edits: `build:extension`, reload in `chrome://extensions`, refresh the PR tab. Tests live next to source (`*.test.*`); e2e under each app's `e2e/`.

## Extension

Contexts talk only via `chrome.runtime.sendMessage`: **content** (DOM/overlay), **background** (fetch/keys/LLM), **options**. Types: `src/lib/types.ts`.

**Pipeline:** `parseDiff` → `buildPrompt` (chunk by file, never split a file) → `annotateReview` → overlay from the **real** diff. The engine lives in `@guided-review/core`; the extension is a GitHub host on top of it.

**Invariant:** LLM plans structure + commentary only; never supplies code shown to the user.

Sessions: `chrome.storage.session`, key `owner/repo#number` (`buildSessionKey`). Providers: `@guided-review/core` (`ProviderClient`).

## packages/ui · apps/web

- **ui:** transpile via `transpilePackages`. Tokens `@guided-review/ui/theme.css`. Tailwind v4 that uses ui must `@source packages/ui/src/**/*.{ts,tsx}`.
- **web:** docs MDX in `content/help/`, legal in `content/legal/`. Register every docs page in `config/docs.ts` (sidebar, routes, metadata, sitemap).

## Tailwind

- Tokens live in `@guided-review/ui/theme.css`. Use semantic utilities (`bg-background`, `text-muted`, `text-warning`) — not raw hex or one-off arbitrary colors.
- Prefer utilities. Custom CSS only when Tailwind cannot own the markup (Shadow DOM reset, highlight.js, `.markdown-body`, MDX/legal prose, grain `::before`). Import the theme once; it already pulls in Tailwind.
- Text links use the document chrome (`a:not(.inline-flex)` → accent + bottom border on hover). Button-looking anchors use `buttonClassName`. No `cva` / `@apply`. Do not reconstruct `Button` when it already matches.

## Voice

Match `apps/web` landing copy — peer engineer, specific, dry.

- AI **structures** the review; humans decide. Never auto-approve / "reviews for you."
- BYO key; no product backend. Traffic: GitHub + user's provider only.
- Name **Guided Review**. CTA **Start Guided Review**. Terms: review units, cluster, overlay, keyboard-first.
- Errors: what failed + what to try. No SaaS clichés or overclaiming model accuracy.

## Tests

Goal is **not** coverage. Goal is the fewest tests that still give confidence to ship. Every test is guilty until proven useful; if deleting it does not reduce shipping confidence, delete it. Prefer one meaningful integration test over ten tiny implementation tests.

**Unit:** test observable business logic, not rendering or React internals. Avoid mocks unless isolation is required.
**E2E:** executable journeys a user would care about. Do not E2E static marketing pages, "button exists," or exact wording.
**a11y:** interactive paths only (keyboard, focus trap, dialogs, forms) — not decorative markup.

Prefer consolidating overlapping tests and extracting shared setup over adding more cases. If a feature's complexity is mostly test surface, consider removing the feature instead.
