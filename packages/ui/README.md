# `@guided-review/ui`

Shared design tokens, brand assets, and presentational components for Guided Review apps.

## What belongs here

Add a module when **all** are true:

- A general presentational primitive (form control, layout chrome, status) — even before a second app uses it
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
  Button,
  buttonClassName,
  Input,
  Textarea,
  Label,
  Select,
  Toggle,
  Card,
  Callout,
  HelpDetails,
  ModalShell,
  CloseIcon,
  CloseButton,
  ProviderIcon,
  confirm,
  ConfirmationHost,
} from "@guided-review/ui";
import type { SelectOption, ConfirmOptions } from "@guided-review/ui";
import "@guided-review/ui/theme.css";
import iconUrl from "@guided-review/ui/assets/icon.png";
```

### Design tokens

One dark palette in `src/styles/theme.css` (`@theme` → Tailwind utilities + `var(--color-*)`):

| Token                                                                | Utilities           | Role                       |
| -------------------------------------------------------------------- | ------------------- | -------------------------- |
| `background`                                                         | `bg-background`     | Page / chrome root         |
| `surface`                                                            | `bg-surface`        | Main panels                |
| `surface-raised`                                                     | `bg-surface-raised` | Cards, inputs              |
| `surface-muted`                                                      | `bg-surface-muted`  | Hover / inset              |
| `foreground`                                                         | `text-foreground`   | Body text                  |
| `muted`                                                              | `text-muted`        | Secondary text             |
| `faint`                                                              | `text-faint`        | Placeholders, line numbers |
| `border` / `border-strong`                                           | `border-border`     | UI borders                 |
| `primary` / `primary-hover` / `primary-foreground` / `primary-muted` | `bg-primary`, …     | Brand lime                 |
| `success` / `danger` / `danger-muted`                                | `text-success`, …   | Status                     |
| `diff-add` / `diff-del` (+ `-bg`)                                    | `text-diff-add`, …  | Diff chrome                |
| `syntax-*`                                                           | —                   | highlight.js (SCSS)        |

Used by the marketing site, options page, welcome page, and review overlay.

### Form controls

- **Button** — `variant`: `primary` | `secondary` | `destructive` | `ghost`; `size`: `sm` | `md` | `lg`. Use `buttonClassName()` on `<a>` / Next `Link` when you need a link that looks like a button.
- **Input** / **Textarea** / **Label** — standard field primitives.
- **Select** — accessible custom listbox with optional rich option content (`"use client"` for RSC hosts).
- **Toggle** — WAI-ARIA switch.
- **Card** — bordered section with title and optional description.
- **Callout** — ok / error status strip.
- **HelpDetails** — disclosure for secondary help copy.
- **ModalShell** / **CloseIcon** / **CloseButton** — scrim + panel and close-X used by dialogs.
- **ProviderIcon** — decorative provider logo (`src` + optional invert for dark-on-transparent marks).
- **confirm** / **ConfirmationHost** — queued confirmation dialog. Mount `ConfirmationHost` once in the React root that needs it.

- **Source exports only** — no `build` emit step; apps transpile via Vite / Next `transpilePackages`.
- **RSC-safe by default** — keep components free of hooks/browser APIs unless marked `"use client"` (Select and confirmation are the exceptions).

## Scripts

```bash
npm run typecheck -w @guided-review/ui
npm test -w @guided-review/ui
```
