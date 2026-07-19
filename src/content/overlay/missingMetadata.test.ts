import { describe, expect, it } from "vitest";
import { emptyDescriptionCopy, missingMetadataHint, PR_DESCRIPTION_HINT } from "./missingMetadata";

describe("missingMetadataHint", () => {
  it("mentions both title and description when neither is present", () => {
    expect(missingMetadataHint(false, false)).toMatch(/title or description/i);
    expect(missingMetadataHint(false, false)).toMatch(/AI/i);
  });

  it("mentions only description when the title is present", () => {
    const hint = missingMetadataHint(true, false);
    expect(hint).toMatch(/description/i);
    expect(hint).not.toMatch(/title/i);
    expect(hint).toMatch(/AI/i);
  });

  it("mentions only title when the description is present", () => {
    const hint = missingMetadataHint(false, true);
    expect(hint).toMatch(/title/i);
    expect(hint).toMatch(/AI/i);
  });

  it("returns the default PR description hint when both are present", () => {
    expect(missingMetadataHint(true, true)).toBe(PR_DESCRIPTION_HINT);
  });
});

describe("emptyDescriptionCopy", () => {
  it("mentions title and description when the title is missing", () => {
    expect(emptyDescriptionCopy(false)).toMatch(/title or description/i);
  });

  it("mentions only description when the title is present", () => {
    const copy = emptyDescriptionCopy(true);
    expect(copy).toMatch(/description/i);
    expect(copy).not.toMatch(/title/i);
  });
});
