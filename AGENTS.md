# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Guided Review" is a Chrome Manifest V3 extension (built with `@crxjs/vite-plugin`) that injects a
"Start Guided Review" button into GitHub PR pages. It fetches the PR's diff, sends it to an LLM
(Anthropic/OpenAI/Grok), and turns the raw diff into an ordered sequence of "review units" — logical
groupings of hunks with inferred context — shown in an overlay so a human can walk through the PR
schema-first, then logic, then call-sites, then tests.

The repo is an **npm workspaces monorepo** that also contains a marketing site and shared UI package.

## Monorepo layout

| Path             | Package                    | Description                                    |
| ---------------- | -------------------------- | ---------------------------------------------- |
| `apps/extension` | `@guided-review/extension` | Chrome MV3 extension (product)                 |
| `apps/web`       | `@guided-review/web`       | Marketing site (Next.js App Router, SSG)       |
| `packages/ui`    | `@guided-review/ui`        | Shared tokens, brand assets, presentational UI |

**Chrome load path:** always load unpacked from **`apps/extension/dist`**, never a root-level `dist/`.
After the monorepo move, remove any stale root `dist/` entry from `chrome://extensions`.

Root scripts proxy into workspaces. `npm run build` builds **extension then web**.

## Commands

- `npm run dev` / `dev:extension` — Vite HMR for the extension (port **5173**, strict).
- `npm run dev:web` — Next.js marketing site (port **3000**).
- `npm run build` — extension + web.
- `npm run build:extension` — `tsc -b` + `vite build` → **`apps/extension/dist`**.
- `npm run build:web` — `next build`.
- `npm run start:web` — production preview of the marketing site.
- `npm run typecheck` — all workspaces with a typecheck script.
- `npm test` — extension unit tests + `@guided-review/ui` unit tests.
- `npm run test:e2e` — Playwright e2e against the built extension (builds first).
- `npm run lint` / `format` / `format:check` — root ESLint + Prettier.

Unit tests live next to source as `apps/extension/src/**/*.test.{ts,tsx}` and
`packages/ui/src/**/*.test.{ts,tsx}`; e2e specs live under `apps/extension/e2e/`.

**Always run `npm run build:extension` after extension code changes**, even if `npm run dev` is
running. **`apps/extension/dist/`** is what's loaded as the unpacked extension, so a stale build
means Chrome keeps serving old behavior. Hit reload on the extension in `chrome://extensions` (and
refresh the GitHub PR tab) to pick up the latest changes.

## Architecture (extension)

The extension has three isolated runtime contexts that only talk to each other through
`chrome.runtime.sendMessage` — keep this boundary in mind when adding functionality:

- **Content script** (`apps/extension/src/content/`) — injected on `https://github.com/*` so it is
  already running when the user SPA-navigates from e.g. the PR list into a PR (Chrome does not
  re-inject content scripts on History API navigations). `index.tsx` is the entry point: a
  MutationObserver watches the DOM and only injects the "Start Guided Review" button when the URL is
  a PR path (`parsePRUrl`); it removes the button when the SPA leaves a PR. Scrapes PR metadata from
  the page (`apps/extension/src/lib/github/prContext.ts`), and mounts the review overlay into a
  Shadow DOM host (`ensureOverlayMounted`) so its styles never leak into/from GitHub's page. Overlay
  UI is styled with Tailwind utilities; residual overrides (highlight.js, markdown-body, host reset)
  live in SCSS under `apps/extension/src/content/overlay/styles/` and are injected via
  `overlay.css?inline` into the shadow root.
- **Background service worker** (`apps/extension/src/background/index.ts`) — the only context allowed
  to make cross-origin requests and hold the API key. Handles three message types: `FETCH_DIFF`,
  `ANNOTATE_REVIEW`, `TEST_CONNECTION`. Diff fetching happens here (not in the content script)
  because GitHub's `.diff` URL redirects to `patch-diff.githubusercontent.com`, which sends no CORS
  headers.
- **Options page** (`apps/extension/src/options/`) — standalone page (separate Vite build input) for
  configuring provider/model/API key, persisted via `apps/extension/src/lib/settings.ts`
  (`chrome.storage.local`).

Shared contracts for all three contexts live in `apps/extension/src/lib/types.ts` — this is the first
file to read when tracing any cross-context feature. `apps/extension/src/lib/messaging.ts` wraps the
raw `chrome.runtime.sendMessage` calls with typed helpers.

### Diff → Review Plan pipeline

