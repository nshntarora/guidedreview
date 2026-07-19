import { describe, expect, it } from "vitest";
import { buildPRFileDiffUrl, sha256Hex } from "./prFileDiffUrl";

describe("sha256Hex", () => {
  it("matches GitHub’s documented hash for a sample path", async () => {
    // https://github.com/orgs/community/discussions/43908
    await expect(sha256Hex("src/index.js")).resolves.toBe(
      "bfe9874d239014961b1ae4e89875a6155667db834a410aaaa2ebe3cf89820556",
    );
  });
});

describe("buildPRFileDiffUrl", () => {
  it("builds a Files-changed deep link with the path hash", async () => {
    const url = await buildPRFileDiffUrl(
      { owner: "acme", repo: "widgets", number: 42 },
      "src/index.js",
    );
    expect(url).toBe(
      "https://github.com/acme/widgets/pull/42/files#diff-bfe9874d239014961b1ae4e89875a6155667db834a410aaaa2ebe3cf89820556",
    );
  });
});
