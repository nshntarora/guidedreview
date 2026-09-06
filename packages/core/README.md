# `@guided-review/core`

The Guided Review engine: parse a unified diff, ask the user's LLM for ordered review units and short commentary, validate that structure against the parsed diff, and fall back to one unit per file when there is no key.

Hosts (Chrome extension, CLI) supply a `ParsedDiff` + `ReviewContext` and consume validated units. The model plans structure and commentary only: code rendered to the reviewer always comes from the real parsed diff. Unknown file and hunk references are dropped during validation.

## What belongs here

- Domain types (`Diff*`, `ReviewUnit`, `ReviewPlan`, `ReviewContext`)
- Unified-diff parser and file summary
- Prompt, schema, streaming plan parse, unit validation, fallback plan
- `annotateReview` (chunk → provider → validate)
- Provider catalog and HTTP clients
- Notes markdown export and coding-agent prompt formatting

No `chrome.*`, no React, no `git` subprocesses, no GitHub HTTP.

```ts
import {
  parseDiff,
  summarizeDiff,
  buildFileReviewPlan,
  annotateReview,
  getProviderClient,
  formatNotesMarkdown,
  formatAgentPrompt,
} from "@guided-review/core";
```
