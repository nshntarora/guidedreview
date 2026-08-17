import { describe, expect, it } from "vitest";
import type { ParsedDiff, ReviewContext } from "@guided-review/core";
import { createReviewServer, listen } from "./createServer";

const context: ReviewContext = {
  source: "local",
  title: "feat",
  description: "work",
  baseRef: "main",
  headRef: "feat",
};

const diff: ParsedDiff = {
  files: [
    {
      path: "src/a.ts",
      status: "modified",
      isBinaryOrElided: false,
      hunks: [
        {
          id: "src/a.ts#0",
          header: "@@ -1 +1 @@",
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 1,
          lines: [{ type: "add", content: "x", newLine: 1 }],
        },
      ],
    },
  ],
};

describe("createReviewServer", () => {
  it("serves the session only with the token and streams no_api_key without a key", async () => {
    const server = createReviewServer({
      context,
      diff,
      sessionKey: "repo:main:feat:abc",
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      token: "secret",
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const denied = await fetch(`${base}/api/session`);
    expect(denied.status).toBe(401);

    const session = await fetch(`${base}/api/session?token=secret`).then(
      (r) => r.json() as Promise<{ diff: ParsedDiff; settings: { hasKey: boolean } }>,
    );
    expect(session.diff.files).toHaveLength(1);
    expect(session.settings.hasKey).toBe(false);

    const planRes = await fetch(`${base}/api/plan?token=secret`);
    const body = await planRes.text();
    expect(body).toContain("no_api_key");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });
});
