import { createHash } from "node:crypto";
import path from "node:path";
import { parseDiff, type ParsedDiff, type ReviewContext } from "@guided-review/core";
import { GitError, runGit } from "./run";

export interface LocalDiffOptions {
  cwd: string;
  base?: string;
  staged?: boolean;
  includeUntracked?: boolean;
}

export interface LocalDiffResult {
  repoRoot: string;
  context: ReviewContext;
  diff: ParsedDiff;
  raw: string;
  sessionKey: string;
  empty: boolean;
}

function nullDevice(): string {
  return process.platform === "win32" ? "NUL" : "/dev/null";
}

async function resolveBase(repoRoot: string, requested?: string): Promise<string> {
  if (requested) {
    try {
      await runGit(["rev-parse", "--verify", requested], repoRoot);
      return requested;
    } catch {
      throw new GitError(
        `Base ref "${requested}" does not exist. Pass --base with a real branch or commit.`,
      );
    }
  }

  const candidates = ["origin/HEAD", "main", "master"];
  for (const candidate of candidates) {
    try {
      const resolved = (await runGit(["rev-parse", "--abbrev-ref", candidate], repoRoot)).trim();
      if (candidate === "origin/HEAD") {
        return resolved || candidate;
      }
      await runGit(["rev-parse", "--verify", candidate], repoRoot);
      return candidate;
    } catch {
      // try next
    }
  }

  throw new GitError(
    "Could not find a default base branch (origin/HEAD, main, or master). Pass --base <ref>.",
  );
}

async function collectUntrackedDiffs(repoRoot: string): Promise<string> {
  const listed = await runGit(["ls-files", "--others", "--exclude-standard", "-z"], repoRoot);
  const files = listed.split("\0").filter(Boolean);
  if (files.length === 0) return "";

  const chunks: string[] = [];
  for (const file of files) {
    const patch = await runGit(
      ["diff", "--no-color", "--no-index", "--", nullDevice(), file],
      repoRoot,
      { allowExitCodes: [1] },
    );
    if (patch.trim())
      chunks.push(patch.replace(/^diff --git a\/.*$/m, `diff --git a/${file} b/${file}`));
  }
  return chunks.join("");
}

export async function buildLocalDiff(options: LocalDiffOptions): Promise<LocalDiffResult> {
  let repoRoot: string;
  try {
    repoRoot = (await runGit(["rev-parse", "--show-toplevel"], options.cwd)).trim();
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError("Not a git repository. Run this from a repo, or pass a path to one.");
  }

  const baseRef = await resolveBase(repoRoot, options.base);
  const mergeBase = (await runGit(["merge-base", "HEAD", baseRef], repoRoot)).trim();
  const headRef = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot)).trim() || "HEAD";

  const diffArgs = ["diff", "--no-color", "--find-renames"];
  if (options.staged) diffArgs.push("--cached");
  diffArgs.push(mergeBase);

  let raw = await runGit(diffArgs, repoRoot);
  if (options.includeUntracked !== false && !options.staged) {
    raw += await collectUntrackedDiffs(repoRoot);
  }

  const log = (await runGit(["log", "--format=%s%n%n%b", `${mergeBase}..HEAD`], repoRoot)).trim();
  const dirty = (await runGit(["status", "--porcelain"], repoRoot)).trim();
  const descriptionParts = [log, dirty ? "Working tree has uncommitted changes." : ""].filter(
    Boolean,
  );

  const context: ReviewContext = {
    source: "local",
    title: headRef === "HEAD" ? "working tree" : headRef,
    description: descriptionParts.join("\n\n"),
    baseRef,
    headRef,
  };

  const diff = parseDiff(raw);
  const fingerprint = createHash("sha256").update(raw).digest("hex").slice(0, 12);
  const sessionKey = `${path.basename(repoRoot)}:${baseRef}:${headRef}:${fingerprint}`;

  return {
    repoRoot,
    context,
    diff,
    raw,
    sessionKey,
    empty: diff.files.length === 0,
  };
}
