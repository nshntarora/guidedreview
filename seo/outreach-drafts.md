# Outreach drafts

Drafted 2026-10-21. These are notes for a human to review and send. Nothing was submitted during this run.

## 1. AlternativeTo listing

**Target:** AlternativeTo's CodeRabbit alternatives category

Guided Review is a free, Apache-2.0 alternative for engineers who want to read the diff themselves rather than receive another bot review. It turns a GitHub PR or local git diff into ordered review units, keeps the real code on screen, and leaves Comment, Approve, or Request Changes to the human. It is available as a Chrome extension for github.com and as `npx @guided-review/cli`. Users bring an Anthropic, OpenAI, or Grok key; there is no Guided Review product backend for diffs, keys, or review traffic.

Suggested categories: Code Review, Developer Tools, Google Chrome, CLI, Open Source.

## 2. Chrome Web Store description paragraph

**Why draft this:** the live description says “clustered changes, summaries, keyboard-first” but omits the two-host boundary, BYO-key path, and the fact that the reviewer decides.

Guided Review turns a github.com pull-request diff into ordered review units so you can follow related changes instead of an alphabetical file list. Bring your own Anthropic, OpenAI, or Grok key; AI structures the walkthrough, while you read the real diff and decide. Draft line comments and optionally submit Comment, Approve, or Request Changes after connecting GitHub. Free, open source, and no Guided Review backend for your diff or key.

## 3. AI code review roundup note

**Target:** [Best AI Code Review Tools (2026): 12 Tools Compared](https://aicodereview.io/blog/best-ai-code-review-tools/), fetched 2026-10-21

Subject: A human-driven category for the AI code review roundup

Your roundup compares tools that generate findings, fixes, or PR feedback. Guided Review takes a different position that may be useful to readers who still want to inspect the change themselves: AI groups a real diff into ordered review units, but never auto-approves, rejects, or reviews for the user. It works on github.com PRs through a Chrome extension and on local branch, working-tree, or commit diffs through `npx @guided-review/cli`. It is free and Apache-2.0, uses the reader's Anthropic, OpenAI, or Grok key, and has no product backend. If you add a “human-driven diff walkthrough” category, the source and product facts are at https://github.com/nshntarora/guidedreview and https://guidedreview.dev/llms.txt.

## 4. Privacy-minded tools list note

**Target:** [PrivacyTools.io](https://privacytools.io/), fetched 2026-10-21

Subject: Open-source code-review walkthrough with no product backend

Guided Review is an Apache-2.0 Chrome extension and local CLI for reading code changes. The product has no backend: the extension talks to GitHub and the user's configured AI provider, while the CLI talks directly to that provider from the local process. Extension keys stay in `chrome.storage.local`; CLI settings stay in the user's config directory. AI structuring still sends diff content to Anthropic, OpenAI, or Grok, so this is not an offline-inference claim. The traffic and storage map is documented at https://guidedreview.dev/docs/privacy-and-data, with source at https://github.com/nshntarora/guidedreview.

## 5. npm and GitHub About text

**Why draft this:** the live npm description identifies the workflow but omits the package name and never-auto-approves boundary. The live GitHub About line identifies the CLI and extension but has the same omissions.

**npm description:** `@guided-review/cli` walks a local branch, commit, or working tree as ordered review units. AI structures the walkthrough; you decide. It never auto-approves.

**npm homepage:** `https://guidedreview.dev/docs/cli`

**GitHub About:** Chrome extension and `@guided-review/cli` for ordered, human-driven review of GitHub PRs and local diffs. AI structures; it never auto-approves.
