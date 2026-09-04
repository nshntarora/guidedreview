# `@guided-review/cli`

Local Guided Review: walk the current branch versus its base, uncommitted work, or a single commit. File-by-file until you click **Structure with AI**.

```bash
npx @guided-review/cli
npx @guided-review/cli --base main --no-open
```

Requires Node.js 22+. The binary is `guidedreview`. `npx guided-review` (unscoped, hyphen) is a different package.

The CLI binds `127.0.0.1` only. The terminal keeps a short banner (URL, diff, last pull) and logs real events, not polling. Keys live in `~/.config/guided-review/config.json`, provider env vars, or a coding agent already on the machine (Claude Code, Codex, Grok). No Guided Review backend.

See [Review local changes](https://guidedreview.dev/docs/local-review).

## From this repo

```bash
pnpm build:cli
pnpm review
pnpm review -- --base main --no-open
```

## Publish

Publishing is manual. You need membership in the `@guided-review` org on npmjs.com.

```bash
cd apps/cli
npm pkg set version=0.1.0
npm publish --access public
```

For a prerelease, add a dist-tag: `npm publish --access public --tag next`.

`prepublishOnly` builds `dist/` first. `--access public` is required for the first scoped publish.
