import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";
import { describe, expect, it } from "vitest";
import type { ParsedDiff } from "@guided-review/core";
import { buildLocalReview, type LocalReviewSnapshot } from "../git/localDiff";
import {
  createReviewServer,
  createServerShutdown,
  listen,
  type ReviewSessionPayload,
} from "./createServer";

const execFileAsync = promisify(execFile);

const snapshot: LocalReviewSnapshot = {
  repo: {
    repoRoot: "/tmp/repo",
    baseRef: "main",
    headRef: "feat",
    mergeBase: "abc",
    includeUntracked: true,
    staged: false,
  },
  commits: [
    {
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      shortSha: "aaaaaaa",
      subject: "Add feat",
      body: "",
      author: "Test",
      authoredAt: "2026-01-02T00:00:00Z",
    },
  ],
  scopes: [
    {
      id: "branch",
      label: "feat vs main",
      description: "Committed work",
      meta: "1 commit · 1 file · +1 −0",
      stat: { files: 1, additions: 1, deletions: 0 },
      empty: false,
    },
    {
      id: "uncommitted",
      label: "Uncommitted changes",
      description: "Dirty tree",
      meta: "No changes",
      stat: { files: 0, additions: 0, deletions: 0 },
      empty: true,
    },
    {
      id: "unstaged",
      label: "Unstaged changes",
      description: "Unstaged only",
      meta: "No changes",
      stat: { files: 0, additions: 0, deletions: 0 },
      empty: true,
    },
  ],
  selectedScope: "branch",
  context: {
    source: "local",
    title: "feat",
    description: "Add feat (aaaaaaa)",
    baseRef: "main",
    headRef: "feat",
  },
  diff: {
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
  },
  raw: "",
  sessionKey: "repo:main:feat:branch:abc",
  empty: false,
};

describe("createReviewServer", () => {
  it("serves the session only with the token and streams no_api_key without a key", async () => {
    const logs: string[] = [];
    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      token: "secret",
      log: (message) => logs.push(message),
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const denied = await fetch(`${base}/api/session`);
    expect(denied.status).toBe(401);

    const session = await fetch(`${base}/api/session?token=secret`).then(
      (r) => r.json() as Promise<ReviewSessionPayload>,
    );
    expect(session.diff.files).toHaveLength(1);
    expect(session.settings.hasKey).toBe(false);
    expect(session.selectedScope).toBe("branch");
    expect(session.commits).toHaveLength(1);
    expect(session.scopes).toHaveLength(3);

    const planRes = await fetch(`${base}/api/plan?token=secret`);
    const body = await planRes.text();
    expect(body.startsWith(":")).toBe(true);
    expect(body).toContain("no_api_key");
    expect(logs.some((line) => line.includes("401 unauthorized"))).toBe(true);
    expect(logs.some((line) => line.includes("GET /api/session"))).toBe(true);
    expect(logs.some((line) => line.includes("no API key"))).toBe(true);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("rejects an unknown scope and swaps the session on a real repo", async () => {
    const root = await mkdir(path.join(os.tmpdir(), `gr-srv-${Date.now()}`), { recursive: true });
    const cwd = root!;
    const git = (args: string[]) => execFileAsync("git", args, { cwd });
    await git(["init", "-b", "main"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "Test"]);
    await writeFile(path.join(cwd, "readme.md"), "hello\n");
    await git(["add", "readme.md"]);
    await git(["commit", "-m", "initial"]);
    await git(["checkout", "-b", "feat"]);
    await writeFile(path.join(cwd, "feat.ts"), "export const n = 1;\n");
    await git(["add", "feat.ts"]);
    await git(["commit", "-m", "add feat"]);
    await writeFile(path.join(cwd, "dirty.ts"), "export const d = 1;\n");

    const live = await buildLocalReview({ cwd });
    const server = createReviewServer({
      snapshot: live,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      token: "secret",
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const unknown = await fetch(`${base}/api/diff?token=secret`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "nope" }),
    });
    expect(unknown.status).toBe(400);

    const switched = await fetch(`${base}/api/diff?token=secret`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "uncommitted" }),
    }).then((r) => r.json() as Promise<ReviewSessionPayload>);
    expect(switched.selectedScope).toBe("uncommitted");
    expect(switched.diff.files.map((file) => file.path)).toContain("dirty.ts");
    expect(switched.diff.files.map((file) => file.path)).not.toContain("feat.ts");

    const session = await fetch(`${base}/api/session?token=secret`).then(
      (r) => r.json() as Promise<{ selectedScope: string; diff: ParsedDiff }>,
    );
    expect(session.selectedScope).toBe("uncommitted");
    expect(session.diff.files.map((file) => file.path)).toContain("dirty.ts");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("shuts down once under repeated signals without stacking close listeners", async () => {
    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      token: "secret",
    });
    const port = await listen(server);

    // Hold an open socket so close would otherwise hang (same class of problem as SSE).
    const held = await new Promise<net.Socket>((resolve, reject) => {
      const socket = net.connect(port, "127.0.0.1", () => resolve(socket));
      socket.on("error", reject);
    });

    let closeCalls = 0;
    const realClose = server.close.bind(server);
    server.close = ((cb?: (err?: Error) => void) => {
      closeCalls += 1;
      return realClose(cb);
    }) as typeof server.close;

    const exits: number[] = [];
    const shutdown = createServerShutdown(server, (code) => {
      exits.push(code);
    });

    shutdown();
    shutdown();
    shutdown();

    expect(closeCalls).toBe(1);
    expect(server.listenerCount("close")).toBeLessThanOrEqual(1);
    // Second and third signals force-exit instead of stacking more close listeners.
    expect(exits.filter((code) => code === 1)).toHaveLength(2);

    held.destroy();
    await new Promise<void>((resolve) => {
      if (!server.listening) {
        resolve();
        return;
      }
      realClose(() => resolve());
      server.closeAllConnections();
    });
  });
});
