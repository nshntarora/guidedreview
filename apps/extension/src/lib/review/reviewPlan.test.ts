import { describe, expect, it } from "vitest";
import { parseReviewUnit } from "./reviewPlan";
import type { DiffFile, ReviewUnit } from "../types";

/** The known-files map `parseReviewUnit` validates against. */
function diffFixture(): Map<string, DiffFile> {
  const file: DiffFile = {
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
  };
  return new Map([[file.path, file]]);
}

function unitWith(files: unknown): unknown {
  return { id: "u1", title: "Update foo", context: "because", files };
}

describe("parseReviewUnit", () => {
  it("keeps a unit whose file/hunk refs all exist in the diff", () => {
    const unit = parseReviewUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }]),
      diffFixture(),
    );

    expect(unit?.files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("drops hallucinated hunk ids but keeps the file ref if the file is real", () => {
    const unit = parseReviewUnit(
      unitWith([
        { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0", "src/foo.ts#99"], role: "core_logic" },
      ]),
      diffFixture(),
    );

    expect(unit?.files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("treats an empty hunkIds list as a whole-file reference and keeps it", () => {
    const unit = parseReviewUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }]),
      diffFixture(),
    );

    expect(unit?.files).toHaveLength(1);
    expect(unit?.files[0].hunkIds).toEqual([]);
  });

  it("returns null when every file ref is hallucinated", () => {
    const unit = parseReviewUnit(
      unitWith([{ fileId: "src/does-not-exist.ts", hunkIds: [], role: "core_logic" }]),
      diffFixture(),
    );

    expect(unit).toBeNull();
  });

  it("falls back to core_logic for an unrecognized role", () => {
    const unit = parseReviewUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: [], role: "not_a_real_role" }]),
      diffFixture(),
    );

    expect(unit?.files[0].role).toBe("core_logic");
  });

  it("rejects incomplete or malformed objects outright", () => {
    const diff = diffFixture();

    expect(parseReviewUnit(null, diff)).toBeNull();
    expect(parseReviewUnit({ id: "u1", title: "T" }, diff)).toBeNull();
    // Missing context.
    expect(parseReviewUnit({ id: "u1", title: "T", files: [] }, diff)).toBeNull();
    // A malformed file ref invalidates the whole unit, unlike an unknown path
    // (which only drops that one ref).
    expect(parseReviewUnit(unitWith([{ fileId: "src/foo.ts" }]), diff)).toBeNull();
    expect(
      parseReviewUnit(unitWith([{ fileId: "src/foo.ts", hunkIds: [7], role: "test" }]), diff),
    ).toBeNull();
  });

  it("accepts a well-formed unit", () => {
    const unit = parseReviewUnit(
      {
        id: "u1",
        title: "T",
        context: "C",
        files: [{ fileId: "src/foo.ts", hunkIds: [], role: "test" }],
      },
      diffFixture(),
    );

    expect(unit).toEqual({
      id: "u1",
      title: "T",
      context: "C",
      files: [{ fileId: "src/foo.ts", hunkIds: [], role: "test" }],
    } satisfies ReviewUnit);
  });
});
