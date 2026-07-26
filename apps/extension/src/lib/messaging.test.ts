import { describe, expect, it, vi } from "vitest";
import {
  clearGitHubAuthSession,
  getGitHubAuthStatus,
  openOptionsPage,
  submitPullRequestReview,
  pollGitHubDeviceAuth,
  requestPRDiff,
  startGitHubDeviceAuth,
  streamReviewPlan,
  testConnection,
} from "./messaging";
import type { ParsedDiff, PRContext, ReviewUnit } from "./types";
import type { MockPort } from "../test/chromeMock";

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

  it("openOptionsPage sends a typed OPEN_OPTIONS message", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true });

    const result = await openOptionsPage();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "OPEN_OPTIONS" });
    expect(result).toEqual({ ok: true });
  });

  it("streamReviewPlan opens an annotate-review port and posts ANNOTATE_REVIEW", () => {
    const diff: ParsedDiff = { files: [] };
    const prContext = { title: "Add feature" } as PRContext;
    const onUnit = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    streamReviewPlan(diff, prContext, { onUnit, onDone, onError });

    expect(chrome.runtime.connect).toHaveBeenCalledWith({ name: "annotate-review" });
    const port = vi.mocked(chrome.runtime.connect).mock.results[0].value as MockPort;
    expect(port.postMessage).toHaveBeenCalledWith({
      type: "ANNOTATE_REVIEW",
      diff,
      prContext,
    });
  });

  it("streamReviewPlan delivers UNIT and DONE events to handlers", () => {
    const unit: ReviewUnit = {
      id: "c0-u1",
      title: "Update foo",
      context: "because",
      files: [{ fileId: "src/foo.ts", hunkIds: [], role: "core_logic" }],
    };
    const plan = { units: [unit] };
    const onUnit = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    streamReviewPlan({ files: [] }, { title: "t" } as PRContext, { onUnit, onDone, onError });
    const port = vi.mocked(chrome.runtime.connect).mock.results[0].value as MockPort;

    port.__emitMessage({ type: "UNIT", unit });
    port.__emitMessage({ type: "DONE", plan });

    expect(onUnit).toHaveBeenCalledWith(unit);
    expect(onDone).toHaveBeenCalledWith(plan);
    expect(onError).not.toHaveBeenCalled();
    expect(port.disconnect).toHaveBeenCalled();
  });

  it("streamReviewPlan delivers ERROR events", () => {
    const onUnit = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    streamReviewPlan({ files: [] }, { title: "t" } as PRContext, { onUnit, onDone, onError });
    const port = vi.mocked(chrome.runtime.connect).mock.results[0].value as MockPort;

    const error = {
      message: "Invalid API key",
      statusCode: 401,
      code: "authentication_error",
    };
    port.__emitMessage({ type: "ERROR", error });

    expect(onError).toHaveBeenCalledWith(error);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("streamReviewPlan cancel disconnects the port without erroring", () => {
    const onError = vi.fn();
    const { cancel } = streamReviewPlan({ files: [] }, { title: "t" } as PRContext, {
      onUnit: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    const port = vi.mocked(chrome.runtime.connect).mock.results[0].value as MockPort;

    cancel();
    // disconnect fires onDisconnect; cancel marks settled so onError is not called
    expect(port.disconnect).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("testConnection sends a typed TEST_CONNECTION message", async () => {
    const settings = {
      provider: "anthropic" as const,
      model: "claude-opus-4-8",
      apiKey: "sk-test",
    };
    const response = { ok: true };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    const result = await testConnection(settings);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "TEST_CONNECTION", settings });
    expect(result).toEqual(response);
  });

  it("startGitHubDeviceAuth sends GITHUB_DEVICE_START", async () => {
    const response = {
      ok: true as const,
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      deviceCode: "dev",
      interval: 5,
      expiresIn: 900,
    };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    await expect(startGitHubDeviceAuth()).resolves.toEqual(response);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "GITHUB_DEVICE_START" });
  });

  it("pollGitHubDeviceAuth sends GITHUB_DEVICE_POLL with deviceCode", async () => {
    const response = { ok: true as const, status: "pending" as const };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    await expect(pollGitHubDeviceAuth("device-xyz")).resolves.toEqual(response);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "GITHUB_DEVICE_POLL",
      deviceCode: "device-xyz",
    });
  });

  it("getGitHubAuthStatus and clearGitHubAuthSession send the expected types", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, auth: null });
    await expect(getGitHubAuthStatus()).resolves.toEqual({ ok: true, auth: null });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "GITHUB_AUTH_GET" });

    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true });
    await expect(clearGitHubAuthSession()).resolves.toEqual({ ok: true });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "GITHUB_AUTH_CLEAR" });
  });

  it("submitPullRequestReview sends SUBMIT_REVIEW with payload", async () => {
    const response = {
      ok: true as const,
      reviewId: 1,
      htmlUrl: "https://github.com/o/r/pull/1#pullrequestreview-1",
    };
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(response);

    const pr = { owner: "o", repo: "r", number: 1 };
    const comments = [{ path: "a.ts", body: "c", side: "RIGHT" as const, line: 3 }];
    await expect(submitPullRequestReview(pr, "Looks good", "APPROVE", comments)).resolves.toEqual(
      response,
    );
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "SUBMIT_REVIEW",
      pr,
      body: "Looks good",
      event: "APPROVE",
      comments,
    });
  });
});
