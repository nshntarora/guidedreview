import { describe, expect, it } from "vitest";
import { missingMetadataHint, PR_DESCRIPTION_HINT } from "./overlayCopy";

describe("missingMetadataHint", () => {
  it("uses local-host wording for missing branch name, commits, or both", () => {
    expect(missingMetadataHint(false, false, "local")).toBe(
      "No branch summary. Intent will be inferred from the diff.",
    );
    expect(missingMetadataHint(true, false, "local")).toBe(
      "No commits on this branch. Intent will be inferred from the branch name and diff.",
    );
    expect(missingMetadataHint(false, true, "local")).toBe(
      "No branch name. Intent will be inferred from the commits and diff.",
    );
    expect(missingMetadataHint(true, true, "local")).toBe(
      "Commits on this branch. Start here, then step through the files.",
    );
  });

  it("defaults to GitHub PR wording", () => {
    expect(missingMetadataHint(false, false)).toBe(
      "No PR title or description. Intent will be inferred from the diff.",
    );
    expect(missingMetadataHint(true, false)).toBe(
      "No PR description. Intent will be inferred from the title and diff.",
    );
    expect(missingMetadataHint(false, true)).toBe(
      "No PR title. Intent will be inferred from the description and diff.",
    );
    expect(missingMetadataHint(true, true)).toBe(PR_DESCRIPTION_HINT);
  });
});
