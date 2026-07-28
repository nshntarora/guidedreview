import { describe, expect, it } from "vitest";
import { isIgnoredPrPath } from "./ignoredPrPaths";

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
