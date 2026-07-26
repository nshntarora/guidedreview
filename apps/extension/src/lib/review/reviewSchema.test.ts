import { describe, expect, it } from "vitest";
import { REVIEW_PLAN_JSON_SCHEMA } from "./reviewSchema";
import { validateAndCleanUnit } from "./reviewPlan";
import { FILE_ROLES, type DiffFile, type ReviewUnit } from "../types";

const roleSchema =
  REVIEW_PLAN_JSON_SCHEMA.properties.units.items.properties.files.items.properties.role;

function diffWith(path: string): Map<string, DiffFile> {
  return new Map([[path, { path, status: "modified", isBinaryOrElided: false, hunks: [] }]]);
}

describe("REVIEW_PLAN_JSON_SCHEMA", () => {
  it("advertises exactly the roles declared in FILE_ROLES", () => {
    expect([...roleSchema.enum]).toEqual([...FILE_ROLES]);
  });

  it("accepts every advertised role through runtime validation", () => {
    // The model can only return roles the schema allows, so validation must not
    // silently rewrite any of them — a mismatch here means a role was added to
    // the schema but not to the validator's known set.
    for (const role of FILE_ROLES) {
      const unit: ReviewUnit = {
        id: `u-${role}`,
        title: "T",
        context: "C",
        files: [{ fileId: "src/foo.ts", hunkIds: [], role }],
      };

      const cleaned = validateAndCleanUnit(unit, diffWith("src/foo.ts"));
      expect(cleaned?.files[0].role).toBe(role);
    }
  });
});
