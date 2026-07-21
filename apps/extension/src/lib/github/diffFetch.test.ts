import { describe, expect, it } from "vitest";
import { parsePRUrl } from "./diffFetch";

describe("parsePRUrl", () => {
  it("parses a standard PR URL", () => {
    expect(parsePRUrl("https://github.com/acme/widgets/pull/42")).toEqual({
      owner: "acme",
      repo: "widgets",
      number: 42,
    });
  });

  it("parses a PR URL with a trailing path (e.g. /files)", () => {
    expect(parsePRUrl("https://github.com/acme/widgets/pull/42/files")).toEqual({
      owner: "acme",
      repo: "widgets",
      number: 42,
    });
  });

  it("returns null for a non-PR github.com URL", () => {
    expect(parsePRUrl("https://github.com/acme/widgets/issues/42")).toBeNull();
  });

  it("returns null for a non-github URL", () => {
    expect(parsePRUrl("https://example.com/acme/widgets/pull/42")).toBeNull();
  });
});
