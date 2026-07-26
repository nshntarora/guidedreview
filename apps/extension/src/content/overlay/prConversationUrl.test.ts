import { afterEach, describe, expect, it, vi } from "vitest";
import {
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

  it("treats a trailing slash as already on the conversation tab", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/acme/widgets/pull/1/", assign },
    });
    navigateToPrConversation({ owner: "acme", repo: "widgets", number: 1 });
    expect(assign).not.toHaveBeenCalled();
  });

  it("navigates from every other PR tab", () => {
    for (const pathname of [
      "/acme/widgets/pull/1/files",
      "/acme/widgets/pull/1/commits",
      "/acme/widgets/pull/1/checks",
    ]) {
      const assign = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname, assign },
      });
      navigateToPrConversation({ owner: "acme", repo: "widgets", number: 1 });
      expect(assign, pathname).toHaveBeenCalledWith("https://github.com/acme/widgets/pull/1");
    }
  });

  it("navigates when the path is a different PR or repo", () => {
    for (const pathname of ["/acme/widgets/pull/2", "/other/widgets/pull/1"]) {
      const assign = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname, assign },
      });
      navigateToPrConversation({ owner: "acme", repo: "widgets", number: 1 });
      expect(assign, pathname).toHaveBeenCalledWith("https://github.com/acme/widgets/pull/1");
    }
  });
});
