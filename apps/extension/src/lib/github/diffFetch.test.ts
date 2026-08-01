import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPRDiff, parsePRUrl } from "./diffFetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

describe("fetchPRDiff", () => {
  const pr = { owner: "acme", repo: "widgets", number: 42 };

  const sampleDiff = [
    "diff --git a/src/foo.ts b/src/foo.ts",
    "--- a/src/foo.ts",
    "+++ b/src/foo.ts",
    "@@ -1,1 +1,1 @@",
    "-old",
    "+new",
  ].join("\n");

  it("fetches the .diff endpoint with credentials and parses the body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(sampleDiff, { status: 200, headers: { "content-type": "text/plain" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const parsed = await fetchPRDiff(pr);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://github.com/acme/widgets/pull/42.diff",
      expect.objectContaining({
        credentials: "include",
        headers: { Accept: "text/plain" },
      }),
    );
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].path).toBe("src/foo.ts");
    expect(parsed.files[0].hunks[0].lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "del", content: "old" }),
        expect.objectContaining({ type: "add", content: "new" }),
      ]),
    );
  });

  it("throws a user-facing error on non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("Not Found", { status: 404, statusText: "Not Found" })),
    );

    await expect(fetchPRDiff(pr)).rejects.toThrow(/Could not fetch the diff.*HTTP 404/);
  });

  it("throws a network error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchPRDiff(pr)).rejects.toThrow(
      /Network error fetching the diff.*Failed to fetch/,
    );
  });
});
