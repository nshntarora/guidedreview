import { describe, expect, it } from "vitest";
import { buildPRFileDiffUrl } from "./prFileDiffUrl";

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
});
