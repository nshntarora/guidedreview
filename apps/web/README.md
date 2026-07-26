# `@guided-review/web`

Marketing site for Guided Review (Next.js App Router, SSG by default).

## Routes

| Path           | Page                      |
| -------------- | ------------------------- |
| `/`            | Landing                   |
| `/docs`        | Documentation (MDX index) |
| `/docs/[slug]` | Documentation page        |
| `/privacy`     | Privacy policy            |
| `/terms`       | Terms of use              |
| `/cookies`     | Cookie policy             |

Docs are authored as MDX under `content/help/`. Register pages in `config/help-pages.ts` and sidebar order in `config/help-navigation.ts`.

## Dev

```bash
# from monorepo root
npm run dev:web          # http://localhost:3000
npm run build:web        # next build
npm run start:web        # production preview
```

Extension HMR uses port **5173**; this app uses **3000**.

## Shared UI

Uses `@guided-review/ui` via `transpilePackages` and Tailwind `@source` of `packages/ui` in `app/globals.css`.

## Hosting

**Cloudflare Workers** (static assets) via GitHub Actions
(`.github/workflows/deploy-web.yml`).

Cloudflare has merged the Workers + Pages UI. Static sites deploy as a Worker
with an `assets` directory (`apps/web/wrangler.jsonc`) and get a
`*.workers.dev` URL (custom domains attach on the same Worker).

The site is a pure static export (`output: "export"` in `next.config.ts`).
`npm run build` writes to `apps/web/out/`, which Wrangler uploads.

### CI deploy

| Event                              | What deploys                                 |
| ---------------------------------- | -------------------------------------------- |
| Push to `main` (web-related paths) | Production (`wrangler deploy`)               |
| PR touching web-related paths      | Preview version (`wrangler versions upload`) |
| `workflow_dispatch`                | Manual production deploy                     |

**GitHub secrets** (repo → Settings → Secrets and variables → Actions):

| Secret                  | Value                                             |
| ----------------------- | ------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Account API token with **Workers Scripts → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID                             |

Worker **name** is `guidedreview` in `wrangler.jsonc` — change it there if your
dashboard Worker uses a different name. First `wrangler deploy` creates the
Worker if it does not exist yet.

Attach `guidedreview.com` as a custom domain on that Worker in the dashboard.

### Local deploy

```bash
# from monorepo root
npm run deploy -w @guided-review/web

# or static preview without Cloudflare
npm run build:web
npx serve apps/web/out
```
