import { describe, expect, it } from "vitest";
import { buildDisplayUnits, displayUnitCount } from "./displayUnits";
import type { ReviewPlan } from "../../lib/types";

const plan: ReviewPlan = {
  units: [
    { id: "u1", title: "One", kind: "change", context: "c1", files: [] },
    { id: "u2", title: "Two", kind: "tests", context: "c2", files: [] },
  ],
};

describe("displayUnits", () => {
  it("always includes the PR description unit first", () => {
    expect(buildDisplayUnits(null)).toEqual([
      { kind: "pr_description", id: "__pr_description", title: "PR Description" },
    ]);
  });

  it("appends plan units after the description", () => {
    const units = buildDisplayUnits(plan);
    expect(units).toHaveLength(3);
    expect(units[0].kind).toBe("pr_description");
    expect(units[1]).toMatchObject({ kind: "review", id: "u1", planIndex: 0 });
    expect(units[2]).toMatchObject({ kind: "review", id: "u2", planIndex: 1 });
  });

  it("counts display units as 1 + plan size", () => {
    expect(displayUnitCount(null)).toBe(1);
    expect(displayUnitCount({ units: [] })).toBe(1);
    expect(displayUnitCount(plan)).toBe(3);
  });
});
