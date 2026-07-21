# `@guided-review/web`

Marketing site for Guided Review (Next.js App Router, SSG by default).

## Routes

| Path       | Page           |
| ---------- | -------------- |
| `/`        | Landing        |
| `/privacy` | Privacy policy |
| `/terms`   | Terms of use   |

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

Deferred. CI runs `next build` only. When a host is chosen:

- Node/platform host: deploy `.next/` + `next start` (or adapter)
- Pure static: set `output: "export"` in `next.config.ts` (and usually `images.unoptimized: true`)
