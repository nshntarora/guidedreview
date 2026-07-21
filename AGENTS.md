# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Guided Review" is a Chrome Manifest V3 extension (built with `@crxjs/vite-plugin`) that injects a
"Start Guided Review" button into GitHub PR pages. It fetches the PR's diff, sends it to an LLM
(Anthropic/OpenAI/Grok), and turns the raw diff into an ordered sequence of "review units" — logical
groupings of hunks with inferred context — shown in an overlay so a human can walk through the PR
schema-first, then logic, then call-sites, then tests.

## Commands

- `npm run dev` — Vite dev server with HMR (crxjs points the built manifest at this; keep it on the
  fixed port 5173 configured in `vite.config.ts`).
- `npm run build` — `tsc -b` then `vite build`, output to `dist/`. Load `dist/` as an unpacked
  extension in Chrome to test end-to-end.
- `npm run typecheck` — `tsc -b --noEmit`.
- `npm test` — Vitest unit tests (jsdom + chrome API mock in `src/test/`).
- `npm run test:watch` / `test:coverage` — Vitest watch mode / coverage report.
- `npm run test:e2e` — Playwright e2e against the built extension in headless Chromium
  (runs `npm run build` first via `pretest:e2e`). Requires `npm run test:e2e:install` once.
- `npm run test:e2e:ui` — same e2e suite with Playwright's interactive UI mode.

Unit tests live next to source as `src/**/*.test.{ts,tsx}`; e2e specs live under `e2e/`.
Test files are excluded from the extension `tsconfig` build (`tsconfig.test.json` covers them for
editor/typechecking). Prefer automated tests for pure logic and component behavior; still load
`dist/` in Chrome and exercise a real GitHub PR page for full manual smoke when changing injection
or provider networking.

**Always run `npm run build` after making code changes**, even if `npm run dev` is running. `dist/` is
what's loaded as the unpacked extension, so a stale build means Chrome keeps serving old behavior no
matter what the source says. Running the build also regenerates `dist/` in place, so simply hitting
reload on the extension in `chrome://extensions` (and refreshing the GitHub PR tab) is enough to pick up
the latest changes — no need to remove/re-add the unpacked extension.

## Architecture

The extension has three isolated runtime contexts that only talk to each other through
`chrome.runtime.sendMessage` — keep this boundary in mind when adding functionality:

- **Content script** (`src/content/`) — injected on `https://github.com/*` so it is already running when
  the user SPA-navigates from e.g. the PR list into a PR (Chrome does not re-inject content scripts on
  History API navigations). `index.tsx` is the entry point: a MutationObserver watches the DOM and only
  injects the "Start Guided Review" button when the URL is a PR path (`parsePRUrl`); it removes the
  button when the SPA leaves a PR. Scrapes PR metadata from the page (`src/lib/github/prContext.ts`),
  and mounts the review overlay into a Shadow DOM host (`ensureOverlayMounted`) so its styles never
  leak into/from GitHub's page. Overlay UI is styled with Tailwind utilities; residual overrides
  (highlight.js, markdown-body, host reset) live in SCSS under `src/content/overlay/styles/` and are
  injected via `overlay.css?inline` into the shadow root.
- **Background service worker** (`src/background/index.ts`) — the only context allowed to make
  cross-origin requests and hold the API key. Handles three message types: `FETCH_DIFF`,
  `ANNOTATE_REVIEW`, `TEST_CONNECTION`. Diff fetching happens here (not in the content script) because
  GitHub's `.diff` URL redirects to `patch-diff.githubusercontent.com`, which sends no CORS headers.
- **Options page** (`src/options/`) — standalone page (separate Vite build input in `vite.config.ts`)
  for configuring provider/model/API key, persisted via `src/lib/settings.ts`
  (`chrome.storage.local`).

Shared contracts for all three contexts live in `src/lib/types.ts` — this is the first file to read
when tracing any cross-context feature. `src/lib/messaging.ts` wraps the raw `chrome.runtime.sendMessage`
calls with typed helpers.

### Diff → Review Plan pipeline

1. `src/lib/github/diffParser.ts` — hand-rolled unified diff parser (deliberately not a library; GitHub's
   diff format is small/stable). Produces `ParsedDiff` → `DiffFile` → `DiffHunk` → `DiffLine`. Every hunk
   gets a stable id (`${filePath}#${index}`) that the LLM must reference exactly.
2. `src/lib/review/buildPrompt.ts` — renders a `ParsedDiff` into LLM-readable text with hunk ids annotated,
   and chunks large diffs by file (`chunkDiffByFile`, ~60k chars/chunk, never splits a file's hunks across
   chunks) so no single call blows the model's context.
3. `src/background/providers/*` — one streaming call to `annotateReviewStream` per chunk, against
   whichever provider is configured. All providers share `REVIEW_PLAN_JSON_SCHEMA`
   (`src/lib/review/reviewSchema.ts`) so structured-output behavior is identical across
   Anthropic/OpenAI-compatible backends. `providers/openaiCompatible.ts` is a factory used for both
   OpenAI and Grok since they share the same API shape; `providers/anthropic.ts` is bespoke.
   Shared HTTP helpers live in `providers/http.ts`.
4. Streaming assembly (`src/background/index.ts` + `src/lib/review/streamPlanParser.ts` +
   `src/lib/review/reviewPlan.ts`) — as text deltas arrive, `StreamPlanParser` extracts complete
   units; each is validated with `validateAndCleanUnit` against the chunk's real file/hunk ids
   (hallucinated refs are dropped, never shown). Unit ids are namespaced with `prefixChunkUnitId`
   so multi-chunk plans never collide. Progressive `UNIT` events go to the content script; `DONE`
   carries the final merged plan. (`validateAndCleanPlan` / `mergePlans` remain as batch helpers
   for tests and non-stream callers.)
5. The overlay (`src/content/overlay/`, state in `store.ts` via Zustand) renders display units
   (`displayUnits.ts`: synthetic PR description first, then `ReviewPlan.units`) in order, resolving
   each unit's `fileId`/`hunkId` refs back against the _real_ parsed diff — the LLM plans structure
   and commentary only; it never supplies the code shown to the reviewer.

### Session persistence

Review sessions (diff + plan + PR context + current step) are persisted to `chrome.storage.session`,
keyed by a **canonical PR identity** (`owner/repo#number` via `buildSessionKey` in `store.ts`) —
not the full browser URL — so resume works across Conversation / Files changed / Commits tabs.
`persistSession` reads the active `sessionKey` from the store (set on `startLoading`), so SPA
navigation to another PR cannot write under a stale key. Content scripts are normally blocked from
`chrome.storage.session`; the background worker explicitly grants
`TRUSTED_AND_UNTRUSTED_CONTEXTS` access on startup for this to work.

### Provider abstraction

`src/background/providers/types.ts` defines the `ProviderClient` interface (`annotateReviewStream`,
`testConnection`) and `ProviderError` (message is safe to show directly to the user).
`src/background/providers/index.ts` is the factory keyed by `ProviderId` (`"anthropic" | "openai" |
"grok"`). Adding a new provider means implementing `ProviderClient` and registering it there — everything
downstream (schema, chunking, validation) is provider-agnostic.
