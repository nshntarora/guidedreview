import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { GitError } from "./run";
import {
  buildLocalReview,
  formatScopeMeta,
  parseCommitLog,
  parseShortstat,
  pickDefaultScope,
  rebuildLocalReview,
  reviewHasChanges,
} from "./localDiff";

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

afterEach(() => {
  temps.length = 0;
});

describe("parse helpers", () => {
  it("parses shortstat and commit log records", () => {
    expect(parseShortstat(" 3 files changed, 10 insertions(+), 2 deletions(-)")).toEqual({
      files: 3,
      additions: 10,
      deletions: 2,
    });
    expect(parseShortstat(" 1 file changed, 1 insertion(+)")).toEqual({
      files: 1,
      additions: 1,
      deletions: 0,
    });
    expect(formatScopeMeta({ files: 0, additions: 0, deletions: 0 })).toBe("No changes");
    expect(formatScopeMeta({ files: 2, additions: 4, deletions: 1 }, "3 commits")).toBe(
      "3 commits · 2 files · +4 −1",
    );

    const commits = parseCommitLog(
      [
        "aaa1111bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\x00Fix overlay\x00Longer body\x00Ada\x002026-01-02T10:00:00-08:00",
        "ccc2222ddddddddddddddddddddddddddddddd\x00Add tests\x00\x00Bob\x002026-01-03T11:00:00-08:00",
      ].join("\x1e"),
    );
    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({
      shortSha: "aaa1111",
      subject: "Fix overlay",
      body: "Longer body",
      author: "Ada",
    });
    expect(commits[1].subject).toBe("Add tests");
    expect(commits[1].body).toBe("");
  });

  it("picks the first non-empty scope, preferring uncommitted when --staged", () => {
    const emptyStat = { files: 0, additions: 0, deletions: 0 };
    const oneFile = { files: 1, additions: 1, deletions: 0 };
    const scopes = [
      {
        id: "branch" as const,
        label: "feat vs main",
        description: "",
        meta: "No changes",
        stat: emptyStat,
        empty: true,
      },
      {
        id: "uncommitted" as const,
        label: "Uncommitted changes",
        description: "",
        meta: "1 file",
        stat: oneFile,
        empty: false,
      },
      {
        id: "unstaged" as const,
        label: "Unstaged changes",
        description: "",
        meta: "1 file",
        stat: oneFile,
        empty: false,
      },
    ];
    expect(pickDefaultScope(scopes, false)).toBe("uncommitted");
    expect(pickDefaultScope(scopes, true)).toBe("uncommitted");

    const withBranch = scopes.map((scope) =>
      scope.id === "branch" ? { ...scope, empty: false, meta: "1 commit" } : scope,
    );
    expect(pickDefaultScope(withBranch, false)).toBe("branch");
    expect(pickDefaultScope(withBranch, true)).toBe("uncommitted");
  });
});

