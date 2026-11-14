import { expect, it } from "vitest";
import { parseDiff } from "@guided-review/core";
import { reconcileFeedback } from "./reconcileFeedback";
import type { DraftComment } from "./commentTypes";

it("restores matching and moved notes while preserving changed or ambiguous source", () => {
  const diff = parseDiff(`diff --git a/file.ts b/file.ts
new file mode 100644
--- /dev/null
+++ b/file.ts
@@ -0,0 +1,6 @@
+unchanged
+inserted
+moved
+duplicate
+duplicate
+updated
`);
  const note = (id: string, startLine: number, selectedCode: string): DraftComment => ({
    id,
    filePath: "file.ts",
    side: "RIGHT",
    startLine,
    endLine: startLine,
    selectedCode,
    body: id,
    lineIds: [],
    unresolved: true,
  });
  const result = reconcileFeedback(
    diff,
    [
      note("same", 1, "unchanged"),
      note("moved", 2, "moved"),
      note("ambiguous", 8, "duplicate"),
      note("changed", 6, "original"),
      { ...note("missing", 1, "unchanged"), filePath: "removed.ts" },
    ],
    {},
  );
  expect(
    result.draftComments.map(({ id, startLine, unresolved }) => ({ id, startLine, unresolved })),
  ).toEqual([
    { id: "same", startLine: 1, unresolved: false },
    { id: "moved", startLine: 3, unresolved: false },
    { id: "ambiguous", startLine: 8, unresolved: true },
    { id: "changed", startLine: 6, unresolved: true },
    { id: "missing", startLine: 1, unresolved: true },
  ]);
  expect(result.draftComments[1].lineIds).toHaveLength(1);
});
