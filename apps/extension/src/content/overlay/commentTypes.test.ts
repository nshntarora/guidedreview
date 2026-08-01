import { describe, expect, it } from "vitest";
import {
  displayLineNumber,
  formatLineRangeLabel,
  linesInSelection,
  type SelectableLine,
} from "./commentTypes";

function line(
  partial: Partial<SelectableLine> & Pick<SelectableLine, "id" | "lineIndex">,
): SelectableLine {
  return {
    filePath: "src/a.ts",
    hunkId: "src/a.ts#0",
    side: "RIGHT",
    type: "add",
    newLine: partial.lineIndex + 1,
    ...partial,
  };
}

describe("displayLineNumber", () => {
  it("returns oldLine for LEFT and newLine for RIGHT", () => {
    expect(
      displayLineNumber(
        line({ id: "l", lineIndex: 0, side: "LEFT", oldLine: 10, newLine: undefined, type: "del" }),
      ),
    ).toBe(10);
    expect(displayLineNumber(line({ id: "r", lineIndex: 1, side: "RIGHT", newLine: 22 }))).toBe(22);
  });
});

describe("linesInSelection", () => {
  const lines: SelectableLine[] = [
    line({ id: "0", lineIndex: 0, newLine: 1 }),
    line({ id: "1", lineIndex: 1, newLine: 2 }),
    line({ id: "2", lineIndex: 2, newLine: 3 }),
    line({
      id: "other",
      lineIndex: 3,
      filePath: "src/b.ts",
      hunkId: "src/b.ts#0",
      newLine: 1,
    }),
    line({
      id: "left",
      lineIndex: 4,
      side: "LEFT",
      oldLine: 5,
      newLine: undefined,
      type: "del",
    }),
  ];

  it("returns an empty array for empty input or a missing anchor", () => {
    expect(linesInSelection([], { anchorIndex: 0, focusIndex: 0 })).toEqual([]);
    expect(linesInSelection(lines, { anchorIndex: 99, focusIndex: 99 })).toEqual([]);
  });

  it("includes the inclusive range between anchor and focus", () => {
    expect(linesInSelection(lines, { anchorIndex: 0, focusIndex: 2 }).map((l) => l.id)).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(linesInSelection(lines, { anchorIndex: 2, focusIndex: 0 }).map((l) => l.id)).toEqual([
      "0",
      "1",
      "2",
    ]);
  });

  it("filters out lines on a different file or side than the anchor", () => {
    // Anchor on RIGHT a.ts index 2; focus past other-file and LEFT lines.
    const selected = linesInSelection(lines, { anchorIndex: 2, focusIndex: 4 });
    expect(selected.map((l) => l.id)).toEqual(["2"]);
  });
});

describe("formatLineRangeLabel", () => {
  it("formats a single line and a range", () => {
    expect(formatLineRangeLabel("src/a.ts", 12, 12)).toBe("src/a.ts:L12");
    expect(formatLineRangeLabel("src/a.ts", 12, 18)).toBe("src/a.ts:L12–L18");
  });
});
