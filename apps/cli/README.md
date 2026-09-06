![Guided Review](https://raw.githubusercontent.com/nshntarora/guidedreview/main/packages/ui/src/assets/icons/icon128.png)

# Guided Review CLI

Review your own code before you open the pull request. Guided Review walks a local branch, commit, or working tree in the browser as ordered **review units**.

1. Run `npx @guided-review/cli` in a repo.
2. Pick what to compare: branch vs base, uncommitted work, or a single commit.
3. Follow the walkthrough file-by-file, or hit **Structure With AI** to group related changes and add short context. The code comes from the real diff — **you still read it and decide**.

Free, open source, bring your own LLM key. The CLI binds localhost only and talks directly to your AI provider (or uses credentials from a coding agent already on the machine). Guided Review has no product backend.

```bash
npx @guided-review/cli
```

Requires Node.js 22+. The binary is `guidedreview`. `npx guided-review` (unscoped, hyphen) is a different package.

Site and docs: [guidedreview.dev](https://guidedreview.dev) · [CLI](https://guidedreview.dev/docs/cli). For GitHub pull requests, use the [Chrome extension](https://chromewebstore.google.com/detail/pdnnimoajmnjpccboemeomoeomancodd).

- [Why?](#why)
- [Quick start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [License](#license)

## Why?

AI agents are writing a lot of the code on your branches. Review agents help find bugs and edge cases you missed — useful — but they are not a replacement for you. They lack taste: product context, people, when an abstraction is unnecessary, when to break the rules.

Nothing beats reading the code. A raw `git diff` or an alphabetical file list still leaves you to reconstruct the story. That was awkward for human-written diffs; for large AI-shaped changes it is actively hostile.

Guided Review uses AI only where it helps: grouping related hunks into a walkable order and adding short commentary you can take or ignore. It does not auto-approve, and it does not supply the code you see. You still decide.

The Chrome extension does this on GitHub PRs. This CLI does the same for local work — before you open the PR, or when there is no PR at all.

## Quick start

```bash
npx @guided-review/cli
```

The CLI starts a local server on `127.0.0.1:7182`, prints a short terminal banner (URL, diff, last pull), and opens the browser UI. Override the port with `--port`; `--port 0` picks any free port. Ctrl+C stops the server.

```bash
npx @guided-review/cli --base main --no-open
npx @guided-review/cli --staged --agent claude-code
```

## Usage

The header shows the current branch and the base branch. A dropdown picks the diff:

- **Branch vs base** — committed work since the branch diverged (`git diff <merge-base> HEAD`)
- **Uncommitted** — staged and unstaged work versus `HEAD` (untracked included unless `--no-untracked`)
- **Unstaged** — worktree versus the index only
- **A specific commit** — that commit’s patch

Default scope: the first non-empty of branch, uncommitted, unstaged, then the newest commit. `--staged` starts on index-only uncommitted work. Base resolution: `--base` → `origin/HEAD` → `main` → `master`.

The walkthrough starts one unit per file. **Structure With AI** on the Change summary card is the opt-in LLM call — it groups related files and adds context; it does not review for you. Line notes stay in the running session (no GitHub submit). **Generate Prompt** builds a coding-agent prompt from those notes and copies it — Guided Review does not send it anywhere.

| Flag              | What                                    |
| ----------------- | --------------------------------------- |
| `--base <ref>`    | Base branch                             |
| `--port <n>`      | Listen port (default `7182`)            |
| `--no-open`       | Print the URL without opening a browser |
| `--staged`        | Start on staged changes                 |
| `--no-untracked`  | Skip untracked files                    |
| `--provider <id>` | `anthropic` \| `openai` \| `grok`       |
| `--model <id>`    | Provider model id                       |
| `--agent <id>`    | `claude-code` \| `codex` \| `grok`      |

Full flag detail and keyboard shortcuts: [CLI](https://guidedreview.dev/docs/cli) · [Keyboard shortcuts](https://guidedreview.dev/docs/keyboard-shortcuts#local-review).

## Configuration

Same providers as the extension: Anthropic, OpenAI, Grok.

Keys resolve in order:

1. `--provider` / `--model` / `--agent` and env (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` or `GROK_API_KEY`)
2. A key saved in `~/.config/guided-review/config.json`
3. A coding agent already on this machine (Claude Code, Codex, or Grok)

No key still walks one unit per file; **Structure With AI** asks for one. In the UI, open **Settings** (`⌘/Ctrl` + `,`) to paste an API key or turn on **Use My Subscription** to use an agent already logged in on the machine. The agent token stays in that agent's store. A saved API key always wins for that machine; flags and env still win for the current run.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
