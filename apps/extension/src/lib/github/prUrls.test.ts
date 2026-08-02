import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFileLineUrl,
  buildPRFileDiffUrl,
  isIgnoredPrPath,
  isPrFilesChangedPath,
  navigateToPrConversation,
  prConversationUrl,
} from "./prUrls";

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

describe("isIgnoredPrPath", () => {
  it("matches the conflicts resolution path", () => {
    expect(isIgnoredPrPath("/acme/widgets/pull/1/conflicts")).toBe(true);
    expect(isIgnoredPrPath("/acme/widgets/pull/42/conflicts")).toBe(true);
  });

  it("matches trailing slash and nested segments under conflicts", () => {
    expect(isIgnoredPrPath("/acme/widgets/pull/1/conflicts/")).toBe(true);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/conflicts/file.ts")).toBe(true);
  });

  it("does not match conversation or other PR tabs", () => {
    expect(isIgnoredPrPath("/acme/widgets/pull/1")).toBe(false);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/")).toBe(false);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/files")).toBe(false);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/changes")).toBe(false);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/commits")).toBe(false);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/checks")).toBe(false);
  });

  it("does not match lookalike path segments", () => {
    expect(isIgnoredPrPath("/acme/widgets/pull/1/conflictsx")).toBe(false);
    expect(isIgnoredPrPath("/acme/widgets/pull/1/xconflicts")).toBe(false);
  });

  it("does not match non-PR paths", () => {
    expect(isIgnoredPrPath("/acme/widgets/issues/1/conflicts")).toBe(false);
    expect(isIgnoredPrPath("/conflicts")).toBe(false);
    expect(isIgnoredPrPath("/")).toBe(false);
  });
});

describe("buildPRFileDiffUrl", () => {
  // Hash matches GitHub's documented `#diff-` fragment for this path:
  // https://github.com/orgs/community/discussions/43908
  it("builds a Files-changed deep link with the path hash", async () => {
    const url = await buildPRFileDiffUrl(
      { owner: "acme", repo: "widgets", number: 42 },
      "src/index.js",
    );
    expect(url).toBe(
      "https://github.com/acme/widgets/pull/42/files#diff-bfe9874d239014961b1ae4e89875a6155667db834a410aaaa2ebe3cf89820556",
    );
  });

  it("appends a right-side line anchor when line is provided", async () => {
    const url = await buildPRFileDiffUrl(
      { owner: "acme", repo: "widgets", number: 42 },
      "src/index.js",
      17,
    );
    expect(url).toBe(
      "https://github.com/acme/widgets/pull/42/files#diff-bfe9874d239014961b1ae4e89875a6155667db834a410aaaa2ebe3cf89820556R17",
    );
  });
});

describe("buildFileLineUrl", () => {
  const pr = { owner: "acme", repo: "widgets", number: 42 };

  it("builds a head-branch blob URL when headRef is set", async () => {
    const url = await buildFileLineUrl(pr, {
      filePath: "src/foo.ts",
      line: 12,
      headRef: "feature-x",
    });
    expect(url).toBe("https://github.com/acme/widgets/blob/feature-x/src/foo.ts#L12");
  });

  it("encodes path segments and head ref", async () => {
    const url = await buildFileLineUrl(pr, {
      filePath: "src/my file.ts",
      line: 3,
      headRef: "feat/branch",
    });
    expect(url).toBe("https://github.com/acme/widgets/blob/feat%2Fbranch/src/my%20file.ts#L3");
  });

  it("falls back to the PR Files deep link when headRef is missing", async () => {
    const url = await buildFileLineUrl(pr, {
      filePath: "src/index.js",
      line: 9,
    });
    expect(url).toBe(
      "https://github.com/acme/widgets/pull/42/files#diff-bfe9874d239014961b1ae4e89875a6155667db834a410aaaa2ebe3cf89820556R9",
    );
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
