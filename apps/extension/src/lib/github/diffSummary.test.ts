import { describe, expect, it } from "vitest";
import type { DiffFile, DiffHunk, ParsedDiff } from "@extension/lib/types";
import { summarizeDiff } from "./diffSummary";

function hunk(lines: Array<{ type: "add" | "del" | "context"; content: string }>): DiffHunk {
  return {
    id: "f#0",
    header: "@@ -1 +1 @@",
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 1,
    lines: lines.map((l, i) => ({
      ...l,
      oldLine: l.type === "add" ? undefined : i + 1,
      newLine: l.type === "del" ? undefined : i + 1,
    })),
  };
}

function file(overrides: Partial<DiffFile> & { path: string }): DiffFile {
  return {
    status: "modified",
    isBinaryOrElided: false,
    hunks: [],
    ...overrides,
  };
}

describe("summarizeDiff", () => {
  it("returns zeros for an empty diff", () => {
    const summary = summarizeDiff({ files: [] });
    expect(summary).toEqual({
      files: 0,
      additions: 0,
      deletions: 0,
      fileSummaries: [],
    });
  });

  it("counts total and per-file additions/deletions", () => {
    const diff: ParsedDiff = {
      files: [
        file({
          path: "a.ts",
          status: "modified",
          hunks: [
            hunk([
              { type: "del", content: "old" },
              { type: "add", content: "new" },
              { type: "context", content: "keep" },
              { type: "add", content: "more" },
            ]),
          ],
        }),
        file({
          path: "b.ts",
          status: "added",
          hunks: [hunk([{ type: "add", content: "only" }])],
        }),
      ],
    };

    const summary = summarizeDiff(diff);
    expect(summary.files).toBe(2);
    expect(summary.additions).toBe(3);
    expect(summary.deletions).toBe(1);
    expect(summary.fileSummaries).toEqual([
      {
        path: "a.ts",
        previousPath: undefined,
        status: "modified",
        additions: 2,
        deletions: 1,
        isBinaryOrElided: false,
      },
      {
        path: "b.ts",
        previousPath: undefined,
        status: "added",
        additions: 1,
        deletions: 0,
        isBinaryOrElided: false,
      },
    ]);
  });

  it("preserves file order and rename/removed metadata", () => {
    const diff: ParsedDiff = {
      files: [
        file({
          path: "gone.ts",
          status: "removed",
          hunks: [hunk([{ type: "del", content: "x" }])],
        }),
        file({
          path: "new-name.ts",
          previousPath: "old-name.ts",
          status: "renamed",
          hunks: [],
        }),
      ],
    };

    const summary = summarizeDiff(diff);
    expect(summary.fileSummaries.map((f) => f.status)).toEqual(["removed", "renamed"]);
    expect(summary.fileSummaries[1].previousPath).toBe("old-name.ts");
    expect(summary.deletions).toBe(1);
    expect(summary.additions).toBe(0);
  });

  it("lists binary/elided files with zero line counts", () => {
    const summary = summarizeDiff({
      files: [file({ path: "logo.png", status: "modified", isBinaryOrElided: true, hunks: [] })],
    });
    expect(summary.fileSummaries[0]).toMatchObject({
      path: "logo.png",
      isBinaryOrElided: true,
      additions: 0,
      deletions: 0,
    });
    expect(summary.files).toBe(1);
  });
});
