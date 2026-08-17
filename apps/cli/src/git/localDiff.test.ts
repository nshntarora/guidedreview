import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { GitError } from "./run";
import { buildLocalDiff } from "./localDiff";

const execFileAsync = promisify(execFile);

const temps: string[] = [];

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

async function makeRepo(): Promise<string> {
  const dir = await mkdir(path.join(os.tmpdir(), `gr-cli-${Date.now()}-${Math.random()}`), {
    recursive: true,
  });
  const root = dir!;
  temps.push(root);
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.email", "test@example.com"]);
  await git(root, ["config", "user.name", "Test"]);
  await writeFile(path.join(root, "readme.md"), "hello\n");
  await git(root, ["add", "readme.md"]);
  await git(root, ["commit", "-m", "initial"]);
  return root;
}

afterEach(async () => {
  // Leave temps; OS will clean /tmp. Avoid rm -rf surprises.
  temps.length = 0;
});

describe("buildLocalDiff", () => {
  it("reports empty when the working tree matches main", async () => {
    const root = await makeRepo();
    const result = await buildLocalDiff({ cwd: root });
    expect(result.empty).toBe(true);
    expect(result.diff.files).toEqual([]);
    expect(result.context.baseRef).toBe("main");
  });

  it("includes uncommitted edits against the merge-base", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "readme.md"), "hello world\n");
    const result = await buildLocalDiff({ cwd: root });
    expect(result.empty).toBe(false);
    expect(result.diff.files.map((f) => f.path)).toContain("readme.md");
    expect(result.context.source).toBe("local");
  });

  it("includes untracked files by default and skips them with --no-untracked", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "new.ts"), "export const n = 1;\n");
    const withUntracked = await buildLocalDiff({ cwd: root });
    expect(withUntracked.diff.files.map((f) => f.path)).toContain("new.ts");

    const without = await buildLocalDiff({ cwd: root, includeUntracked: false });
    expect(without.diff.files.map((f) => f.path)).not.toContain("new.ts");
  });

  it("--staged omits unstaged work", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "staged.ts"), "export const s = 1;\n");
    await git(root, ["add", "staged.ts"]);
    await writeFile(path.join(root, "unstaged.ts"), "export const u = 1;\n");

    const result = await buildLocalDiff({ cwd: root, staged: true });
    const paths = result.diff.files.map((f) => f.path);
    expect(paths).toContain("staged.ts");
    expect(paths).not.toContain("unstaged.ts");
  });

  it("fails outside a git repo", async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `gr-nongit-${Date.now()}`), { recursive: true });
    await expect(buildLocalDiff({ cwd: dir! })).rejects.toBeInstanceOf(GitError);
  });
});
