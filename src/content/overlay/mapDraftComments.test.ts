import { describe, expect, it } from "vitest";
import type { DraftComment } from "./commentTypes";
import { mapDraftsToReviewComments } from "./mapDraftComments";

const base: Omit<DraftComment, "startLine" | "endLine" | "side"> = {
  id: "d1",
  filePath: "src/app.ts",
  lineIds: ["h#0:1:RIGHT"],
  body: "Looks off",
};

describe("mapDraftsToReviewComments", () => {
  it("maps a single-line comment without start_line fields", () => {
    const drafts: DraftComment[] = [
      { ...base, side: "RIGHT", startLine: 10, endLine: 10 },
    ];
    expect(mapDraftsToReviewComments(drafts)).toEqual([
      {
        path: "src/app.ts",
        body: "Looks off",
        side: "RIGHT",
        line: 10,
      },
    ]);
  });

  it("maps a multi-line range with startLine and startSide", () => {
    const drafts: DraftComment[] = [
      {
        ...base,
        id: "d2",
        side: "LEFT",
        startLine: 3,
        endLine: 7,
        body: "Range",
      },
    ];
    expect(mapDraftsToReviewComments(drafts)).toEqual([
      {
        path: "src/app.ts",
        body: "Range",
        side: "LEFT",
        line: 7,
        startLine: 3,
        startSide: "LEFT",
      },
    ]);
  });

  it("returns an empty list for no drafts", () => {
    expect(mapDraftsToReviewComments([])).toEqual([]);
  });
});
