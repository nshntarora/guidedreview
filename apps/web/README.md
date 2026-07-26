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

**Cloudflare Pages** via GitHub Actions (`.github/workflows/deploy-web.yml`).

The site is a pure static export (`output: "export"` in `next.config.ts`).
`npm run build` writes to `apps/web/out/`, which Wrangler uploads with
`wrangler pages deploy`. Production lives on `*.pages.dev` (and any custom
domain you attach in the Pages project).

### CI deploy

| Event                              | What deploys                                         |
| ---------------------------------- | ---------------------------------------------------- |
| Push to `main` (web-related paths) | Production (`pages deploy` on branch `main`)         |
| PR touching web-related paths      | Preview deployment (`pages deploy` on the PR branch) |
| `workflow_dispatch`                | Manual production deploy                             |

**GitHub secrets** (repo → Settings → Secrets and variables → Actions):

| Secret                  | Value                                              |
| ----------------------- | -------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Account API token with **Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID                              |

Pages **project name** is `guidedreview` (set via `--project-name` in the
workflow and package scripts). First deploy creates the project if it does not
exist yet.

Attach `guidedreview.com` as a custom domain on that Pages project in the
dashboard.

### Local deploy

```bash
# from monorepo root
npm run deploy -w @guided-review/web

# or static preview without Cloudflare
npm run build:web
npx serve apps/web/out
```
