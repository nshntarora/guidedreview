import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { ParsedDiff } from "@guided-review/core";
import { buildLocalReview, type LocalReviewSnapshot } from "../git/localDiff";
import { configPath } from "../config";
import type { CliStatus } from "../banner";
import { createCapturingLogger } from "../log";
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
  it("serves the session and streams no_api_key without a key", async () => {
    const { logger, records } = createCapturingLogger();
    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      logger,
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const session = await fetch(`${base}/api/session`).then(
      (r) => r.json() as Promise<ReviewSessionPayload>,
    );
    expect(session.diff.files).toHaveLength(1);
    expect(session.settings.hasKey).toBe(false);
    expect(session.selectedScope).toBe("branch");
    expect(session.commits).toHaveLength(1);
    expect(session.scopes).toHaveLength(3);

    const planRes = await fetch(`${base}/api/plan`);
    const body = await planRes.text();
    expect(body.startsWith(":")).toBe(true);
    expect(body).toContain("no_api_key");
    expect(
      records.some(
        (line) =>
          line.level === "info" &&
          (line.label === "http" || line.message.includes("GET /api/session")),
      ),
    ).toBe(false);
    expect(
      records.some((line) => line.label === "session" && line.message.includes("file(s)")),
    ).toBe(false);
    expect(
      records.some((line) => line.label === "plan" && line.message.includes("no API key")),
    ).toBe(true);

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
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const unknown = await fetch(`${base}/api/diff`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "nope" }),
    });
    expect(unknown.status).toBe(400);

    const switched = await fetch(`${base}/api/diff`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "uncommitted" }),
    }).then((r) => r.json() as Promise<ReviewSessionPayload>);
    expect(switched.selectedScope).toBe("uncommitted");
    expect(switched.diff.files.map((file) => file.path)).toContain("dirty.ts");
    expect(switched.diff.files.map((file) => file.path)).not.toContain("feat.ts");

    const session = await fetch(`${base}/api/session`).then(
      (r) => r.json() as Promise<{ selectedScope: string; diff: ParsedDiff }>,
    );
    expect(session.selectedScope).toBe("uncommitted");
    expect(session.diff.files.map((file) => file.path)).toContain("dirty.ts");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("reports a changed working tree without swapping the snapshot until session reload", async () => {
    const root = await mkdir(path.join(os.tmpdir(), `gr-hash-${Date.now()}`), { recursive: true });
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

    const live = await buildLocalReview({ cwd, scope: "branch" });
    const { logger, records } = createCapturingLogger();
    const patches: Partial<CliStatus>[] = [];
    const server = createReviewServer({
      snapshot: live,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      logger,
      onStatus: (patch) => patches.push(patch),
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const before = await fetch(`${base}/api/diff-status`).then(
      (r) => r.json() as Promise<{ changed: boolean; hash: string }>,
    );
    expect(before.changed).toBe(false);
    expect(patches.some((patch) => patch.diffFresh === "up to date")).toBe(true);

    await writeFile(path.join(cwd, "feat.ts"), "export const n = 2;\n");
    await git(["add", "feat.ts"]);
    await git(["commit", "-m", "edit feat"]);

    const status = await fetch(`${base}/api/diff-status`).then(
      (r) => r.json() as Promise<{ changed: boolean; hash: string }>,
    );
    expect(status.changed).toBe(true);
    expect(status.hash).not.toBe(before.hash);

    const plan = await fetch(`${base}/api/plan`).then((r) => r.text());
    expect(plan).toContain("no_api_key");

    const reloaded = await fetch(`${base}/api/session`).then(
      (r) => r.json() as Promise<ReviewSessionPayload>,
    );
    expect(reloaded.diffHash).toBe(status.hash);
    expect(
      patches.some(
        (patch) =>
          patch.files === reloaded.diff.files.length &&
          patch.scope === "branch" &&
          patch.lastPullAt instanceof Date,
      ),
    ).toBe(true);
    expect(
      records.some(
        (line) =>
          line.level === "info" &&
          line.label === "http" &&
          line.message.includes("GET /api/diff-status"),
      ),
    ).toBe(false);
    expect(
      reloaded.diff.files.some((file) =>
        file.hunks.some((h) => h.lines.some((line) => line.content.includes("n = 2"))),
      ),
    ).toBe(true);

    const after = await fetch(`${base}/api/diff-status`).then(
      (r) => r.json() as Promise<{ changed: boolean }>,
    );
    expect(after.changed).toBe(false);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("shuts down once under repeated signals without stacking close listeners", async () => {
    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
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

  describe("PUT /api/settings", () => {
    const prevConfigDir = process.env.GUIDED_REVIEW_CONFIG_DIR;

    afterEach(() => {
      if (prevConfigDir === undefined) delete process.env.GUIDED_REVIEW_CONFIG_DIR;
      else process.env.GUIDED_REVIEW_CONFIG_DIR = prevConfigDir;
    });

    async function withTempConfig(): Promise<string> {
      const dir = await mkdir(path.join(os.tmpdir(), `gr-cfg-${Date.now()}`), { recursive: true });
      process.env.GUIDED_REVIEW_CONFIG_DIR = dir!;
      return dir!;
    }

    it("keeps agent auth in memory and does not persist the secret", async () => {
      const dir = await withTempConfig();
      const server = createReviewServer({
        snapshot,
        settings: {
          provider: "anthropic",
          model: "claude-sonnet-4-6",
          apiKey: "sk-ant-oat01-live",
          authScheme: "bearer",
          extraHeaders: { "anthropic-beta": "oauth-2025-04-20" },
        },
        codingAgent: "claude-code",
      });
      const port = await listen(server);
      const base = `http://127.0.0.1:${port}`;

      const saved = await fetch(`${base}/api/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "anthropic", model: "claude-opus-4-8" }),
      }).then((r) => r.json() as Promise<{ codingAgent: string | null; hasKey: boolean }>);
      expect(saved.codingAgent).toBe("claude-code");
      expect(saved.hasKey).toBe(true);

      const file = JSON.parse(await readFile(path.join(dir, "config.json"), "utf8")) as {
        apiKey?: string;
        codingAgent?: string;
        model?: string;
      };
      expect(file.apiKey).toBeUndefined();
      expect(file.codingAgent).toBeUndefined();
      expect(file.model).toBe("claude-opus-4-8");

      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });

    it("stores a pasted key and clears the coding agent", async () => {
      await withTempConfig();
      const server = createReviewServer({
        snapshot,
        settings: {
          provider: "anthropic",
          model: "claude-sonnet-4-6",
          apiKey: "sk-ant-oat01-live",
          authScheme: "bearer",
          extraHeaders: { "anthropic-beta": "oauth-2025-04-20" },
        },
        codingAgent: "claude-code",
      });
      const port = await listen(server);
      const base = `http://127.0.0.1:${port}`;

      const saved = await fetch(`${base}/api/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "openai",
          model: "gpt-4.1",
          apiKey: "sk-user",
        }),
      }).then((r) => r.json() as Promise<{ codingAgent: string | null; last4: string | null }>);
      expect(saved.codingAgent).toBeNull();
      expect(saved.last4).toBe("user");

      const file = JSON.parse(await readFile(configPath(), "utf8")) as {
        apiKey?: string;
        codingAgent?: string;
        provider?: string;
      };
      expect(file.apiKey).toBe("sk-user");
      expect(file.codingAgent).toBeUndefined();
      expect(file.provider).toBe("openai");

      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });

    it("rejects invalid JSON with 400", async () => {
      const server = createReviewServer({
        snapshot,
        settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      });
      const port = await listen(server);
      const res = await fetch(`http://127.0.0.1:${port}/api/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{",
      });
      expect(res.status).toBe(400);
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });

    it("switches to a detected coding agent and drops the stored key", async () => {
      const dir = await withTempConfig();
      await writeFile(
        path.join(dir, "config.json"),
        JSON.stringify({ provider: "openai", apiKey: "sk-old" }),
        "utf8",
      );
      const server = createReviewServer({
        snapshot,
        settings: { provider: "openai", model: "gpt-4.1", apiKey: "sk-old" },

        detectAgents: async () => [
          {
            id: "codex",
            displayName: "Codex",
            provider: "openai",
            auth: {
              provider: "openai",
              secret: "sk-agent-secret",
              kind: "api_key",
              usableForReview: true,
              model: "gpt-5",
            },
          },
        ],
      });
      const port = await listen(server);
      const saved = await fetch(`http://127.0.0.1:${port}/api/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codingAgent: "codex" }),
      }).then(
        (r) =>
          r.json() as Promise<{
            codingAgent: string | null;
            last4: string | null;
            hasKey: boolean;
          }>,
      );
      expect(saved.codingAgent).toBe("codex");
      expect(saved.hasKey).toBe(true);
      expect(saved.last4).toBe("cret");

      const file = JSON.parse(await readFile(configPath(), "utf8")) as {
        apiKey?: string;
        codingAgent?: string;
      };
      expect(file.codingAgent).toBe("codex");
      expect(file.apiKey).toBeUndefined();

      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });

    it("rejects an unknown coding agent", async () => {
      const server = createReviewServer({
        snapshot,
        settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },

        detectAgents: async () => [],
      });
      const port = await listen(server);
      const res = await fetch(`http://127.0.0.1:${port}/api/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codingAgent: "codex" }),
      });
      expect(res.status).toBe(400);
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });
  });

  describe("GET /api/agents", () => {
    it("returns detected agents without secrets", async () => {
      const server = createReviewServer({
        snapshot,
        settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },

        detectAgents: async () => [
          {
            id: "claude-code",
            displayName: "Claude Code",
            provider: "anthropic",
            auth: {
              provider: "anthropic",
              secret: "sk-ant-oat01-live",
              kind: "oauth",
              usableForReview: true,
            },
          },
        ],
      });
      const port = await listen(server);
      const body = await fetch(`http://127.0.0.1:${port}/api/agents`).then(
        (r) =>
          r.json() as Promise<{
            agents: { id: string; displayName: string; usable: boolean }[];
          }>,
      );
      expect(body.agents).toEqual([
        {
          id: "claude-code",
          displayName: "Claude Code",
          provider: "anthropic",
          installed: true,
          usable: true,
          reason: null,
        },
        {
          id: "codex",
          displayName: "Codex",
          provider: "openai",
          installed: false,
          usable: false,
          reason: "Codex is not installed.",
        },
        {
          id: "grok",
          displayName: "Grok",
          provider: "grok",
          installed: false,
          usable: false,
          reason: "Grok is not installed.",
        },
      ]);
      expect(JSON.stringify(body)).not.toContain("sk-ant");

      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });
  });

  describe("POST /api/settings/test", () => {
    const prevConfigDir = process.env.GUIDED_REVIEW_CONFIG_DIR;

    afterEach(() => {
      if (prevConfigDir === undefined) delete process.env.GUIDED_REVIEW_CONFIG_DIR;
      else process.env.GUIDED_REVIEW_CONFIG_DIR = prevConfigDir;
    });

    it("returns ok when the probe succeeds", async () => {
      const dir = await mkdir(path.join(os.tmpdir(), `gr-cfg-${Date.now()}`), { recursive: true });
      process.env.GUIDED_REVIEW_CONFIG_DIR = dir!;
      const calls: string[] = [];
      const server = createReviewServer({
        snapshot,
        settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "sk-old" },

        testConnection: async (next) => {
          calls.push(next.apiKey);
        },
      });
      const port = await listen(server);
      const body = await fetch(`http://127.0.0.1:${port}/api/settings/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "openai", model: "gpt-4.1", apiKey: "sk-new" }),
      }).then((r) => r.json() as Promise<{ ok: boolean }>);
      expect(body).toEqual({ ok: true });
      expect(calls).toEqual(["sk-new"]);
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });

    it("returns a user-facing error when the probe fails", async () => {
      const dir = await mkdir(path.join(os.tmpdir(), `gr-cfg-${Date.now()}`), { recursive: true });
      process.env.GUIDED_REVIEW_CONFIG_DIR = dir!;
      const server = createReviewServer({
        snapshot,
        settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "sk-bad" },

        testConnection: async () => {
          throw new Error("Invalid API key");
        },
      });
      const port = await listen(server);
      const res = await fetch(`http://127.0.0.1:${port}/api/settings/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: false, error: "Invalid API key" });
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    });
  });
});
