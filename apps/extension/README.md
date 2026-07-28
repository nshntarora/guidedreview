# `@guided-review/extension`

Chrome **Manifest V3** extension — the Guided Review product.

Injects **Start Guided Review** on GitHub PR pages, fetches the PR diff, sends it to your LLM (Anthropic / OpenAI / Grok), and turns the raw diff into ordered **review units** in a Shadow DOM overlay so you can walk the change set with keyboard shortcuts, line comments, and an optional GitHub review submit.

Parent monorepo: [../../README.md](../../README.md)

---

## Quick start

From the **monorepo root**:

```bash
npm install
npm run build:extension
```

### Load unpacked in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → choose **`apps/extension/dist`**

**Always load from `apps/extension/dist`**, never a root-level `dist/` left over from older layouts. Remove any stale root entry from `chrome://extensions` if you still have one.

4. Open the extension **Options** page → choose a provider and paste an API key
5. Open a GitHub pull request → click **Start Guided Review**

### After code changes

Chrome serves whatever is currently in `dist/`. A running `npm run dev` does not replace a reload of the unpacked extension.

```bash
npm run build:extension    # or rely on dev writing to dist
```

Then **Reload** the extension card in `chrome://extensions` and refresh the GitHub PR tab.

---

## Development

```bash
# from monorepo root
npm run dev                 # Vite HMR for the extension (port 5173)
npm run dev:extension       # same
```

|            |                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Dev server | `http://localhost:5173` (strict port)                                                               |
| Load path  | **`apps/extension/dist`**                                                                           |
| Shared UI  | `@guided-review/ui` (synced brand assets via `scripts/sync-ui-assets.mjs` on `predev` / `prebuild`) |

---

## GitHub OAuth

Submitting a review from the overlay (approve / comment / request changes via the GitHub API) uses GitHub’s **device OAuth** flow. Reading a PR and generating a plan works **without** GitHub auth.

