# Guided Review UX ideas

Status: proposed backlog, not implementation commitments. These ideas build on the unified workspace in [UX_IMPROVEMENT_1_PLAN.md](./UX_IMPROVEMENT_1_PLAN.md).

Priorities below reflect the current code and the friction described in this task. Validate them through actual review sessions before committing to larger features. Existing diff search, comments, image diffs, local scope selection, stale-snapshot refresh, and prompt export should be improved where useful rather than rebuilt.

| Priority | Idea                             | Reviewer benefit                                 | Relative effort |
| -------- | -------------------------------- | ------------------------------------------------ | --------------- |
| Next     | Explicit review progress         | Know what still needs human attention            | Medium          |
| Next     | A notes inbox                    | Find and finish draft feedback                   | Medium          |
| Next     | Better search discovery          | Reach a file or line without scanning navigation | Small           |
| Next     | Clear snapshot and scope context | Know exactly which changes are under review      | Small–medium    |
| Later    | Linked unit/file navigation      | Move between a theme and its implementation      | Medium          |
| Later    | Focused reading controls         | Give wide diffs enough space                     | Small–medium    |
| Later    | Remember the reading position    | Resume without searching for the last hunk       | Medium          |
| Later    | Stronger generation controls     | Keep reading when provider work is slow or fails | Medium          |
| Later    | Progressive shortcut help        | Learn useful keys during real work               | Small           |
| Explore  | Explain grouping decisions       | Understand why changes are adjacent              | Medium–large    |

## 1. Track explicit review progress

Problem: visiting the last item is not evidence that a person reviewed everything. Existing footer position communicates where the reader is, not what is complete.

Proposal: add an explicit “Mark reviewed” action and an “Unreviewed” filter. Keep visited, selected, and reviewed distinct. Start with file-level completion; marking a unit reviewed can mark its referenced hunks, with a file complete only when all available changed hunks are covered. Define binary/elided file acknowledgement separately. Never infer completion from AI generation or scrolling.

First slice: file-level marking, undo, and a remaining-files count. Defer automatic aggregation across overlapping units until the rules are clear. Reset or invalidate affected completion when the diff snapshot changes.

Validation: a reviewer can leave and return, find remaining files, and explain why a partially covered file is still incomplete. Completion never submits or approves a review.

## 2. Turn the notes count into a useful inbox

Problem: inline drafts are easy to create but harder to find across many files and units.

Proposal: make the existing notes count open a compact list grouped by file, with a preview and jump-to-line action. Support editing and deletion using existing composer behavior. Surface the existing submit/export actions from the same place, preserving host differences.

First slice: list drafts and reveal their original lines. Route through Files when no AI unit covers the location. Keep one canonical draft record so the inbox and inline comment cannot diverge.

Validation: create notes in multiple units, find one through the inbox, edit it, and export/submit each note exactly once. Handle elided or outdated locations with an explanation instead of a broken jump.

## 3. Make existing search easier to discover

Problem: the app already searches files and diff content, but a keyboard shortcut alone is easy to miss.

Proposal: add a compact search trigger near navigation with the existing shortcut hint. Clearly identify file results and changed-line results. In the unified workspace, results must always open the actual file even when grouping is incomplete.

First slice: expose the existing palette and fix mode-aware result routing. Add path filtering inside Files only if sessions show that the palette does not cover the need; avoid two competing search systems initially.

Validation: someone unfamiliar with the shortcuts reaches a deeply nested file and a matching changed line without expanding the whole tree.

## 4. Clarify the snapshot being reviewed

Problem: a local scope label, branch refs, and stale-state refresh are useful but can still leave a reader unsure whether newly edited code is included.

Proposal: make the current scope/base/head visible near the title, with an expandable explanation of included changes. Extend the existing local stale-snapshot indication with a clear “Reviewing an earlier snapshot” message and Refresh action. Explain the effect on notes and progress before refreshing if locations can become stale.

First slice: clarify existing CLI scope and stale-state UI. For GitHub, inspect available metadata and fetch behavior before proposing equivalent new-change detection.

