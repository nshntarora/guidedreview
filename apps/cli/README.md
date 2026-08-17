# `@guided-review/cli`

Local Guided Review: diffs your working tree against the main branch, starts a localhost server, and opens the same walkthrough UI in the browser.

```bash
npx guided-review
npx guided-review --base main --no-open
```

The CLI binds `127.0.0.1` only. Every `/api/*` route requires the token printed in the URL. Keys live in `~/.config/guided-review/config.json` or provider env vars. No Guided Review backend.

See [Review local changes](https://guidedreview.dev/docs/local-review).
