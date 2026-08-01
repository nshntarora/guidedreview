import { describe, expect, it } from "vitest";
import { BUILD_PLAN_PRIMARY, buildPhaseDetail } from "./buildPhaseCopy";

describe("buildPhaseCopy", () => {
  it("exposes the primary loading line", () => {
    expect(BUILD_PLAN_PRIMARY).toBe("Building a review plan");
  });

  it("maps each phase to user-facing detail copy", () => {
    expect(buildPhaseDetail("extracting_diff", null)).toBe("Extracting the diff…");
    expect(buildPhaseDetail("processing_diff", null)).toBe("Processing the diff…");
    expect(buildPhaseDetail("sent_to_provider", "Claude (Anthropic)")).toBe(
      "Sent it to Claude (Anthropic)…",
    );
    expect(buildPhaseDetail("sent_to_provider", null)).toBe("Sent it to your AI provider…");
    expect(buildPhaseDetail("waiting_for_tokens", null)).toBe("Waiting for tokens…");
    expect(buildPhaseDetail("tokens_streaming", null)).toBe("Tokens are streaming…");
  });
});
