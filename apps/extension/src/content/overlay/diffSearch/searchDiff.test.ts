import { describe, expect, it } from "vitest";
import type { ParsedDiff } from "../../../lib/types";
import { buildDiffSearchIndex } from "./buildDiffSearchIndex";
import { searchDiff } from "./searchDiff";

function sampleDiff(): ParsedDiff {
  return {
    files: [
      {
        path: "src/auth/login.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/auth/login.ts#0",
            header: "@@ -1 +1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [
              { type: "add", content: "export function authenticate() {}", newLine: 1 },
              { type: "context", content: "// unrelated helper", oldLine: 2, newLine: 2 },
            ],
          },
        ],
      },
      {
        path: "src/utils/format.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/utils/format.ts#0",
            header: "@@ -1 +1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: "return loginName;", newLine: 1 }],
          },
        ],
      },
    ],
  };
}

describe("searchDiff", () => {
  const docs = buildDiffSearchIndex(sampleDiff());

  it("returns empty for blank queries", () => {
    expect(searchDiff(docs, "")).toEqual([]);
    expect(searchDiff(docs, "   ")).toEqual([]);
  });

  it("returns empty for an empty index", () => {
    expect(searchDiff([], "login")).toEqual([]);
  });

  it("ranks file path matches above content matches", () => {
    // "login" matches path src/auth/login.ts and content "return loginName"
    const results = searchDiff(docs, "login");
    expect(results.length).toBeGreaterThan(0);
    const firstFile = results.find((r) => r.kind === "file");
    const firstLine = results.find((r) => r.kind === "line");
    expect(firstFile).toBeDefined();
    expect(firstLine).toBeDefined();
    const fileIdx = results.findIndex((r) => r.kind === "file");
    const lineIdx = results.findIndex((r) => r.kind === "line");
    expect(fileIdx).toBeLessThan(lineIdx);
  });

  it("finds content matches with file path and line body", () => {
    const results = searchDiff(docs, "authenticate");
    const line = results.find((r) => r.kind === "line");
    expect(line).toMatchObject({
      kind: "line",
      filePath: "src/auth/login.ts",
      content: "export function authenticate() {}",
    });
  });

  it("respects the result limit", () => {
    const results = searchDiff(docs, "src", 1);
    expect(results).toHaveLength(1);
  });
});
