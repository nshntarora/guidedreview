import { describe, expect, it } from "vitest";
import { isCompleteReviewUnit, prefixChunkUnitId, validateAndCleanUnit } from "./reviewPlan";
import type { ParsedDiff, ReviewUnit } from "../types";

function diffFixture(): ParsedDiff {
  return {
    files: [
      {
        path: "src/foo.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/foo.ts#0",
            header: "@@ -1,1 +1,1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [],
          },
        ],
      },
    ],
  };
}

describe("validateAndCleanUnit", () => {
  function unitWith(files: ReviewUnit["files"]): ReviewUnit {
    return { id: "u1", title: "Update foo", context: "because", files };
  }

  it("keeps a unit whose file/hunk refs all exist in the diff", () => {
    const cleaned = validateAndCleanUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }]),
      diffFixture(),
    );

    expect(cleaned?.files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("drops hallucinated hunk ids but keeps the file ref if the file is real", () => {
    const cleaned = validateAndCleanUnit(
      unitWith([
        { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0", "src/foo.ts#99"], role: "core_logic" },
      ]),
      diffFixture(),
    );

    expect(cleaned?.files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("treats an empty hunkIds list as a whole-file reference and keeps it", () => {
    const cleaned = validateAndCleanUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }]),
      diffFixture(),
    );

    expect(cleaned?.files).toHaveLength(1);
    expect(cleaned?.files[0].hunkIds).toEqual([]);
  });

  it("returns null when every file ref is hallucinated", () => {
    const cleaned = validateAndCleanUnit(
      unitWith([{ fileId: "src/does-not-exist.ts", hunkIds: [], role: "core_logic" }]),
      diffFixture(),
    );

    expect(cleaned).toBeNull();
  });

  it("accepts a prebuilt known-files map as well as a diff", () => {
    const diff = diffFixture();
    const knownFiles = new Map(diff.files.map((f) => [f.path, f]));

    const cleaned = validateAndCleanUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }]),
      knownFiles,
    );

    expect(cleaned?.id).toBe("u1");
  });

  it("falls back to core_logic for an unrecognized role", () => {
    const cleaned = validateAndCleanUnit(
      unitWith([
        {
          fileId: "src/foo.ts",
          hunkIds: [],
          role: "not_a_real_role" as ReviewUnit["files"][number]["role"],
        },
      ]),
      diffFixture(),
    );

    expect(cleaned?.files[0].role).toBe("core_logic");
  });
});

describe("isCompleteReviewUnit", () => {
  it("accepts a well-formed unit and rejects incomplete objects", () => {
    expect(
      isCompleteReviewUnit({
        id: "u1",
        title: "T",
        context: "C",
        files: [{ fileId: "a.ts", hunkIds: [], role: "test" }],
      }),
    ).toBe(true);
    expect(isCompleteReviewUnit({ id: "u1", title: "T" })).toBe(false);
    expect(isCompleteReviewUnit(null)).toBe(false);
  });
});

describe("prefixChunkUnitId", () => {
  it("namespaces unit ids by chunk index", () => {
    expect(prefixChunkUnitId(0, "u1")).toBe("c0-u1");
    expect(prefixChunkUnitId(2, "add-field")).toBe("c2-add-field");
  });
});
