import { afterEach, describe, expect, it, vi } from "vitest";
import { bytesToDataUrl, fetchRawFilePreview, mimeForPreview } from "./rawFile";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mimeForPreview", () => {
  it("prefers the path MIME so SVG served as text/plain still renders", () => {
    expect(mimeForPreview("icon.svg", "text/plain")).toBe("image/svg+xml");
    expect(mimeForPreview("logo.png", "image/png")).toBe("image/png");
    expect(mimeForPreview("logo.png", "text/html")).toBeNull();
  });
});

describe("fetchRawFilePreview", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

  it("fetches github.com/raw with cookies and returns a data URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(png, { status: 200, headers: { "content-type": "image/png" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const dataUrl = await fetchRawFilePreview({
      owner: "acme",
      repo: "widgets",
      ref: "refs/pull/42/head",
      path: "logo.png",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://github.com/acme/widgets/raw/refs/pull/42/head/logo.png",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(dataUrl).toBe(bytesToDataUrl(png.buffer, "image/png"));
  });

  it("rejects non-image paths before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchRawFilePreview({
        owner: "acme",
        repo: "widgets",
        ref: "main",
        path: "src/secret.ts",
      }),
    ).rejects.toThrow(/not valid/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects path traversal before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchRawFilePreview({
        owner: "acme",
        repo: "widgets",
        ref: "main",
        path: "../secret.png",
      }),
    ).rejects.toThrow(/not valid/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