1. `apps/extension/src/lib/github/diffParser.ts` — hand-rolled unified diff parser (deliberately not a
   library; GitHub's diff format is small/stable). Produces `ParsedDiff` → `DiffFile` → `DiffHunk` →
   `DiffLine`. Every hunk gets a stable id (`${filePath}#${index}`) that the LLM must reference
   exactly.
2. `apps/extension/src/lib/review/buildPrompt.ts` — renders a `ParsedDiff` into LLM-readable text with
   hunk ids annotated, and chunks large diffs by file (`chunkDiffByFile`, ~60k chars/chunk, never
   splits a file's hunks across chunks) so no single call blows the model's context.
3. `apps/extension/src/background/providers/*` — one streaming call to `annotateReviewStream` per
   chunk, against whichever provider is configured. All providers share `REVIEW_PLAN_JSON_SCHEMA`
   (`apps/extension/src/lib/review/reviewSchema.ts`) so structured-output behavior is identical across
   Anthropic/OpenAI-compatible backends. `providers/openaiCompatible.ts` is a factory used for both
   OpenAI and Grok since they share the same API shape; `providers/anthropic.ts` is bespoke. Shared
   HTTP helpers live in `providers/http.ts`.
4. Streaming assembly (`apps/extension/src/background/index.ts` +
   `apps/extension/src/lib/review/streamPlanParser.ts` + `apps/extension/src/lib/review/reviewPlan.ts`)
   — as text deltas arrive, `StreamPlanParser` extracts complete units; each is validated with
   `validateAndCleanUnit` against the chunk's real file/hunk ids (hallucinated refs are dropped, never
   shown). Unit ids are namespaced with `prefixChunkUnitId` so multi-chunk plans never collide.
   Progressive `UNIT` events go to the content script; `DONE` carries the final merged plan.
5. The overlay (`apps/extension/src/content/overlay/`, state in `store.ts` via Zustand) renders display
   units (`displayUnits.ts`: synthetic PR description first, then `ReviewPlan.units`) in order,
   resolving each unit's `fileId`/`hunkId` refs back against the _real_ parsed diff — the LLM plans
   structure and commentary only; it never supplies the code shown to the reviewer.

### Session persistence

Review sessions (diff + plan + PR context + current step) are persisted to `chrome.storage.session`,
keyed by a **canonical PR identity** (`owner/repo#number` via `buildSessionKey` in
`apps/extension/src/content/overlay/store.ts`) — not the full browser URL — so resume works across
Conversation / Files changed / Commits tabs. `persistSession` reads the active `sessionKey` from the
store (set on `startLoading`), so SPA navigation to another PR cannot write under a stale key.
Content scripts are normally blocked from `chrome.storage.session`; the background worker explicitly
grants `TRUSTED_AND_UNTRUSTED_CONTEXTS` access on startup for this to work.

### Provider abstraction

`apps/extension/src/background/providers/types.ts` defines the `ProviderClient` interface
(`annotateReviewStream`, `testConnection`) and `ProviderError` (message is safe to show directly to
the user). `apps/extension/src/background/providers/index.ts` is the factory keyed by `ProviderId`
(`"anthropic" | "openai" | "grok"`). Adding a new provider means implementing `ProviderClient` and
registering it there — everything downstream (schema, chunking, validation) is provider-agnostic.

## Shared UI (`packages/ui`)

Source-only package (no emit/`build` script). Apps import `@guided-review/ui` and transpile via Vite /
Next `transpilePackages`.

- Tokens: `@guided-review/ui/theme.css`
- Components: `cn`, `Spinner`, `Kbd`, `BrandMark`, `Button` / `buttonClassName`, `Input`, `Textarea`,
  `Label`, `Select` (chrome-free; brand mark takes `iconSrc`)
- Surfaces: form controls accept `surface?: "app" | "overlay"` — `app` uses dark `opt-*` tokens
  (options + marketing), `overlay` uses dark `gr-*` tokens (review overlay). Defaults: form controls
  → `app`; `Spinner` → `overlay`.
- Assets: `@guided-review/ui/assets/*` (canonical brand). Extension syncs into `public/` via
  `apps/extension/scripts/sync-ui-assets.mjs` on `predev`/`prebuild`.

**Tailwind v4:** every CSS entry that builds utilities for ui components **must** declare
`@source` of `packages/ui/src/**/*.{ts,tsx}` (workspace packages resolve through `node_modules` and
are not scanned by default).

**Do not** put `chrome.*`, extension messaging, GitHub API, or product types in `packages/ui`. ESLint
`no-restricted-imports` enforces web ↛ extension and ui ↛ chrome/extension.

## Marketing site (`apps/web`)

Next.js App Router with SSG for `/`, `/docs`, `/privacy`, `/terms`, `/cookies`. Product docs are
MDX under `apps/web/content/help/` (`@next/mdx` + `mdxRs` GFM), registered in
`config/help-pages.ts` / `config/help-navigation.ts`, rendered at `/docs` and `/docs/[slug]`. Dev
on port 3000. Hosting deferred — CI runs `next build` only.

## Voice and tone

**Source of truth:** landing page copy in `apps/web` (`Hero`, `Why`, `FeatureGrid`, `TrustBand`,
`Faqs`, `InstallCta`). When writing marketing, docs, options UI, overlay copy, errors, or empty
states, match this voice — do not invent a more corporate or more hype-y register.

### Who we sound like

A senior engineer who built the tool for themselves and is talking to peers. First-person founder
energy is allowed on the site ("That's why I built…") but it should be rare and used only for emphasis; product UI can stay second-person ("you")
without becoming impersonal SaaS.

- **Honest about AI.** AI helps structure the review; humans still read the code and have the final
  say. Never imply the product replaces judgment or "approves PRs for you."
- **Human-first.** The product is "designed for humans" and "uses AI in just the right places (not
  too little, not too much)." Lead with the human job (reading, understanding, deciding), then how
  AI assists.
