import { describe, expect, it } from "vitest";
import {
  buildUnassignedUnits,
  parseReviewUnit,
  stripDuplicateHunks,
  UNASSIGNED_UNIT_ID,
} from "./reviewPlan";
import type { DiffFile, ParsedDiff, ReviewUnit } from "../types";

/** The known-files map `parseReviewUnit` validates against. */
function diffFixture(): Map<string, DiffFile> {
  const foo: DiffFile = {
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
      {
        id: "src/foo.ts#1",
        header: "@@ -5,1 +5,1 @@",
        oldStart: 5,
        oldLines: 1,
        newStart: 5,
        newLines: 1,
        lines: [],
      },
    ],
  };
  const testFile: DiffFile = {
    path: "src/foo.test.ts",
    status: "added",
    isBinaryOrElided: false,
    hunks: [
      {
        id: "src/foo.test.ts#0",
        header: "@@ -0,0 +1,1 @@",
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: 1,
        lines: [],
      },
    ],
  };
  return new Map([
    [foo.path, foo],
    [testFile.path, testFile],
  ]);
}

describe("parseReviewUnit", () => {
  function unitWith(files: ReviewUnit["files"], overrides: Partial<ReviewUnit> = {}): ReviewUnit {
    return {
      id: "u1",
      title: "Update foo",
      kind: "change",
      context: "because",
      files,
      ...overrides,
    };
  }

  it("keeps a unit whose file/hunk refs all exist in the diff", () => {
    const cleaned = parseReviewUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }]),
      diffFixture(),
    );

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].files[0].hunkIds).toEqual(["src/foo.ts#0"]);
    expect(cleaned[0].kind).toBe("change");
  });

  it("drops hallucinated hunk ids but keeps the file ref if the file is real", () => {
    const cleaned = parseReviewUnit(
      unitWith([
        { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0", "src/foo.ts#99"], role: "core_logic" },
      ]),
      diffFixture(),
    );

    expect(cleaned[0].files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("treats an empty hunkIds list as a whole-file reference and keeps it", () => {
    const cleaned = parseReviewUnit(
      unitWith([{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }]),
      diffFixture(),
    );

    expect(cleaned[0].files).toHaveLength(1);
    expect(cleaned[0].files[0].hunkIds).toEqual([]);
  });

  it("returns an empty array when every file ref is hallucinated", () => {
    const cleaned = parseReviewUnit(
      unitWith([{ fileId: "src/does-not-exist.ts", hunkIds: [], role: "core_logic" }]),
      diffFixture(),
    );

    expect(cleaned).toEqual([]);
  });

  it("falls back to core_logic for an unrecognized role on production paths", () => {
    const cleaned = parseReviewUnit(
      unitWith([
        {
          fileId: "src/foo.ts",
          hunkIds: [],
          role: "not_a_real_role" as ReviewUnit["files"][number]["role"],
        },
      ]),
      diffFixture(),
    );

    expect(cleaned[0].files[0].role).toBe("core_logic");
  });

  it("forces test paths to role test and kind tests", () => {
    const cleaned = parseReviewUnit(
      unitWith([{ fileId: "src/foo.test.ts", hunkIds: [], role: "core_logic" }], {
        kind: "change",
        title: "Tests for foo",
      }),
      diffFixture(),
    );

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].kind).toBe("tests");
    expect(cleaned[0].files[0].role).toBe("test");
  });

  it("splits mixed production+test units into change then tests", () => {
    const cleaned = parseReviewUnit(
      unitWith(
        [
          { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" },
          { fileId: "src/foo.test.ts", hunkIds: [], role: "test" },
        ],
        { id: "add-foo", title: "Add foo", kind: "change" },
      ),
      diffFixture(),
    );

    expect(cleaned).toHaveLength(2);
    expect(cleaned[0]).toMatchObject({
      id: "add-foo",
      kind: "change",
      title: "Add foo",
    });
    expect(cleaned[0].files.map((f) => f.fileId)).toEqual(["src/foo.ts"]);
    expect(cleaned[1]).toMatchObject({
      id: "add-foo-tests",
      kind: "tests",
      title: "Tests for Add foo",
    });
    expect(cleaned[1].files.map((f) => f.fileId)).toEqual(["src/foo.test.ts"]);
  });

  it("sorts files within a unit by role then path", () => {
    const cleaned = parseReviewUnit(
      unitWith([
        { fileId: "src/z.ts", hunkIds: [], role: "core_logic" },
        { fileId: "src/a.ts", hunkIds: [], role: "schema_or_model" },
        { fileId: "src/m.ts", hunkIds: [], role: "core_logic" },
      ]),
      new Map([
        ["src/z.ts", { path: "src/z.ts", status: "modified", isBinaryOrElided: false, hunks: [] }],
        ["src/a.ts", { path: "src/a.ts", status: "modified", isBinaryOrElided: false, hunks: [] }],
        ["src/m.ts", { path: "src/m.ts", status: "modified", isBinaryOrElided: false, hunks: [] }],
      ]),
    );

    expect(cleaned[0].files.map((f) => f.fileId)).toEqual(["src/a.ts", "src/m.ts", "src/z.ts"]);
  });
});

describe("stripDuplicateHunks", () => {
  it("keeps the first claim on a hunk and drops later units that only had that hunk", () => {
    const known = diffFixture();
    const seen = new Set<string>();

    const first = stripDuplicateHunks(
      {
        id: "a",
        title: "A",
        kind: "change",
        context: "",
        files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }],
      },
      known,
      seen,
    );
    const second = stripDuplicateHunks(
      {
        id: "b",
        title: "B",
        kind: "change",
        context: "",
        files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }],
      },
      known,
      seen,
    );

    expect(first?.files[0].hunkIds).toEqual(["src/foo.ts#0"]);
    expect(second).toBeNull();
  });

  it("keeps remaining hunks when only some were already claimed", () => {
    const known = diffFixture();
    const seen = new Set<string>(["src/foo.ts#0"]);

    const unit = stripDuplicateHunks(
      {
        id: "a",
        title: "A",
        kind: "change",
        context: "",
        files: [
          {
            fileId: "src/foo.ts",
            hunkIds: ["src/foo.ts#0", "src/foo.ts#1"],
            role: "core_logic",
          },
        ],
      },
      known,
      seen,
    );

    expect(unit?.files[0].hunkIds).toEqual(["src/foo.ts#1"]);
  });
});