1. Create an OAuth App at [GitHub Developer settings](https://github.com/settings/developers)
2. Enable **Device Flow**
3. At the monorepo root:

```bash
cp .env.example .env
# set VITE_GITHUB_CLIENT_ID=<your public client id>
npm run build:extension
```

The Vite build loads env from the **repo root** and inlines `VITE_GITHUB_CLIENT_ID` at build time. Rebuild after changing it. Only the public client ID is needed — no client secret for device flow.

---

## Architecture

Three isolated runtime contexts talk only through `chrome.runtime.sendMessage`:

| Context                       | Path                                         | Role                                                                                                                              |
| ----------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Content script**            | `src/content/`                               | Injected on `https://github.com/*`. Watches SPA navigations, injects the CTA on PR URLs, mounts the overlay in a Shadow DOM host. |
| **Background service worker** | `src/background/`                            | Only place that holds the API key and makes cross-origin requests (diff fetch, LLM annotate, connection test).                    |
| **Options / popup / welcome** | `src/options/`, `src/popup/`, `src/welcome/` | Settings UI, toolbar popup, first-run welcome page.                                                                               |

Shared contracts: `src/lib/types.ts`, messaging helpers in `src/lib/messaging.ts`.

### Diff → review plan (short version)

1. **Parse** — unified diff → files / hunks / lines with stable hunk ids (`filePath#index`)
2. **Prompt** — render the parsed diff for the model; large diffs chunk by file (~60k chars)
3. **Annotate** — stream structured plan from the configured provider
4. **Validate** — drop hallucinated file/hunk refs; never show invented code
5. **Display** — overlay resolves real hunks from the plan; you step through units

Providers: Anthropic, OpenAI, and Grok (OpenAI-compatible). Settings live in `chrome.storage.local`. Sessions (diff + plan + step) live in `chrome.storage.session`, keyed by PR identity (`owner/repo#number`).

---

## Adding a new AI provider

Providers are a thin layer over the same pipeline. Chunking, prompt building, JSON schema, streaming unit parse, and validation are all provider-agnostic — you only wire catalog metadata, a background client, and host permission.

### What every provider must do

Implement `ProviderClient` in `src/background/providers/types.ts`:

| Method                 | Behavior                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `annotateReviewStream` | Stream structured `ReviewPlan` JSON as `{ type: "text_delta"; text }` events, then `{ type: "done" }`. Prefer the provider’s **strict / schema-constrained** output mode with `REVIEW_PLAN_JSON_SCHEMA` (`src/lib/review/reviewSchema.ts`). Use `SYSTEM_PROMPT` + `buildUserPrompt` from `src/lib/review/buildPrompt.ts`. |
| `testConnection`       | One cheap request that proves the API key (and model, if the API requires it) works. Throw `ProviderError` with a **user-safe** `message` on failure.                                                                                                                                                                     |

Throw `ProviderError` for all provider-side failures. Shared HTTP/SSE helpers live in `src/background/providers/http.ts` and `sse.ts`.

### Checklist

1. **Catalog** — `src/lib/providers/catalog.ts`
   - Extend the `ProviderId` union.
   - Add a `PROVIDERS` row (`id`, `displayName`, `keyPlaceholder`, `iconSrc`, `defaultModelId`).
   - Add one or more `MODELS` rows for that provider (exact API model ids).

2. **Background client** — `src/background/providers/`
   - **OpenAI-compatible** (`/v1/chat/completions` + `response_format.json_schema`): reuse `createOpenAICompatibleProvider(baseUrl, displayName)` from `openaiCompatible.ts` (how OpenAI and Grok are wired).
   - **Anything else**: new module implementing `ProviderClient` (see `anthropic.ts` for a non-OpenAI shape).
   - Register it in `getProviderClient` in `src/background/providers/index.ts`.

3. **Host permission** — `manifest.config.ts`
   - Add the API origin to `host_permissions` (e.g. `https://api.example.com/*`). MV3 service workers need this to call the API.

4. **Icon** — drop an SVG at `public/providers/<id>.svg` and set `iconSrc` to `providers/<id>.svg`. The options UI loads it via `ProviderIcon` / `chrome.runtime.getURL`.

5. **Verify**
   - Options page: provider + models appear; **Test connection** succeeds with a real key.
   - Start Guided Review on a PR: units stream and match real file/hunk ids (validation drops hallucinations either way).
   - `npm run typecheck` and `npm test` from the monorepo root.

### Out of scope for a typical provider PR

You usually **do not** need to touch:

- Content script / overlay UI
- Diff parser, chunking, or `StreamPlanParser`
- Session persistence
- Messaging contracts (`ANNOTATE_REVIEW`, `TEST_CONNECTION`) — the background already dispatches by `settings.provider`

### Adding only a new model

If the provider already exists, add a row to `MODELS` in `catalog.ts` (and update `defaultModelId` on the provider if you want a new default). No client or manifest change.

---

## Scripts

From monorepo root (preferred):

| Command                         | What it does                          |
| ------------------------------- | ------------------------------------- |
| `npm run dev` / `dev:extension` | Vite + crx HMR                        |
| `npm run build:extension`       | `tsc -b` + Vite build + zip → `dist/` |
| `npm test`                      | Vitest unit tests (extension + UI)    |
| `npm run test:watch`            | Extension unit tests, watch           |
| `npm run test:coverage`         | Extension coverage                    |
| `npm run test:e2e`              | Playwright e2e (builds first)         |
| `npm run test:e2e:ui`           | Playwright UI mode                    |
| `npm run test:e2e:install`      | Install Chromium for e2e              |
| `npm run typecheck`             | Typecheck (all workspaces)            |

Workspace-local (same package):

```bash
npm run build -w @guided-review/extension
npm run test -w @guided-review/extension
npm run test:e2e -w @guided-review/extension
npm run gen-icons -w @guided-review/extension   # regenerate PNG icons (Python)
```

### Tests

| Kind | Location                                        |
| ---- | ----------------------------------------------- |
| Unit | `src/**/*.test.{ts,tsx}` (Vitest + jsdom)       |
| E2E  | `e2e/` (Playwright against the built extension) |

E2E runs `build:e2e` first (typecheck + Vite build, no zip).

---

## Project layout

```
apps/extension/
├── manifest.config.ts      # MV3 manifest (crxjs)
├── src/
│   ├── background/         # service worker + LLM providers
│   ├── content/            # PR button + overlay
│   ├── lib/                # types, messaging, diff, review, settings
│   ├── options/            # options page
│   ├── popup/              # toolbar popup
│   └── welcome/            # welcome page
├── e2e/                    # Playwright specs
├── public/                 # icons, brand assets (synced from ui)
└── scripts/                # sync-ui-assets, zip, gen-icons
```

---

## Privacy (product defaults)

- No Guided Review backend — code and keys do not hit our infrastructure (we don’t have any).
- API keys stay in `chrome.storage.local` and are used only from the background worker for LLM calls.
- Host permissions are limited to GitHub, patch-diff, and the configured AI provider APIs.

User-facing docs: [guidedreview.dev/docs](https://guidedreview.dev/docs).
