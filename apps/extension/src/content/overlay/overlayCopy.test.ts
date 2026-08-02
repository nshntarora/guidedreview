import { describe, expect, it } from "vitest";
import {
  BUILD_PLAN_PRIMARY,
  buildPhaseDetail,
  missingMetadataHint,
  PR_DESCRIPTION_HINT,
} from "./overlayCopy";

describe("overlayCopy", () => {
  it("exposes the primary build-plan line", () => {
    expect(BUILD_PLAN_PRIMARY).toBe("Building a review plan");
  });

  it("maps each build phase to a detail string", () => {
    expect(buildPhaseDetail("extracting_diff", null)).toBe("Extracting the diff…");
    expect(buildPhaseDetail("processing_diff", null)).toBe("Processing the diff…");
    expect(buildPhaseDetail("sent_to_provider", "Claude (Anthropic)")).toBe(
      "Sent it to Claude (Anthropic)…",
    );
    expect(buildPhaseDetail("sent_to_provider", null)).toBe("Sent it to your AI provider…");
    expect(buildPhaseDetail("waiting_for_tokens", null)).toBe("Waiting for tokens…");
    expect(buildPhaseDetail("tokens_streaming", null)).toBe("Tokens are streaming…");
  });

  it("describes missing title and description", () => {
    const hint = missingMetadataHint(false, false);
    expect(hint).toMatch(/No PR title or description/);
  });

  it("describes missing description only", () => {
    const hint = missingMetadataHint(true, false);
    expect(hint).toMatch(/No PR description/);
  });

  it("describes missing title only", () => {
    const hint = missingMetadataHint(false, true);
    expect(hint).toMatch(/No PR title/);
  });

  it("uses the default description hint when both are present", () => {
    expect(missingMetadataHint(true, true)).toBe(PR_DESCRIPTION_HINT);
  });
});
