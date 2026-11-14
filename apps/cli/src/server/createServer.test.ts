import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
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

import { SessionStore } from "../review/sessionStore";
import * as localDiff from "../git/localDiff";

const execFileAsync = promisify(execFile);

const snapshot: LocalReviewSnapshot = {
  totalCommits: 1,
  repo: {
    repoRoot: "/tmp/repo",
    gitDir: "/tmp/repo/.git",
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
  it("does not let an older session refresh overwrite a scope change", async () => {
    let release!: (value: LocalReviewSnapshot) => void;
    let started!: () => void;
    const pending = new Promise<LocalReviewSnapshot>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const next = { ...snapshot, selectedScope: "unstaged" as const };
    const rebuild = vi
      .spyOn(localDiff, "rebuildLocalReview")
      .mockImplementationOnce(() => {
        started();
        return pending;
      })
      .mockResolvedValue(next);
    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "custom", apiKey: "" },
    });
    const base = `http://127.0.0.1:${await listen(server)}`;
    try {
      const refresh = fetch(`${base}/api/session`);
      await entered;
      const changed = await fetch(`${base}/api/diff`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: "unstaged" }),
      });
      expect(changed.status).toBe(200);
      release(snapshot);
      expect(((await (await refresh).json()) as ReviewSessionPayload).selectedScope).toBe(
        "unstaged",
      );
      expect(
        ((await (await fetch(`${base}/api/session`)).json()) as ReviewSessionPayload).selectedScope,
      ).toBe("unstaged");
    } finally {
      release(snapshot);
      rebuild.mockRestore();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

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

  it("serves image blobs from the current diff and rejects other paths", async () => {
    const root = await mkdir(path.join(os.tmpdir(), `gr-img-srv-${Date.now()}`), {
      recursive: true,
    });
    const cwd = root!;
    const git = (args: string[]) => execFileAsync("git", args, { cwd });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await git(["init", "-b", "main"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "Test"]);
    await writeFile(path.join(cwd, "readme.md"), "hello\n");
    await git(["add", "readme.md"]);
    await git(["commit", "-m", "initial"]);
    await git(["checkout", "-b", "feat"]);
    await writeFile(path.join(cwd, "logo.png"), png);
    await git(["add", "logo.png"]);
    await git(["commit", "-m", "add logo"]);

    const live = await buildLocalReview({ cwd, scope: "branch" });
    const server = createReviewServer({
      snapshot: live,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const ok = await fetch(`${base}/api/file?path=logo.png&side=new`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await ok.arrayBuffer()).equals(png)).toBe(true);

    const missing = await fetch(`${base}/api/file?path=readme.md&side=new`);
    expect(missing.status).toBe(404);

    const oldAdded = await fetch(`${base}/api/file?path=logo.png&side=old`);
    expect(oldAdded.status).toBe(404);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("durably restores unfinished reviews across restart, validates storage, and isolates worktrees", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "gr-durable-"));
    const worktree = `${cwd}-linked`;
    const git = (args: string[]) => execFileAsync("git", args, { cwd });
    const settings = { provider: "anthropic" as const, model: "custom-model", apiKey: "secret" };
    let server: ReturnType<typeof createReviewServer> | undefined;
    const stop = async () => {
      if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = undefined;
    };
    try {
      await git(["init", "-b", "main"]);
      await git(["config", "user.email", "test@example.com"]);
      await git(["config", "user.name", "Test"]);
      await writeFile(path.join(cwd, "a.ts"), "before\n");
      await git(["add", "."]);
      await git(["commit", "-m", "initial"]);
      await writeFile(path.join(cwd, "a.ts"), "after\n");
      let live = await buildLocalReview({ cwd, scope: "uncommitted" });
      const key = live.sessionKey;
      const data = {
        diff: live.diff,
        plan: null,
        prContext: live.context,
        selection: { kind: "file", path: "a.ts" },
        navigationMode: "files",
        scrollPositions: { "a.ts": 120 },
        pendingComposers: {
          "a.ts": {
            body: "Unfinished note",
            lines: [
              {
                id: "a.ts#0:1:RIGHT",
                filePath: "a.ts",
                hunkId: "a.ts#0",
                lineIndex: 1,
                side: "RIGHT",
                type: "add",
                content: "after",
                newLine: 1,
              },
            ],
          },
        },
      };
      server = createReviewServer({ snapshot: live, settings });
      let base = `http://127.0.0.1:${await listen(server)}`;
      const endpoint = () => `${base}/api/review-state?${new URLSearchParams({ key })}`;
      const put = (body: unknown, method = "PUT", target = endpoint()) =>
        fetch(target, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      const diffHash = localDiff.hashDiff(live.raw);
      const writes = await Promise.all(Array.from({ length: 8 }, () => put({ data, diffHash })));
      expect(writes.map((r) => r.status)).toEqual(Array(8).fill(200));
      expect((await put({ data: { ...data, apiKey: "secret" }, diffHash })).status).toBe(400);
      expect(
        (await put({ data, diffHash }, "PUT", `${base}/api/review-state?key=outside`)).status,
      ).toBe(400);
      const store = new SessionStore(live.repo.gitDir);
      const [filename] = await readdir(store.directory);
      const disk = path.join(store.directory, filename!);
      expect((await stat(disk)).mode & 0o777).toBe(0o600);
      expect(await readFile(disk, "utf8")).not.toContain("secret");
      await stop();
      await writeFile(path.join(cwd, "a.ts"), "newer\n");
      live = await buildLocalReview({ cwd, scope: "uncommitted" });
      expect(live.sessionKey).toBe(key);
      expect(localDiff.hashDiff(live.raw)).not.toBe(diffHash);
      server = createReviewServer({ snapshot: live, settings });
      base = `http://127.0.0.1:${await listen(server)}`;
      expect(await fetch(endpoint()).then((r) => r.json())).toMatchObject({
        version: 1,
        data: JSON.parse(JSON.stringify(data)),
        diffHash,
      });
      await git(["worktree", "add", "-b", "linked", worktree, "main"]);
      const linked = await buildLocalReview({ cwd: worktree, scope: "uncommitted" });
      expect(linked.repo.gitDir).not.toBe(live.repo.gitDir);
      expect(await new SessionStore(linked.repo.gitDir).read(key)).toBeNull();
      await writeFile(disk, "{corrupt");
      expect(await fetch(endpoint()).then((r) => r.json())).toBeNull();
      await writeFile(
        disk,
        JSON.stringify({ version: 99, key, diffHash, data, savedAt: Date.now() }),
      );
      expect(await fetch(endpoint()).then((r) => r.json())).toBeNull();
      expect((await put({ data, diffHash }, "POST")).status).toBe(200);
      expect((await fetch(endpoint(), { method: "DELETE" })).status).toBe(200);
      expect(await fetch(endpoint()).then((r) => r.json())).toBeNull();
    } finally {
      await stop();
      await rm(worktree, { recursive: true, force: true });
      await rm(cwd, { recursive: true, force: true });
    }
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

    // A refresh may legitimately leave no changed files. Scope selection still
    // rejects empty scopes; refresh must let the UI recover notes from the old diff.
    await git(["checkout", "main"]);
    const emptySelection = await fetch(`${base}/api/diff`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "branch" }),
    });
    expect(emptySelection.status).toBe(400);
    const emptyRefresh = await fetch(`${base}/api/diff`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "branch", refresh: true }),
    });
    expect(emptyRefresh.status).toBe(200);
    const refreshed = (await emptyRefresh.json()) as ReviewSessionPayload;
    expect(refreshed.diff.files).toEqual([]);
    expect(refreshed.context.headRef).toBe("main");
    expect(refreshed.sessionKey).not.toBe(live.sessionKey);

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

    it("preserves live settings when persistence fails", async () => {
      const dir = await withTempConfig();
      await writeFile(path.join(dir, "config.json"), "invalid JSON");
      const settings = {
        provider: "anthropic" as const,
        model: "custom-original",
        apiKey: "saved-key",
      };
      const server = createReviewServer({ snapshot, settings });
      const base = `http://127.0.0.1:${await listen(server)}`;
      try {
        const before = await (await fetch(`${base}/api/settings`)).json();
        const response = await fetch(`${base}/api/settings`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: "custom-new" }),
        });
        expect(response.status).toBe(500);
        expect(await (await fetch(`${base}/api/settings`)).json()).toEqual(before);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

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

  it("serves index.html when staticDir sits under a dot-segment path", async () => {
    // Mimics global installs under ~/.nvm or ~/.npm — absolute sendFile without
    // `root` treats those segments as dotfiles and 404s.
    const root = await mkdir(path.join(os.tmpdir(), `gr-ui-${Date.now()}`, ".fakenvm", "ui"), {
      recursive: true,
    });
    const staticDir = root!;
    await writeFile(path.join(staticDir, "index.html"), "<!doctype html><title>ok</title>\n");

    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      staticDir,
    });
    const port = await listen(server);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>ok</title>");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });
});
