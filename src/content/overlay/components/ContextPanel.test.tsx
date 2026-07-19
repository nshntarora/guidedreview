import { describe, expect, it } from "vitest";
import { missingMetadataHint } from "./ContextPanel";

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
});
