import { describe, expect, it } from "vitest";
import type { DraftComment, SelectableLine } from "@guided-review/ui/review/commentTypes";
import { deriveSelection } from "./deriveSelection";

describe("deriveSelection", () => {
  it("anchors a reverse selection's composer after the last selected line on the selected side", () => {
    const lines: SelectableLine[] = [10, 11, 12].map((oldLine, lineIndex) => ({
      id: `left-${oldLine}`,
      filePath: "src/a.ts",
      hunkId: "a#0",
      lineIndex,
      side: "LEFT",
      type: "del",
      oldLine,
      content: "removed code",
    }));
    const selection = { anchorIndex: 2, focusIndex: 0 };
    const result = deriveSelection(lines, selection, true, [], new Set(["src/a.ts"]));

    expect(result.selectedIds).toEqual(new Set(lines.map((line) => line.id)));
    expect(result.focusId).toBe("left-10");
    expect(result.composerPlacementId).toBe("left-12");
    expect(result.composerRange).toEqual({ filePath: "src/a.ts", startLine: 10, endLine: 12 });
    const closed = deriveSelection(lines, selection, false, [], new Set(["src/a.ts"]));
    expect(closed.composerPlacementId).toBeNull();
    expect(closed.composerRange).toBeNull();
    expect(closed.selectedIds).toEqual(result.selectedIds);
  });

  it("groups drafts at their final line and excludes other files and empty ranges", () => {
    const draft: DraftComment = {
      id: "first",
      filePath: "src/a.ts",
      side: "RIGHT",
      startLine: 1,
      endLine: 2,
      lineIds: ["a-1", "a-2"],
      selectedCode: "code",
      body: "Check this range",
    };
    const second = { ...draft, id: "second" };
    const result = deriveSelection(
      [],
      null,
      true,
      [
        draft,
        second,
        { ...draft, id: "other-file", filePath: "src/b.ts" },
        { ...draft, id: "empty", lineIds: [] },
      ],
      new Set(["src/a.ts"]),
    );

    expect(result.draftsByEndLineId).toEqual(new Map([["a-2", [draft, second]]]));
    expect(result.composerPlacementId).toBeNull();
    expect(result.composerRange).toBeNull();
  });
});
