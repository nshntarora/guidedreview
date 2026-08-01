import { describe, expect, it } from "vitest";
import type { ReviewPlan } from "../../../lib/types";
import { findUnitForFile } from "./findUnitForFile";

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