- **Privacy as plain fact.** No backend, no servers, BYO key, code never hits our infrastructure.
  State it plainly and specifically — not as a compliance badge farm.
- **Open source without the pitch deck.** Free, open source, forkable. Mention maintenance
  honestly; don't oversell "community" or "ecosystem."
- **Dry, self-aware humor.** Dry asides and footnotes are in-voice ("Seriously.", "Not even the
  serverless kind.", fake credit card in FAQ). Never try-hard meme voice, never mean about users.

### Tone dial

| Dial            | Default                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| Formality       | Casual-professional. Contractions fine. "wayyyy" is landing-page flair, not a template.     |
| Sentence length | Short–medium. Prefer plain sentences over stacked clauses.                                  |
| Confidence      | Direct claims, then caveats when real ("sometimes helpful, sometimes not").                 |
| Humor           | Optional; one dry line beats a joke every paragraph. Skip in errors and destructive flows.  |
| Empathy         | Name the pain (too much code, agents write more than you can review) without therapy-speak. |

### Core messages (keep consistent)

1. **Humans review AI-generated code** — better reading/navigation, not autonomous review bots.
2. **AI clusters and orders; you judge** — review changes/units, not alphabetical file dumps.
3. **Keyboard-first** — browse, comment, and review without leaving the keyboard.
4. **No backend / BYO LLM** — extension talks to GitHub + your provider only.
5. **You still have the final say** — more context than any agent (people, business, product).

### Do say / don't say

| Do                                                              | Don't                                         |
| --------------------------------------------------------------- | --------------------------------------------- |
| "Help you review" / "make reading code better"                  | "AI that reviews for you" / "auto-approve"    |
| "Cluster related changes" / "review units"                      | Vague "unlock insights" / "supercharge PRs"   |
| "Bring your own LLM key"                                        | "Our secure cloud AI" (we don't have one)     |
| "Take it with a grain of salt" (summaries)                      | Guarantees about model accuracy or coverage   |
| "We don't even have servers"                                    | Enterprise trust theater without substance    |
| "Please check with your employer…"                              | Absolute legal claims about policy compliance |
| "Forever is a long time" (pricing honesty)                      | "Free forever!!!" promises                    |
| Specific next steps ("Install… add a key… Start Guided Review") | "Get started in seconds" fluff                |

### Surface-specific guidance

- **Landing / marketing** — Full personality: problem story, first person, footnotes, FAQ wit. Hero
  can be punchy; features stay concrete (what it does + why it matters).
- **Docs / help** — Same plain language, less joke density. Prefer "you" + imperative steps. Keep
  privacy and BYO-key framing aligned with the site.
- **In-app (overlay, options, modals)** — Clear, short, peer-to-peer. Labels and CTAs stay practical
  ("Start Guided Review", "Connect GitHub"). Light wit only if it doesn't slow a task.
- **Errors / failures** — Straight and useful: what failed, what to try. No blame, no jokes that
  hide the fix. Provider/API messages may surface as-is when already user-safe.
- **Trust / privacy** — Specific over slogan. Prefer "the extension doesn't talk to any third-party
  servers other than GitHub and your AI provider" over "we take privacy seriously."

### Word choices

- Prefer **review**, **read**, **cluster**, **summary**, **keyboard-first**, **overlay**, **diff**,
  **pull request / PR**, **provider**, **API key**, **open source**.
- Product name: **Guided Review** (two words, title case). CTA pattern already in product: **Start
  Guided Review**.
- Avoid SaaS clichés: _leverage, seamless, robust, next-gen, AI-powered magic, ship faster_ (unless
  describing a real user outcome in plain words).
- Avoid overclaiming: don't say the model "understands your codebase" or "catches every bug."

### Example rewrites (in-voice)

| Off-voice                                             | In-voice                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Unlock the power of AI code review."                 | "Use AI to help you review code — not review it for you."                             |
| "Our enterprise-grade platform keeps your IP secure." | "Your code never touches our infrastructure. We don't have any."                      |
| "Intelligent summaries for every change."             | "A 2-line overview of every change. Sometimes useful — take it with a grain of salt." |
| "Something went wrong. Please try again later."       | "Couldn't reach your AI provider. Check the API key in options and try again."        |

When in doubt, re-read the Why section and feature cards on the landing page and match that
register: peer, specific, slightly irreverent, never replacing the human reviewer.
