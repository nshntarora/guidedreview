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

**Cloudflare Pages** via Direct Upload from GitHub Actions
(`.github/workflows/deploy-web.yml`).

The site is a pure static export (`output: "export"` in `next.config.ts`).
`npm run build` writes assets to `apps/web/out/`, which Wrangler uploads.

### CI deploy

| Event                              | What deploys                        |
| ---------------------------------- | ----------------------------------- |
| Push to `main` (web-related paths) | Production                          |
| PR touching web-related paths      | Preview URL                         |
| `workflow_dispatch`                | Manual production/preview by branch |

**GitHub secrets** (repo → Settings → Secrets and variables → Actions):

| Secret                  | Value                                              |
| ----------------------- | -------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Account API token with **Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID                              |

Optional repo **variable**: `CLOUDFLARE_PAGES_PROJECT` (default `guidedreview`).

Create the Pages project in the Cloudflare dashboard (empty Direct Upload project
is fine), attach the custom domain, then push a change under `apps/web/` or
`packages/ui/` — or run **Deploy web** → **Run workflow**.

Local production preview of the export:

```bash
npm run build:web
npx serve apps/web/out   # or any static file server
```
