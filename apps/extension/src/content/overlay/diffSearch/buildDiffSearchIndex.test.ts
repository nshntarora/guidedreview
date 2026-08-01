import { describe, expect, it } from "vitest";
import type { ParsedDiff } from "../../../lib/types";
import { buildDiffSearchIndex } from "./buildDiffSearchIndex";

function sampleDiff(): ParsedDiff {
  return {
    files: [
      {
        path: "src/foo.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/foo.ts#0",
            header: "@@ -1,2 +1,3 @@",
            oldStart: 1,
            oldLines: 2,
            newStart: 1,
            newLines: 3,
            lines: [
              { type: "context", content: "export function foo() {", oldLine: 1, newLine: 1 },
              { type: "del", content: "  return 1;", oldLine: 2 },
              { type: "add", content: "  return 2;", newLine: 2 },
              { type: "context", content: "}", oldLine: 3, newLine: 3 },
            ],
          },
        ],
      },
      {
        path: "assets/logo.png",
        status: "added",
        isBinaryOrElided: true,
        hunks: [],
      },
      {
        path: "src/bar.ts",
        previousPath: "src/old-bar.ts",
        status: "renamed",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/bar.ts#0",
            header: "@@ -1 +1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: "export const bar = true;", newLine: 1 }],
          },
        ],
      },
    ],
  };
}

describe("buildDiffSearchIndex", () => {
  it("indexes one file doc per file and one line doc per hunk line", () => {
    const docs = buildDiffSearchIndex(sampleDiff());
    const files = docs.filter((d) => d.kind === "file");
    const lines = docs.filter((d) => d.kind === "line");

    expect(files.map((f) => f.filePath)).toEqual(["src/foo.ts", "assets/logo.png", "src/bar.ts"]);
    // foo: 4 lines, bar: 1 line, binary: 0
    expect(lines).toHaveLength(5);
  });

  it("uses stable DOM line ids matching hunk:index:side", () => {
    const docs = buildDiffSearchIndex(sampleDiff());
    const del = docs.find((d) => d.kind === "line" && d.lineType === "del");
    const add = docs.find(
      (d) => d.kind === "line" && d.lineType === "add" && d.filePath === "src/foo.ts",
    );

    expect(del?.id).toBe("src/foo.ts#0:1:LEFT");
    expect(add?.id).toBe("src/foo.ts#0:2:RIGHT");
  });

  it("skips line docs for binary/elided files but keeps the path", () => {
    const docs = buildDiffSearchIndex(sampleDiff());
    expect(docs.some((d) => d.kind === "file" && d.filePath === "assets/logo.png")).toBe(true);
    expect(docs.some((d) => d.kind === "line" && d.filePath === "assets/logo.png")).toBe(false);
  });

  it("includes previousPath in the searchable path for renames", () => {
    const docs = buildDiffSearchIndex(sampleDiff());
    const renamed = docs.find((d) => d.kind === "file" && d.filePath === "src/bar.ts");
    expect(renamed?.kind).toBe("file");
    if (renamed?.kind === "file") {
      expect(renamed.path).toContain("src/old-bar.ts");
      expect(renamed.path).toContain("src/bar.ts");
      expect(renamed.previousPath).toBe("src/old-bar.ts");
    }
  });

  it("returns empty for an empty diff", () => {
    expect(buildDiffSearchIndex({ files: [] })).toEqual([]);
  });
});