describe("parseReviewUnit structural checks", () => {
  it("accepts a well-formed unit with or without an explicit kind", () => {
    const withKind = parseReviewUnit(
      {
        id: "u1",
        title: "T",
        kind: "tests",
        context: "C",
        files: [{ fileId: "src/foo.test.ts", hunkIds: [], role: "test" }],
      },
      diffFixture(),
    );
    expect(withKind).toHaveLength(1);

    // `kind` is optional: streaming property order must not drop a unit.
    const withoutKind = parseReviewUnit(
      {
        id: "u1",
        title: "T",
        context: "C",
        files: [{ fileId: "src/foo.test.ts", hunkIds: [], role: "test" }],
      },
      diffFixture(),
    );
    expect(withoutKind).toHaveLength(1);
    expect(withoutKind[0].kind).toBe("tests");
  });

  it("rejects incomplete or malformed objects", () => {
    const diff = diffFixture();
    expect(parseReviewUnit({ id: "u1", title: "T" }, diff)).toEqual([]);
    expect(parseReviewUnit(null, diff)).toEqual([]);
    // A malformed file ref invalidates the whole unit, unlike an unknown path
    // (which only drops that one ref).
    expect(
      parseReviewUnit(
        { id: "u1", title: "T", context: "C", files: [{ fileId: "src/foo.ts" }] },
        diff,
      ),
    ).toEqual([]);
  });
});

describe("buildUnassignedUnits", () => {
  function parsedDiff(known: Map<string, DiffFile>): ParsedDiff {
    return { files: [...known.values()] };
  }

  it("returns nothing when the plan already claimed every hunk", () => {
    const known = diffFixture();
    const seen = new Set(["src/foo.ts#0", "src/foo.ts#1", "src/foo.test.ts#0"]);
    expect(buildUnassignedUnits(parsedDiff(known), known, seen)).toEqual([]);
  });

  it("covers a file the model dropped entirely", () => {
    const known = diffFixture();
    // The model only planned the test file — src/foo.ts vanished from the plan.
    const seen = new Set(["src/foo.test.ts#0"]);

    const units = buildUnassignedUnits(parsedDiff(known), known, seen);

    expect(units).toHaveLength(1);
    expect(units[0].id).toBe(UNASSIGNED_UNIT_ID);
    expect(units[0].kind).toBe("change");
    expect(units[0].files).toEqual([
      { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0", "src/foo.ts#1"], role: "core_logic" },
    ]);
    // Context is ours, not the model's.
    expect(units[0].context).toContain("not placed in any earlier unit");
  });

  it("covers individual hunks dropped from a partially planned file", () => {
    const known = diffFixture();
    const seen = new Set(["src/foo.ts#0", "src/foo.test.ts#0"]);

    const units = buildUnassignedUnits(parsedDiff(known), known, seen);

    expect(units).toHaveLength(1);
    expect(units[0].files).toEqual([
      { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#1"], role: "core_logic" },
    ]);
  });

  it("splits leftovers into pure change and tests units", () => {
    const known = diffFixture();
    const units = buildUnassignedUnits(parsedDiff(known), known, new Set());

    expect(units.map((u) => u.kind)).toEqual(["change", "tests"]);
    expect(units[0].files.map((f) => f.fileId)).toEqual(["src/foo.ts"]);
    expect(units[1].files.map((f) => f.fileId)).toEqual(["src/foo.test.ts"]);
    expect(units[1].id).not.toBe(units[0].id);
  });

  it("claims binary/elided files once via the whole-file key", () => {
    const binary: DiffFile = {
      path: "assets/logo.png",
      status: "added",
      isBinaryOrElided: true,
      hunks: [],
    };
    const known = new Map([[binary.path, binary]]);
    const seen = new Set<string>();

    const first = buildUnassignedUnits(parsedDiff(known), known, seen);
    expect(first[0].files).toEqual([
      { fileId: "assets/logo.png", hunkIds: [], role: "core_logic" },
    ]);

    // Same set, second pass: already claimed, so nothing is duplicated.
    expect(buildUnassignedUnits(parsedDiff(known), known, seen)).toEqual([]);
  });

  it("marks recovered hunks as claimed so repeat calls are empty", () => {
    const known = diffFixture();
    const seen = new Set<string>();

    expect(buildUnassignedUnits(parsedDiff(known), known, seen)).not.toEqual([]);
    expect(buildUnassignedUnits(parsedDiff(known), known, seen)).toEqual([]);
  });
});
