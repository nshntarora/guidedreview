import { describe, expect, it } from "vitest";
import type { ParsedDiff, ReviewPlan } from "@extension/lib/types";
import {
  buildDiffSearchIndex,
  buildLinePreview,
  fallbackMatchRanges,
  findUnitForFile,
  highlightSegments,
  searchDiff,
  type DiffSearchDoc,
} from "./diffSearch";

// ---- Index ------------------------------------------------------------------

function sampleIndexDiff(): ParsedDiff {
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
    const docs = buildDiffSearchIndex(sampleIndexDiff());
    const files = docs.filter((d) => d.kind === "file");
    const lines = docs.filter((d) => d.kind === "line");

    expect(files.map((f) => f.filePath)).toEqual(["src/foo.ts", "assets/logo.png", "src/bar.ts"]);
    // foo: 4 lines, bar: 1 line, binary: 0
    expect(lines).toHaveLength(5);
  });

  it("uses stable DOM line ids matching hunk:index:side", () => {
    const docs = buildDiffSearchIndex(sampleIndexDiff());
    const del = docs.find((d) => d.kind === "line" && d.lineType === "del");
    const add = docs.find(
      (d) => d.kind === "line" && d.lineType === "add" && d.filePath === "src/foo.ts",
    );

    expect(del?.id).toBe("src/foo.ts#0:1:LEFT");
    expect(add?.id).toBe("src/foo.ts#0:2:RIGHT");
  });

  it("skips line docs for binary/elided files but keeps the path", () => {
    const docs = buildDiffSearchIndex(sampleIndexDiff());
    expect(docs.some((d) => d.kind === "file" && d.filePath === "assets/logo.png")).toBe(true);
    expect(docs.some((d) => d.kind === "line" && d.filePath === "assets/logo.png")).toBe(false);
  });

  it("includes previousPath in the searchable path for renames", () => {
    const docs = buildDiffSearchIndex(sampleIndexDiff());
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

// ---- Search -----------------------------------------------------------------

function sampleSearchDiff(): ParsedDiff {
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
  const docs = buildDiffSearchIndex(sampleSearchDiff());

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

// ---- Unit lookup ------------------------------------------------------------

function planFixture(): ReviewPlan {
  return {
    units: [
      {
        id: "u0",
        title: "Auth",
        kind: "change",
        context: "login flow",
        files: [
          { fileId: "src/auth/login.ts", hunkIds: ["src/auth/login.ts#0"], role: "core_logic" },
        ],
      },
      {
        id: "u1",
        title: "Utils",
        kind: "change",
        context: "helpers",
        files: [{ fileId: "src/utils/format.ts", hunkIds: [], role: "core_logic" }],
      },
      {
        id: "u2",
        title: "Tests for Auth",
        kind: "tests",
        context: "login tests",
        files: [{ fileId: "src/auth/login.ts", hunkIds: ["src/auth/login.ts#1"], role: "test" }],
      },
    ],
  };
}

describe("findUnitForFile", () => {
  it("returns null for a null plan", () => {
    expect(findUnitForFile(null, "src/foo.ts")).toBeNull();
  });

  it("returns null when no unit references the file", () => {
    expect(findUnitForFile(planFixture(), "missing.ts")).toBeNull();
  });

  it("skips the description unit and returns the first review unit with the file", () => {
    // display index 0 = PR description; first review unit with login.ts is index 1
    expect(findUnitForFile(planFixture(), "src/auth/login.ts")).toBe(1);
  });

  it("prefers the unit that owns the specific hunk when provided", () => {
    // login.ts#1 is only on the tests unit → display index 3
    expect(findUnitForFile(planFixture(), "src/auth/login.ts", "src/auth/login.ts#1")).toBe(3);
    // login.ts#0 is on u0 → display index 1
    expect(findUnitForFile(planFixture(), "src/auth/login.ts", "src/auth/login.ts#0")).toBe(1);
  });

  it("falls back to whole-file refs when hunk list is empty", () => {
    expect(findUnitForFile(planFixture(), "src/utils/format.ts", "src/utils/format.ts#0")).toBe(2);
  });
});

// ---- Line preview -----------------------------------------------------------

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

// ---- Match highlighting -----------------------------------------------------

describe("highlightSegments", () => {
  it("returns the full text unhighlighted when ranges are empty", () => {
    expect(highlightSegments("hello world", undefined)).toEqual([
      { text: "hello world", highlight: false },
    ]);
    expect(highlightSegments("hello world", [])).toEqual([
      { text: "hello world", highlight: false },
    ]);
  });

  it("splits around inclusive Fuse ranges", () => {
    // highlight "world" in "hello world"
    expect(highlightSegments("hello world", [[6, 10]])).toEqual([
      { text: "hello ", highlight: false },
      { text: "world", highlight: true },
    ]);
  });

  it("merges overlapping ranges", () => {
    expect(
      highlightSegments("abcdefgh", [
        [1, 3],
        [2, 5],
      ]),
    ).toEqual([
      { text: "a", highlight: false },
      { text: "bcdef", highlight: true },
      { text: "gh", highlight: false },
    ]);
  });
});

describe("fallbackMatchRanges", () => {
  it("finds a case-insensitive substring", () => {
    expect(fallbackMatchRanges("export function Foo", "foo")).toEqual([[16, 18]]);
  });

  it("returns empty when absent", () => {
    expect(fallbackMatchRanges("hello", "xyz")).toEqual([]);
    expect(fallbackMatchRanges("hello", "")).toEqual([]);
  });
});