describe("buildLocalReview", () => {
  it("reports empty when the working tree matches main", async () => {
    const root = await makeRepo();
    const result = await buildLocalReview({ cwd: root });
    expect(result.empty).toBe(true);
    expect(result.diff.files).toEqual([]);
    expect(result.context.baseRef).toBe("main");
    expect(reviewHasChanges(result)).toBe(false);
    expect(
      result.scopes.filter((scope) => !scope.id.startsWith("commit:")).every((s) => s.empty),
    ).toBe(true);
  });

  it("defaults to uncommitted when only the working tree is dirty", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "readme.md"), "hello world\n");
    const result = await buildLocalReview({ cwd: root });
    expect(result.empty).toBe(false);
    expect(result.selectedScope).toBe("uncommitted");
    expect(result.diff.files.map((f) => f.path)).toContain("readme.md");
    expect(result.context.source).toBe("local");
    expect(result.scopes.find((s) => s.id === "branch")?.empty).toBe(true);
  });

  it("defaults to branch vs base when there are commits and a clean tree", async () => {
    const root = await makeRepo();
    await git(root, ["checkout", "-b", "feat"]);
    await writeFile(path.join(root, "feat.ts"), "export const n = 1;\n");
    await git(root, ["add", "feat.ts"]);
    await git(root, ["commit", "-m", "add feat\n\nWhy we did it."]);

    const result = await buildLocalReview({ cwd: root });
    expect(result.selectedScope).toBe("branch");
    expect(result.context.headRef).toBe("feat");
    expect(result.context.baseRef).toBe("main");
    expect(result.diff.files.map((f) => f.path)).toContain("feat.ts");
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0]).toMatchObject({
      subject: "add feat",
      body: "Why we did it.",
      author: "Test",
      stat: { files: 1, additions: 1, deletions: 0 },
    });
    expect(result.context.description).toContain("add feat");
    expect(result.context.description).toContain("Why we did it.");

    const commitScope = result.scopes.find((s) => s.id.startsWith("commit:"));
    expect(commitScope?.label).toBe("add feat");
    expect(commitScope?.empty).toBe(false);
    expect(commitScope?.stat).toEqual({ files: 1, additions: 1, deletions: 0 });
  });

  it("keeps dirty work out of the branch scope", async () => {
    const root = await makeRepo();
    await git(root, ["checkout", "-b", "feat"]);
    await writeFile(path.join(root, "feat.ts"), "export const n = 1;\n");
    await git(root, ["add", "feat.ts"]);
    await git(root, ["commit", "-m", "add feat"]);
    await writeFile(path.join(root, "dirty.ts"), "export const d = 1;\n");

    const branch = await buildLocalReview({ cwd: root, scope: "branch" });
    expect(branch.diff.files.map((f) => f.path)).toContain("feat.ts");
    expect(branch.diff.files.map((f) => f.path)).not.toContain("dirty.ts");

    const uncommitted = await rebuildLocalReview(branch.repo, "uncommitted");
    expect(uncommitted.diff.files.map((f) => f.path)).toContain("dirty.ts");
    expect(uncommitted.diff.files.map((f) => f.path)).not.toContain("feat.ts");
  });

  it("splits unstaged from staged work", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "staged.ts"), "export const s = 1;\n");
    await git(root, ["add", "staged.ts"]);
    await writeFile(path.join(root, "readme.md"), "hello staged-and-unstaged\n");

    const uncommitted = await buildLocalReview({ cwd: root, scope: "uncommitted" });
    const uncommittedPaths = uncommitted.diff.files.map((f) => f.path);
    expect(uncommittedPaths).toContain("staged.ts");
    expect(uncommittedPaths).toContain("readme.md");

    const unstaged = await rebuildLocalReview(uncommitted.repo, "unstaged");
    const unstagedPaths = unstaged.diff.files.map((f) => f.path);
    expect(unstagedPaths).toContain("readme.md");
    expect(unstagedPaths).not.toContain("staged.ts");
  });

  it("includes untracked files in uncommitted by default and skips them with --no-untracked", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "new.ts"), "export const n = 1;\n");
    const withUntracked = await buildLocalReview({ cwd: root });
    expect(withUntracked.selectedScope).toBe("uncommitted");
    expect(withUntracked.diff.files.map((f) => f.path)).toContain("new.ts");

    const without = await buildLocalReview({ cwd: root, includeUntracked: false });
    expect(reviewHasChanges(without)).toBe(false);
    expect(without.diff.files.map((f) => f.path)).not.toContain("new.ts");
  });

  it("--staged preselects index-only uncommitted work", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "staged.ts"), "export const s = 1;\n");
    await git(root, ["add", "staged.ts"]);
    await writeFile(path.join(root, "unstaged.ts"), "export const u = 1;\n");

    const result = await buildLocalReview({ cwd: root, staged: true });
    expect(result.selectedScope).toBe("uncommitted");
    const paths = result.diff.files.map((f) => f.path);
    expect(paths).toContain("staged.ts");
    expect(paths).not.toContain("unstaged.ts");
  });

  it("exposes only the last 5 commits as cards and scopes", async () => {
    const root = await makeRepo();
    await git(root, ["checkout", "-b", "feat"]);
    for (let i = 1; i <= 6; i++) {
      await writeFile(path.join(root, `f${i}.ts`), `export const n = ${i};\n`);
      await git(root, ["add", `f${i}.ts`]);
      await git(root, ["commit", "-m", `commit ${i}`]);
    }

    const review = await buildLocalReview({ cwd: root });
    expect(review.commits).toHaveLength(5);
    expect(review.commits.map((c) => c.subject)).toEqual([
      "commit 6",
      "commit 5",
      "commit 4",
      "commit 3",
      "commit 2",
    ]);
    expect(review.scopes.filter((s) => s.id.startsWith("commit:")).map((s) => s.label)).toEqual([
      "commit 6",
      "commit 5",
      "commit 4",
      "commit 3",
      "commit 2",
    ]);
    expect(review.scopes.find((s) => s.id === "branch")?.meta).toMatch(/6 commits/);
  });

  it("rebuilds a single-commit scope as that commit's patch", async () => {
    const root = await makeRepo();
    await git(root, ["checkout", "-b", "feat"]);
    await writeFile(path.join(root, "one.ts"), "export const one = 1;\n");
    await git(root, ["add", "one.ts"]);
    await git(root, ["commit", "-m", "first"]);
    await writeFile(path.join(root, "two.ts"), "export const two = 2;\n");
    await git(root, ["add", "two.ts"]);
    await git(root, ["commit", "-m", "second"]);

    const review = await buildLocalReview({ cwd: root });
    expect(review.commits).toHaveLength(2);
    const first = review.commits.find((c) => c.subject === "first");
    expect(first).toBeTruthy();
    const scoped = await rebuildLocalReview(review.repo, `commit:${first!.sha}`);
    expect(scoped.diff.files.map((f) => f.path)).toEqual(["one.ts"]);
    expect(scoped.selectedScope).toBe(`commit:${first!.sha}`);
  });

  it("rebuilds the same scope to the same files and session-key shape", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "readme.md"), "hello rebuild\n");
    const built = await buildLocalReview({ cwd: root });
    const rebuilt = await rebuildLocalReview(built.repo, built.selectedScope);
    expect(rebuilt.selectedScope).toBe(built.selectedScope);
    expect(rebuilt.diff.files.map((file) => file.path)).toEqual(
      built.diff.files.map((file) => file.path),
    );
    expect(rebuilt.sessionKey.split(":").slice(0, 4)).toEqual(
      built.sessionKey.split(":").slice(0, 4),
    );
    expect(rebuilt.sessionKey).toBe(built.sessionKey);
  });

  it("fails outside a git repo", async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `gr-nongit-${Date.now()}`), { recursive: true });
    await expect(buildLocalReview({ cwd: dir! })).rejects.toBeInstanceOf(GitError);
  });
});
