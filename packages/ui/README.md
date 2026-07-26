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
import {
  cn,
  Spinner,
  Kbd,
  BrandMark,
  Button,
  buttonClassName,
  Input,
  Textarea,
  Label,
  Select,
} from "@guided-review/ui";
import type { Surface, SelectOption } from "@guided-review/ui";
import "@guided-review/ui/theme.css";
import iconUrl from "@guided-review/ui/assets/icon.png";
```

### Surfaces

Shared controls accept `surface?: "app" | "overlay"`:

| Surface   | Tokens  | Used by                           |
| --------- | ------- | --------------------------------- |
| `app`     | `opt-*` | Options page, marketing site      |
| `overlay` | `gr-*`  | Review overlay (dark-only chrome) |

Defaults: form controls default to `app`; `Spinner` defaults to `overlay` for back-compat.

### Form controls

- **Button** — `variant`: `primary` | `secondary` | `destructive` | `ghost`; `size`: `sm` | `md` | `lg`. Use `buttonClassName()` on `<a>` / Next `Link` when you need a link that looks like a button.
- **Input** / **Textarea** / **Label** — standard field primitives.
- **Select** — accessible custom listbox with optional rich option content (`"use client"` for RSC hosts).

- **Source exports only** — no `build` emit step; apps transpile via Vite / Next `transpilePackages`.
- **RSC-safe by default** — keep components free of hooks/browser APIs unless marked `"use client"` (Select is the exception).

## Scripts

```bash
npm run typecheck -w @guided-review/ui
npm test -w @guided-review/ui
```
