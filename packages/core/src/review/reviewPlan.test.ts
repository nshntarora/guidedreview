import { describe, expect, it } from "vitest";
import {
  parseReviewUnit,
  stripDuplicateHunks,
  buildFileReviewPlan,
  FILE_UNIT_TITLE_MAX,
  isTestPath,
  roleForPath,
} from "./reviewPlan";
import { resolveUnitFiles } from "./resolveUnitFiles";
import { middleTruncate } from "../middleTruncate";
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
    // AI units show prose titles as-is — no pre-truncated displayTitle.
    expect(cleaned[0].displayTitle).toBeUndefined();
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

  it("avoids colliding with a mixed unit whose id already ends in -tests", () => {
    const cleaned = parseReviewUnit(
      unitWith(
        [
          { fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" },
          { fileId: "src/foo.test.ts", hunkIds: [], role: "test" },
        ],
        { id: "add-foo-tests", title: "Add foo", kind: "change" },
      ),
      diffFixture(),
    );

    expect(cleaned.map((u) => u.id)).toEqual(["add-foo-tests", "add-foo-tests-files"]);
    expect(cleaned[0].kind).toBe("change");
    expect(cleaned[1].kind).toBe("tests");
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

describe("isTestPath", () => {
  it.each([
    ["src/foo.test.ts", true],
    ["src/foo.spec.tsx", true],
    ["tests/helpers.ts", true],
    ["test/unit/bar.ts", true],
    ["__tests__/widget.tsx", true],
    ["packages/app/src/spec/util.ts", true],
    ["src/foo.ts", false],
    ["src/testing/notes.md", false],
    ["src/contest/foo.ts", false],
  ])("%s → %s", (path, expected) => {
    expect(isTestPath(path)).toBe(expected);
  });
});

describe("roleForPath", () => {
  it.each([
    ["src/auth.test.ts", "test"],
    ["__tests__/store.ts", "test"],
    ["package-lock.json", "config_or_generated"],
    ["yarn.lock", "config_or_generated"],
    ["pnpm-lock.yaml", "config_or_generated"],
    ["go.sum", "config_or_generated"],
    ["Cargo.lock", "config_or_generated"],
    ["tsconfig.json", "config_or_generated"],
    ["config.yaml", "config_or_generated"],
    ["settings.toml", "config_or_generated"],
    ["app.config.ts", "config_or_generated"],
    ["vite.config.js", "config_or_generated"],
    ["src/auth.ts", "core_logic"],
    ["packages/ui/src/Button.tsx", "core_logic"],
  ] as const)("%s → %s", (path, role) => {
    expect(roleForPath(path)).toBe(role);
  });
});

function filePlanDiffFixture(): ParsedDiff {
  return {
    files: [
      {
        path: "src/core.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/core.ts#0",
            header: "@@ -1,1 +1,1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: "const x = 1;", newLine: 1 }],
          },
          {
            id: "src/core.ts#1",
            header: "@@ -9,1 +9,1 @@",
            oldStart: 9,
            oldLines: 1,
            newStart: 9,
            newLines: 1,
            lines: [{ type: "add", content: "const y = 2;", newLine: 9 }],
          },
        ],
      },
      { path: "src/core.test.ts", status: "added", isBinaryOrElided: false, hunks: [] },
      { path: "package.json", status: "modified", isBinaryOrElided: false, hunks: [] },
    ],
  };
}

describe("buildFileReviewPlan", () => {
  it("creates one unit per changed file, in diff order, titled by path", () => {
    const plan = buildFileReviewPlan(filePlanDiffFixture());

    expect(plan.units.map((u) => u.title)).toEqual([
      "src/core.ts",
      "src/core.test.ts",
      "package.json",
    ]);
    expect(plan.units.map((u) => u.displayTitle)).toEqual([
      "src/core.ts",
      "src/core.test.ts",
      "package.json",
    ]);
    expect(new Set(plan.units.map((u) => u.id)).size).toBe(3);
  });

  it("middle-truncates long path labels into displayTitle, keeps full path on title", () => {
    const longPath =
      "apps/extension/src/content/overlay/components/VeryLongFileNameForTruncation.tsx";
    const diff: ParsedDiff = {
      files: [{ path: longPath, status: "modified", isBinaryOrElided: false, hunks: [] }],
    };

    const plan = buildFileReviewPlan(diff);
    expect(plan.units[0].title).toBe(longPath);
    expect(plan.units[0].displayTitle).toBe(middleTruncate(longPath, FILE_UNIT_TITLE_MAX));
    expect(plan.units[0].displayTitle!.length).toBe(FILE_UNIT_TITLE_MAX);
    expect(plan.units[0].displayTitle).toContain("…");
  });

  it("leaves context empty rather than inventing commentary", () => {
    const plan = buildFileReviewPlan(filePlanDiffFixture());
    expect(plan.units.every((u) => u.context === "")).toBe(true);
  });

  it("references whole files so every hunk renders", () => {
    const diff = filePlanDiffFixture();
    const plan = buildFileReviewPlan(diff);

    const resolved = resolveUnitFiles(plan.units[0], diff);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].file.path).toBe("src/core.ts");
    expect(resolved[0].hunks).toHaveLength(2);
  });

  it("labels test and config files by path", () => {
    const plan = buildFileReviewPlan(filePlanDiffFixture());
    expect(plan.units.map((u) => u.files[0].role)).toEqual([
      "core_logic",
      "test",
      "config_or_generated",
    ]);
  });

  it("sets kind tests only for test paths", () => {
    const plan = buildFileReviewPlan(filePlanDiffFixture());
    expect(plan.units.map((u) => u.kind)).toEqual(["change", "tests", "change"]);
  });

  it("returns an empty plan for an empty diff", () => {
    expect(buildFileReviewPlan({ files: [] })).toEqual({ units: [] });
  });
});
