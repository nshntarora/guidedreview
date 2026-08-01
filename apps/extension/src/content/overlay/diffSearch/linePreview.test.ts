import { describe, expect, it } from "vitest";
import type { DiffSearchDoc } from "./types";
import { buildLinePreview } from "./linePreview";

function lineDocs(): DiffSearchDoc[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    kind: "line" as const,
    id: `src/a.ts#0:${i}:RIGHT`,
    path: "src/a.ts",
    content: `line ${i}`,
    filePath: "src/a.ts",
    hunkId: "src/a.ts#0",
    lineIndex: i,
    side: "RIGHT" as const,
    lineType: "context" as const,
  }));
}

describe("buildLinePreview", () => {
  it("returns match ± context within the hunk", () => {
    const docs = lineDocs();
    const result = {
      ...docs[2],
      kind: "line" as const,
      score: 0,
    };
    const preview = buildLinePreview(docs, result, 2);
    expect(preview.map((p) => p.lineIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(preview.filter((p) => p.isMatch)).toHaveLength(1);
    expect(preview.find((p) => p.isMatch)?.content).toBe("line 2");
  });

  it("clamps context at the start of the hunk", () => {
    const docs = lineDocs();
    const result = { ...docs[0], kind: "line" as const, score: 0 };
    const preview = buildLinePreview(docs, result, 2);
    expect(preview.map((p) => p.lineIndex)).toEqual([0, 1, 2]);
  });

  it("clamps context at the end of the hunk", () => {
    const docs = lineDocs();
    const result = { ...docs[4], kind: "line" as const, score: 0 };
    const preview = buildLinePreview(docs, result, 2);
    expect(preview.map((p) => p.lineIndex)).toEqual([2, 3, 4]);
  });
});