Validation: a reviewer can state which branch/commit/working-tree snapshot they are reading and refresh deliberately without silently attaching feedback to different lines.

## 5. Link review units and files explicitly

Problem: thematic grouping helps order a review, but users still need to understand which files and hunks belong to each unit.

Proposal: expose a unit's files beneath its title and add “Related review units” to a file header. Show multiple memberships honestly when a file contributes hunks to several units. Selecting a related unit opens its scoped diff; returning to Files restores the full-file position.

First slice: lightweight links built from existing file/hunk references. Avoid duplicating AI commentary across the tree.

Validation: a reviewer can move from a unit to one of its files and back, understanding when they are seeing selected hunks versus the whole available diff.

## 6. Add a focused reading mode

Problem: large sidebars and long commentary compete with code, especially in split view.

Proposal: let reviewers collapse navigation and long commentary while retaining a visible current-item label and a way to reopen them. Keep existing unified/split controls easy to reach. Start with collapse controls; add resizing only if fixed widths remain a demonstrated problem.

First slice: accessible collapse/reopen actions on desktop, complementing the narrow-screen drawer from the workspace plan.

Validation: a wide diff becomes easier to read, and users can still identify their location and reach another file with the keyboard. Do not hide necessary actions behind hover alone.

## 7. Resume at the actual reading position

Problem: returning to a long file or unit can require finding the same hunk again even when item selection was remembered.

Proposal: extend the workspace plan's within-session position restoration to persisted reopening. Prefer a stable file/hunk/line anchor over a raw pixel offset. Make persistence tolerant of old sessions and missing anchors; scope positions to the diff snapshot.

First slice: persist the last selected item and nearest stable changed-line anchor. Do not store a large per-line history or introduce cross-device synchronization.

Validation: reopen the same review and resume near the previous code; changed snapshots fall back predictably without suggesting the reader already reviewed new code.

## 8. Improve generation control and recovery

Problem: a long provider response can interrupt reading, and a retry may feel like restarting the whole review.

Proposal: complement the workspace plan's nonblocking generation with a Stop action and a clear status showing completed units. Retain validated partial results with an incomplete label; offer retry without discarding files or drafts. Explain provider failures with a concrete next action.

First slice: connect existing cancellation capabilities to a visible control, checking both extension and CLI lifecycle behavior. Keep regeneration explicit because it can change grouping and incur provider usage.

Validation: stop or fail generation midway, keep reading files, retry deliberately, and retain notes and reading position. Never label a partial plan complete.

## 9. Teach shortcuts progressively

Problem: a large shortcut list in the commentary area consumes space before the user knows which controls matter.

Proposal: show a few contextual hints at existing controls and a single accessible shortcut reference. Explain navigation keys while browsing, selection keys while commenting, and save keys in the composer. Reuse the existing shortcut components and respect host-specific capabilities.

First slice: consolidate the current hints after the workspace layout lands. Avoid first-run tours, blocking tips, or repeated popovers.

Validation: a new reviewer can navigate and add a multiline note with the keyboard; an experienced reviewer can keep the workspace quiet. The shortcut reference must not steal keys from the composer or tabs.

## 10. Explore explaining the grouping

Problem: users may not understand why distant files appear together or why a particular unit comes first.

Proposal: first surface existing unit commentary and file-role information more clearly. If that is insufficient, explore a short optional grouping rationale backed by real file/hunk references. Distinguish model-inferred intent from facts visible in the diff.

First slice: evaluate whether the current plan already contains enough information. Avoid a new provider call or schema field until a concrete gap is established. Manual unit reordering or merging is a separate, larger proposal.

Validation: reviewers can explain a unit's purpose and return to its referenced code. No rationale claims the model verified correctness or replaces a human review decision.

## Suggested order

Ship the unified workspace first. Then evaluate notes discovery, explicit progress, and search discovery during representative reviews. Improve snapshot clarity alongside any persistence work. Keep grouping customization and additional provider-generated explanations exploratory until the simpler navigation has been used in practice.

Use existing tests for meaningful interactions and short observed review sessions for usability feedback. These ideas do not require a product backend or new telemetry.
