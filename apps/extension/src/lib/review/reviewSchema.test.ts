import { describe, expect, it } from "vitest";
import { REVIEW_PLAN_JSON_SCHEMA } from "./reviewSchema";
import { parseReviewUnit } from "./reviewPlan";
import { FILE_ROLES, UNIT_KINDS, type DiffFile, type ReviewUnit } from "@extension/lib/types";

const roleSchema =
  REVIEW_PLAN_JSON_SCHEMA.properties.units.items.properties.files.items.properties.role;
const kindSchema = REVIEW_PLAN_JSON_SCHEMA.properties.units.items.properties.kind;

function diffWith(path: string): Map<string, DiffFile> {
  return new Map([[path, { path, status: "modified", isBinaryOrElided: false, hunks: [] }]]);
}

describe("REVIEW_PLAN_JSON_SCHEMA", () => {
  it("advertises exactly the roles declared in FILE_ROLES", () => {
    expect([...roleSchema.enum]).toEqual([...FILE_ROLES]);
  });

  it("advertises exactly the unit kinds declared in UNIT_KINDS", () => {
    expect([...kindSchema.enum]).toEqual([...UNIT_KINDS]);
  });

  it("requires kind on every unit", () => {
    expect(REVIEW_PLAN_JSON_SCHEMA.properties.units.items.required).toContain("kind");
  });

  it("accepts every advertised role through runtime validation", () => {
    // The model can only return roles the schema allows, so validation must not
    // silently rewrite any of them — a mismatch here means a role was added to
    // the schema but not to the validator's known set.
    // Skip "test" here: path src/foo.ts is production; test role alone still
    // yields kind tests via purity rules, but role is preserved.
    for (const role of FILE_ROLES) {
      const path = role === "test" ? "src/foo.test.ts" : "src/foo.ts";
      const unit: ReviewUnit = {
        id: `u-${role}`,
        title: "T",
        kind: role === "test" ? "tests" : "change",
        context: "C",
        files: [{ fileId: path, hunkIds: [], role }],
      };

      const cleaned = parseReviewUnit(unit, diffWith(path));
      expect(cleaned).toHaveLength(1);
      expect(cleaned[0].files[0].role).toBe(role);
    }
  });
});
