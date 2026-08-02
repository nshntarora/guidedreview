import { describe, expect, it } from "vitest";
import type { DiffHunk } from "@extension/lib/types";
import { hasLineGapBetween, hunkEndLine, withHunkGaps } from "./hunkGaps";

function hunk(overrides: Partial<DiffHunk> & Pick<DiffHunk, "id">): DiffHunk {
  return {
    header: "@@ -1,1 +1,1 @@",
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 1,
    lines: [],
    ...overrides,
  };
}

describe("hunkEndLine", () => {
  it("prefers the new side end line", () => {
    expect(
      hunkEndLine(
        hunk({
          id: "f#0",
          oldStart: 10,
          oldLines: 5,
          newStart: 12,
          newLines: 8,
        }),
      ),
    ).toBe(19);
  });

  it("falls back to the old side when the new side is empty", () => {
    expect(
      hunkEndLine(
        hunk({
          id: "f#0",
          oldStart: 10,
          oldLines: 5,
          newStart: 0,
          newLines: 0,
        }),
      ),
    ).toBe(14);
  });

  it("returns undefined when both sides are empty", () => {
    expect(
      hunkEndLine(
        hunk({
          id: "f#0",
          oldStart: 0,
          oldLines: 0,
          newStart: 0,
          newLines: 0,
        }),
      ),
    ).toBeUndefined();
  });
});

describe("hasLineGapBetween", () => {
  it("detects a gap on the new side", () => {
    const prev = hunk({ id: "f#0", newStart: 1, newLines: 4, oldStart: 1, oldLines: 3 });
    const next = hunk({ id: "f#1", newStart: 20, newLines: 2, oldStart: 18, oldLines: 2 });
    expect(hasLineGapBetween(prev, next)).toBe(true);
  });

  it("returns false when hunks are adjacent on the new side", () => {
    const prev = hunk({ id: "f#0", newStart: 1, newLines: 4, oldStart: 1, oldLines: 3 });
    const next = hunk({ id: "f#1", newStart: 5, newLines: 2, oldStart: 4, oldLines: 2 });
    expect(hasLineGapBetween(prev, next)).toBe(false);
  });

  it("detects a gap on the old side when new sides are empty", () => {
    const prev = hunk({ id: "f#0", newStart: 0, newLines: 0, oldStart: 1, oldLines: 4 });
    const next = hunk({ id: "f#1", newStart: 0, newLines: 0, oldStart: 10, oldLines: 2 });
    expect(hasLineGapBetween(prev, next)).toBe(true);
  });
});

describe("withHunkGaps", () => {
  it("returns a single hunk unchanged", () => {
    const only = hunk({ id: "f#0", newStart: 1, newLines: 3 });
    expect(withHunkGaps([only])).toEqual([{ kind: "hunk", hunk: only }]);
  });

  it("inserts a gap between non-adjacent hunks", () => {
    const a = hunk({ id: "f#0", newStart: 1, newLines: 4, oldStart: 1, oldLines: 3 });
    const b = hunk({ id: "f#1", newStart: 20, newLines: 2, oldStart: 18, oldLines: 2 });
    expect(withHunkGaps([a, b])).toEqual([
      { kind: "hunk", hunk: a },
      { kind: "gap", afterLine: 4, key: "gap-f#0-f#1" },
      { kind: "hunk", hunk: b },
    ]);
  });

  it("does not insert a gap when hunks are adjacent", () => {
    const a = hunk({ id: "f#0", newStart: 1, newLines: 4, oldStart: 1, oldLines: 3 });
    const b = hunk({ id: "f#1", newStart: 5, newLines: 2, oldStart: 4, oldLines: 2 });
    expect(withHunkGaps([a, b])).toEqual([
      { kind: "hunk", hunk: a },
      { kind: "hunk", hunk: b },
    ]);
  });

  it("inserts a gap when a unit skips an intermediate hunk", () => {
    const first = hunk({ id: "f#0", newStart: 1, newLines: 3, oldStart: 1, oldLines: 3 });
    const third = hunk({ id: "f#2", newStart: 40, newLines: 5, oldStart: 38, oldLines: 5 });
    const seq = withHunkGaps([first, third]);
    expect(seq).toHaveLength(3);
    expect(seq[1]).toEqual({ kind: "gap", afterLine: 3, key: "gap-f#0-f#2" });
  });
});
