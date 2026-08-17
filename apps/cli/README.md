# `@guided-review/cli`

Local Guided Review: diffs your working tree against the main branch, starts a localhost server, and opens the same walkthrough UI in the browser.

```bash
npm run build:cli
npm run review
npm run review -- --base main --no-open
```

Do not run `npx guided-review` — that name is taken on npm by another tool (Bun shebang). This package is `@guided-review/cli` and is workspace-only for now.

The CLI binds `127.0.0.1` only. Every `/api/*` route requires the token printed in the URL. Keys live in `~/.config/guided-review/config.json` or provider env vars. No Guided Review backend.

See [Review local changes](https://guidedreview.dev/docs/local-review).
