# `@guided-review/core`

The Guided Review engine: parse a unified diff, cluster it into ordered review units, stream summaries from the user's LLM, and fall back to one unit per file when there is no key.

Hosts (Chrome extension, CLI) supply a `ParsedDiff` + `ReviewContext` and consume validated units. They do not cluster, summarize, or invent hunks.

## What belongs here

- Domain types (`Diff*`, `ReviewUnit`, `ReviewPlan`, `ReviewContext`)
- Unified-diff parser and file summary
- Prompt, schema, stream parse, unit validation, fallback plan
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
