import { describe, expect, it } from "vitest";
import { missingMetadataHint, PR_DESCRIPTION_HINT } from "./missingMetadata";

describe("missingMetadataHint", () => {
  it("mentions both title and description when neither is present", () => {
    const hint = missingMetadataHint(false, false);
    expect(hint).toMatch(/title or description/i);
    expect(hint).toMatch(/inferred from the diff/i);
  });

  it("mentions missing description when the title is present", () => {
    const hint = missingMetadataHint(true, false);
    expect(hint).toMatch(/^No PR description\./);
    expect(hint).toMatch(/inferred from the title and diff/i);
  });

  it("mentions missing title when the description is present", () => {
    const hint = missingMetadataHint(false, true);
    expect(hint).toMatch(/^No PR title\./);
    expect(hint).toMatch(/inferred from the description and diff/i);
  });

  it("returns the default PR description hint when both are present", () => {
    expect(missingMetadataHint(true, true)).toBe(PR_DESCRIPTION_HINT);
  });
});
