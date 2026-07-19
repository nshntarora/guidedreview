import { describe, expect, it } from "vitest";
import { isCompleteReviewUnit, mergePlans, validateAndCleanPlan, validateAndCleanUnit } from "./reviewPlan";
import type { ParsedDiff, ReviewPlan, ReviewUnit } from "../types";

function diffFixture(): ParsedDiff {
  return {
    files: [
      {
        path: "src/foo.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          { id: "src/foo.ts#0", header: "@@ -1,1 +1,1 @@", oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: [] },
        ],
      },
    ],
  };
}

describe("validateAndCleanPlan", () => {
  it("keeps a unit whose file/hunk refs all exist in the diff", () => {
    const plan: ReviewPlan = {
      units: [
        {
          id: "u1",
          title: "Update foo",
          context: "because",
          files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }],
        },
      ],
    };

    const cleaned = validateAndCleanPlan(plan, diffFixture());
    expect(cleaned.units).toHaveLength(1);
    expect(cleaned.units[0].files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("drops hallucinated hunk ids but keeps the file ref if the file is real", () => {
    const plan: ReviewPlan = {
      units: [
        {
          id: "u1",
          title: "Update foo",
          context: "because",
          files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0", "src/foo.ts#99"], role: "core_logic" }],
        },
      ],
    };

    const cleaned = validateAndCleanPlan(plan, diffFixture());
    expect(cleaned.units[0].files[0].hunkIds).toEqual(["src/foo.ts#0"]);
  });

  it("drops a file ref entirely when the file doesn't exist in the diff", () => {
    const plan: ReviewPlan = {
      units: [
        {
          id: "u1",
          title: "Hallucinated file",
          context: "because",
          files: [{ fileId: "src/does-not-exist.ts", hunkIds: [], role: "core_logic" }],
        },
      ],
    };

    const cleaned = validateAndCleanPlan(plan, diffFixture());
    expect(cleaned.units).toHaveLength(0);
  });

  it("drops the whole unit when every file ref is invalid", () => {
    const plan: ReviewPlan = {
      units: [
        {
          id: "u1",
          title: "All hallucinated",
          context: "because",
          files: [{ fileId: "nope.ts", hunkIds: [], role: "core_logic" }],
        },
        {
          id: "u2",
          title: "Real",
          context: "because",
          files: [{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }],
        },
      ],
    };

    const cleaned = validateAndCleanPlan(plan, diffFixture());
    expect(cleaned.units.map((u) => u.id)).toEqual(["u2"]);
  });

  it("treats an empty hunkIds list as a whole-file reference and keeps it", () => {
    const plan: ReviewPlan = {
      units: [
        {
          id: "u1",
          title: "Whole file",
          context: "because",
          files: [{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }],
        },
      ],
    };

    const cleaned = validateAndCleanPlan(plan, diffFixture());
    expect(cleaned.units).toHaveLength(1);
    expect(cleaned.units[0].files[0].hunkIds).toEqual([]);
  });
});

describe("validateAndCleanUnit", () => {
  it("returns a cleaned unit or null when nothing real remains", () => {
    const good: ReviewUnit = {
      id: "u1",
      title: "Update foo",
      context: "because",
      files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0", "src/foo.ts#99"], role: "core_logic" }],
    };
    const cleaned = validateAndCleanUnit(good, diffFixture());
    expect(cleaned?.files[0].hunkIds).toEqual(["src/foo.ts#0"]);

    const bad: ReviewUnit = {
      id: "u2",
      title: "Nope",
      context: "",
      files: [{ fileId: "missing.ts", hunkIds: [], role: "core_logic" }],
    };
    expect(validateAndCleanUnit(bad, diffFixture())).toBeNull();
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

describe("mergePlans", () => {
  it("prefixes unit ids per chunk so units from different chunks never collide", () => {
    const planA: ReviewPlan = {
      units: [{ id: "u1", title: "A", context: "", files: [] }],
    };
    const planB: ReviewPlan = {
      units: [{ id: "u1", title: "B", context: "", files: [] }],
    };

    const merged = mergePlans([planA, planB]);
    expect(merged.units.map((u) => u.id)).toEqual(["c0-u1", "c1-u1"]);
    expect(merged.units.map((u) => u.title)).toEqual(["A", "B"]);
  });

  it("returns an empty plan for no input plans", () => {
    expect(mergePlans([])).toEqual({ units: [] });
  });
});
