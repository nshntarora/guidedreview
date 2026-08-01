import { describe, expect, it } from "vitest";
import { buildFileReviewPlan, FILE_UNIT_TITLE_MAX } from "./fileReviewPlan";
import { resolveUnitFiles } from "../../content/overlay/selectors";
import { middleTruncate } from "../middleTruncate";
import type { ParsedDiff } from "../types";

function diffFixture(): ParsedDiff {
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
    const plan = buildFileReviewPlan(diffFixture());

    expect(plan.units.map((u) => u.title)).toEqual([
      "src/core.ts",
      "src/core.test.ts",
      "package.json",
    ]);
    // Short paths fit the budget — displayTitle equals the full path.
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
    const plan = buildFileReviewPlan(diffFixture());
    expect(plan.units.every((u) => u.context === "")).toBe(true);
  });

  it("references whole files so every hunk renders", () => {
    const diff = diffFixture();
    const plan = buildFileReviewPlan(diff);

    const resolved = resolveUnitFiles(plan.units[0], diff);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].file.path).toBe("src/core.ts");
    expect(resolved[0].hunks).toHaveLength(2);
  });

  it("labels test and config files by path", () => {
    const plan = buildFileReviewPlan(diffFixture());
    expect(plan.units.map((u) => u.files[0].role)).toEqual([
      "core_logic",
      "test",
      "config_or_generated",
    ]);
  });

  it("sets kind tests only for test paths", () => {
    const plan = buildFileReviewPlan(diffFixture());
    expect(plan.units.map((u) => u.kind)).toEqual(["change", "tests", "change"]);
  });

  it("returns an empty plan for an empty diff", () => {
    expect(buildFileReviewPlan({ files: [] })).toEqual({ units: [] });
  });
});
