# `@guided-review/ui`

Shared design tokens, brand assets, and presentational components for Guided Review apps.

## What belongs here

Add a module when **all** are true:

- Used (or clearly about to be used) by ≥2 apps
- No `chrome.*`, no extension messaging, no GitHub API
- No dependency on extension product types
- Styled with shared tokens (or fully prop-driven)
- Safe to show on a public marketing site

## Package surface

```ts
import { cn, Spinner, Kbd, BrandMark } from "@guided-review/ui";
import "@guided-review/ui/theme.css";
import iconUrl from "@guided-review/ui/assets/icon.png";
```

- **Source exports only** — no `build` emit step; apps transpile via Vite / Next `transpilePackages`.
- **RSC-safe by default** — keep components free of hooks/browser APIs unless marked `"use client"`.

## Scripts

```bash
npm run typecheck -w @guided-review/ui
npm test -w @guided-review/ui
```
