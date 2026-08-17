# `@guided-review/cli`

Local Guided Review: opens a localhost walkthrough of the current branch versus its base, or of uncommitted / unstaged work, or of a single commit. File-by-file until you click **Structure with AI**.

```bash
npm run build:cli
npm run review
npm run review -- --base main --no-open
```

Do not run `npx guided-review` — that name is taken on npm by another tool (Bun shebang). This package is `@guided-review/cli` and is workspace-only for now.

The CLI binds `127.0.0.1` only. Every `/api/*` route requires the token printed in the URL. Keys live in `~/.config/guided-review/config.json`, provider env vars, or a coding agent already on the machine (Claude Code, Codex, Grok). No Guided Review backend.

See [Review local changes](https://guidedreview.dev/docs/local-review).
