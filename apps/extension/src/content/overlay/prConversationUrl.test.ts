import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPrConversationPath,
  isPrFilesChangedPath,
  navigateToPrConversation,
  prConversationUrl,
} from "./prConversationUrl";

describe("prConversationUrl", () => {
  it("builds the conversation URL", () => {
    expect(prConversationUrl({ owner: "acme", repo: "widgets", number: 42 })).toBe(
      "https://github.com/acme/widgets/pull/42",
    );
  });
});

describe("isPrConversationPath", () => {
  const pr = { owner: "acme", repo: "widgets", number: 1 };

  it("matches the conversation path", () => {
    expect(isPrConversationPath("/acme/widgets/pull/1", pr)).toBe(true);
    expect(isPrConversationPath("/acme/widgets/pull/1/", pr)).toBe(true);
  });

  it("rejects other PR tabs", () => {
    expect(isPrConversationPath("/acme/widgets/pull/1/files", pr)).toBe(false);
    expect(isPrConversationPath("/acme/widgets/pull/1/commits", pr)).toBe(false);
    expect(isPrConversationPath("/acme/widgets/pull/1/checks", pr)).toBe(false);
  });

  it("rejects other PRs", () => {
    expect(isPrConversationPath("/acme/widgets/pull/2", pr)).toBe(false);
    expect(isPrConversationPath("/other/widgets/pull/1", pr)).toBe(false);
  });
});

describe("isPrFilesChangedPath", () => {
  it("matches the classic Files changed tab (/files)", () => {
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/files")).toBe(true);
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/files/")).toBe(true);
    expect(isPrFilesChangedPath("/acme/widgets/pull/42/files")).toBe(true);
  });

  it("matches the new PR UI Changes tab (/changes)", () => {
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/changes")).toBe(true);
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/changes/")).toBe(true);
    expect(isPrFilesChangedPath("/acme/widgets/pull/42/changes")).toBe(true);
  });

  it("rejects conversation and other PR tabs", () => {
    expect(isPrFilesChangedPath("/acme/widgets/pull/1")).toBe(false);
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/commits")).toBe(false);
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/checks")).toBe(false);
    expect(isPrFilesChangedPath("/acme/widgets/issues/1")).toBe(false);
  });

  it("rejects paths that only contain files/changes as a prefix of another segment", () => {
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/filesx")).toBe(false);
    expect(isPrFilesChangedPath("/acme/widgets/pull/1/changesx")).toBe(false);
  });
});

describe("navigateToPrConversation", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("does not navigate when already on the conversation tab", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/acme/widgets/pull/1", assign },
    });
    navigateToPrConversation({ owner: "acme", repo: "widgets", number: 1 });
    expect(assign).not.toHaveBeenCalled();
  });

  it("navigates from the files tab", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/acme/widgets/pull/1/files", assign },
    });
    navigateToPrConversation({ owner: "acme", repo: "widgets", number: 1 });
    expect(assign).toHaveBeenCalledWith("https://github.com/acme/widgets/pull/1");
  });
});
