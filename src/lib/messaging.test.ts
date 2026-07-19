import { describe, expect, it, vi } from "vitest";
import { requestPRDiff, requestReviewPlan, testConnection } from "./messaging";
import type { ParsedDiff, PRContext } from "./types";

describe("messaging", () => {
  it("requestPRDiff sends a typed FETCH_DIFF message", async () => {
    const response = { ok: true, diff: { files: [] } };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    const result = await requestPRDiff({ owner: "acme", repo: "widgets", number: 1 });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "FETCH_DIFF",
      pr: { owner: "acme", repo: "widgets", number: 1 },
    });
    expect(result).toEqual(response);
  });

  it("requestReviewPlan sends a typed ANNOTATE_REVIEW message with the diff and PR context", async () => {
    const diff: ParsedDiff = { files: [] };
    const prContext = { title: "Add feature" } as PRContext;
    const response = { ok: true, plan: { units: [] } };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    const result = await requestReviewPlan(diff, prContext);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "ANNOTATE_REVIEW",
      diff,
      prContext,
    });
    expect(result).toEqual(response);
  });

  it("testConnection sends a typed TEST_CONNECTION message", async () => {
    const settings = { provider: "anthropic" as const, model: "claude-opus-4-8", apiKey: "sk-test" };
    const response = { ok: true };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    const result = await testConnection(settings);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "TEST_CONNECTION", settings });
    expect(result).toEqual(response);
  });
});
