import { createHash } from "node:crypto";
import path from "node:path";
import { parseDiff, type ParsedDiff, type ReviewContext } from "@guided-review/core";
import { GitError, runGit } from "./run";

export interface LocalDiffOptions {
  cwd: string;
  base?: string;
  staged?: boolean;
  includeUntracked?: boolean;
  /** When set, use this scope instead of the default non-empty pick. */
  scope?: DiffScopeId;
}

export type DiffScopeId = "branch" | "uncommitted" | "unstaged" | `commit:${string}`;

export interface DiffStat {
  files: number;
  additions: number;
  deletions: number;
}

export interface LocalCommit {
  sha: string;
  shortSha: string;
  subject: string;
  body: string;
  author: string;
  authoredAt: string;
  stat?: DiffStat;
}

export interface DiffScopeOption {
  id: DiffScopeId;
  label: string;
  description: string;
  meta: string;
  /** Extra shown ahead of file/+− counts (commit count, short SHA). */
  metaPrefix?: string;
  stat: DiffStat;
  empty: boolean;
}

export interface LocalRepoState {
  repoRoot: string;
  baseRef: string;
  headRef: string;
  mergeBase: string;
  includeUntracked: boolean;
  staged: boolean;
}

export interface LocalReviewSnapshot {
  repo: LocalRepoState;
  commits: LocalCommit[];
  scopes: DiffScopeOption[];
  selectedScope: DiffScopeId;
  context: ReviewContext;
  diff: ParsedDiff;
  raw: string;
  sessionKey: string;
  empty: boolean;
}

const COMMIT_SCOPE_PREFIX = "commit:";
/** Individual commit scopes and the Change summary list. Keep in sync with overlay/localReview.ts. */
const MAX_RECENT_COMMITS = 5;

export function isDiffScopeId(value: string): value is DiffScopeId {
  return (
    value === "branch" ||
    value === "uncommitted" ||
    value === "unstaged" ||
    (value.startsWith(COMMIT_SCOPE_PREFIX) && value.length > COMMIT_SCOPE_PREFIX.length)
  );
}

function commitShaFromScope(id: DiffScopeId): string | null {
  return id.startsWith(COMMIT_SCOPE_PREFIX) ? id.slice(COMMIT_SCOPE_PREFIX.length) : null;
}

export function reviewHasChanges(snapshot: LocalReviewSnapshot): boolean {
  return snapshot.scopes.some((scope) => !scope.empty);
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

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function listUntracked(repoRoot: string): Promise<string[]> {
  const listed = await runGit(["ls-files", "--others", "--exclude-standard", "-z"], repoRoot);
  return listed.split("\0").filter(Boolean);
}

async function collectUntrackedDiffs(repoRoot: string, files: string[]): Promise<string> {
  if (files.length === 0) return "";
  const chunks = await mapLimit(files, 8, async (file) => {
    const patch = await runGit(
      ["diff", "--no-color", "--no-index", "--", nullDevice(), file],
      repoRoot,
      { allowExitCodes: [1] },
    );
    if (!patch.trim()) return "";
    return patch.replace(/^diff --git a\/.*$/m, `diff --git a/${file} b/${file}`);
  });
  return chunks.filter(Boolean).join("");
}

export function parseShortstat(raw: string): DiffStat {
  const files = /(\d+) files? changed/.exec(raw);
  const additions = /(\d+) insertions?/.exec(raw);
  const deletions = /(\d+) deletions?/.exec(raw);
  return {
    files: files ? Number(files[1]) : 0,
    additions: additions ? Number(additions[1]) : 0,
    deletions: deletions ? Number(deletions[1]) : 0,
  };
}

export function parseCommitLog(raw: string): LocalCommit[] {
  if (!raw.trim()) return [];
  const records = raw.split("\x1e").filter((record) => record.trim().length > 0);
  const commits: LocalCommit[] = [];
  for (const record of records) {
    const [sha, subject, body, author, authoredAt] = record.replace(/^\n/, "").split("\x00");
    if (!sha?.trim()) continue;
    commits.push({
      sha: sha.trim(),
      shortSha: sha.trim().slice(0, 7),
      subject: subject ?? "",
      body: (body ?? "").trim(),
      author: author ?? "",
      authoredAt: (authoredAt ?? "").trim(),
    });
  }
  return commits;
}

export function formatScopeMeta(stat: DiffStat, extra?: string): string {
  if (stat.files === 0) return extra ? `${extra} · No changes` : "No changes";
  const fileLabel = `${stat.files} file${stat.files === 1 ? "" : "s"}`;
  const counts = `+${stat.additions} −${stat.deletions}`;
  return extra ? `${extra} · ${fileLabel} · ${counts}` : `${fileLabel} · ${counts}`;
}

function dateLabel(iso: string): string {
  const day = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : iso;
}

function formatCommitsForPrompt(commits: LocalCommit[], selected: DiffScopeId): string {
  const parts: string[] = [];
  if (commits.length > 0) {
    parts.push(
      commits
        .map((commit) => {
          const head = `${commit.subject} (${commit.shortSha})`;
          const meta = [commit.author, dateLabel(commit.authoredAt)].filter(Boolean).join(", ");
          return [head, meta, commit.body].filter(Boolean).join("\n");
        })
        .join("\n\n"),
    );
  }
  if (selected === "uncommitted") {
    parts.push("Working tree has uncommitted changes.");
  } else if (selected === "unstaged") {
    parts.push("Reviewing unstaged changes only.");
  }
  return parts.join("\n\n");
}

async function shortstat(repoRoot: string, args: string[]): Promise<DiffStat> {
  const raw = await runGit(["diff", "--shortstat", ...args], repoRoot);
  return parseShortstat(raw);
}

async function commitShortstat(repoRoot: string, sha: string): Promise<DiffStat> {
  try {
    const raw = await runGit(["diff", "--shortstat", `${sha}^`, sha], repoRoot);
    return parseShortstat(raw);
  } catch {
    const raw = await runGit(["show", "--shortstat", "--pretty=format:", sha], repoRoot);
    return parseShortstat(raw);
  }
}

async function commitPatch(repoRoot: string, sha: string): Promise<string> {
  try {
    return await runGit(["diff", "--no-color", "--find-renames", `${sha}^`, sha], repoRoot);
  } catch {
    return await runGit(
      ["show", "--no-color", "--find-renames", "--pretty=format:", sha],
      repoRoot,
    );
  }
}

/** Shared git args so the patch and the shortstat for a scope cannot drift. */
function gitForScope(
  repo: LocalRepoState,
  scope: DiffScopeId,
): { sha: string } | { range: string[]; includeUntracked: boolean } {
  const sha = commitShaFromScope(scope);
  if (sha) return { sha };
  if (scope === "branch") return { range: [repo.mergeBase, "HEAD"], includeUntracked: false };
  if (scope === "unstaged") return { range: [], includeUntracked: false };
  if (repo.staged) return { range: ["--cached", "HEAD"], includeUntracked: false };
  return { range: ["HEAD"], includeUntracked: repo.includeUntracked };
}

async function rawDiffForScope(
  repo: LocalRepoState,
  scope: DiffScopeId,
  untracked: string[],
): Promise<string> {
  const spec = gitForScope(repo, scope);
  if ("sha" in spec) return commitPatch(repo.repoRoot, spec.sha);
  let raw = await runGit(["diff", "--no-color", "--find-renames", ...spec.range], repo.repoRoot);
  if (spec.includeUntracked) raw += await collectUntrackedDiffs(repo.repoRoot, untracked);
  return raw;
}

async function statForScope(
  repo: LocalRepoState,
  scope: DiffScopeId,
  untrackedCount: number,
): Promise<DiffStat> {
  const spec = gitForScope(repo, scope);
  if ("sha" in spec) return commitShortstat(repo.repoRoot, spec.sha);
  const stat = await shortstat(repo.repoRoot, spec.range);
  if (spec.includeUntracked && untrackedCount > 0) {
    return { ...stat, files: stat.files + untrackedCount };
  }
  return stat;
}

export function pickDefaultScope(scopes: DiffScopeOption[], staged: boolean): DiffScopeId {
  if (staged) {
    const uncommitted = scopes.find((scope) => scope.id === "uncommitted");
    if (uncommitted && !uncommitted.empty) return "uncommitted";
  }
  for (const id of ["branch", "uncommitted", "unstaged"] as const) {
    const match = scopes.find((scope) => scope.id === id);
    if (match && !match.empty) return match.id;
  }
  const commit = scopes.find((scope) => scope.id.startsWith(COMMIT_SCOPE_PREFIX) && !scope.empty);
  return commit?.id ?? "branch";
}

async function countCommitsAhead(repo: LocalRepoState): Promise<number> {
  const raw = await runGit(["rev-list", "--count", `${repo.mergeBase}..HEAD`], repo.repoRoot);
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : 0;
}

async function listCommits(repo: LocalRepoState): Promise<LocalCommit[]> {
  const raw = await runGit(
    [
      "log",
      "-n",
      String(MAX_RECENT_COMMITS),
      "--format=%H%x00%s%x00%b%x00%an%x00%aI%x1e",
      `${repo.mergeBase}..HEAD`,
    ],
    repo.repoRoot,
  );
  return parseCommitLog(raw);
}

async function buildScopes(
  repo: LocalRepoState,
  commits: LocalCommit[],
  untracked: string[],
): Promise<DiffScopeOption[]> {
  const untrackedCount = untracked.length;
  const headLabel = repo.headRef === "HEAD" ? "this HEAD" : repo.headRef;
  const recent = commits.slice(0, MAX_RECENT_COMMITS);

  const [workingTreeStats, commitCount, commitStats] = await Promise.all([
    Promise.all([
      statForScope(repo, "branch", untrackedCount),
      statForScope(repo, "uncommitted", untrackedCount),
      statForScope(repo, "unstaged", untrackedCount),
    ]),
    countCommitsAhead(repo),
    Promise.all(
      recent.map((commit) =>
        statForScope(repo, `${COMMIT_SCOPE_PREFIX}${commit.sha}`, untrackedCount),
      ),
    ),
  ]);
  const [branchStat, uncommittedStat, unstagedStat] = workingTreeStats;

  const commitExtra = `${commitCount} commit${commitCount === 1 ? "" : "s"}`;

  const scopes: DiffScopeOption[] = [
    {
      id: "branch",
      label: `${headLabel} vs ${repo.baseRef}`,
      description: `Committed work on this branch since it diverged from ${repo.baseRef}.`,
      meta: formatScopeMeta(branchStat, commitExtra),
      metaPrefix: commitExtra,
      stat: branchStat,
      empty: branchStat.files === 0,
    },
    {
      id: "uncommitted",
      label: repo.staged ? "Staged changes" : "Uncommitted changes",
      description: repo.staged
        ? "Index versus HEAD. Unstaged work stays out."
        : "Staged and unstaged work versus HEAD.",
      meta: formatScopeMeta(uncommittedStat),
      stat: uncommittedStat,
      empty: uncommittedStat.files === 0,
    },
    {
      id: "unstaged",
      label: "Unstaged changes",
      description: "Unstaged edits only. Staged files stay out.",
      meta: formatScopeMeta(unstagedStat),
      stat: unstagedStat,
      empty: unstagedStat.files === 0,
    },
  ];

  recent.forEach((commit, index) => {
    const stat = commitStats[index]!;
    commit.stat = stat;
    const when = dateLabel(commit.authoredAt);
    scopes.push({
      id: `${COMMIT_SCOPE_PREFIX}${commit.sha}`,
      label: commit.subject,
      description: [commit.author, when].filter(Boolean).join(" · "),
      meta: formatScopeMeta(stat, commit.shortSha),
      metaPrefix: commit.shortSha,
      stat,
      empty: stat.files === 0,
    });
  });

  return scopes;
}

export function hashDiff(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function currentDiffHash(repo: LocalRepoState, scope: DiffScopeId): Promise<string> {
  const untracked = repo.includeUntracked && !repo.staged ? await listUntracked(repo.repoRoot) : [];
  return hashDiff(await rawDiffForScope(repo, scope, untracked));
}

function sessionKeyFor(repo: LocalRepoState, scope: DiffScopeId, raw: string): string {
  return `${path.basename(repo.repoRoot)}:${repo.baseRef}:${repo.headRef}:${scope}:${hashDiff(raw).slice(0, 12)}`;
}

function contextFor(
  repo: LocalRepoState,
  commits: LocalCommit[],
  selected: DiffScopeId,
): ReviewContext {
  return {
    source: "local",
    title: repo.headRef === "HEAD" ? "working tree" : repo.headRef,
    description: formatCommitsForPrompt(commits, selected),
    baseRef: repo.baseRef,
    headRef: repo.headRef,
  };
}

async function inspectLocalRepo(options: LocalDiffOptions): Promise<LocalRepoState> {
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

  return {
    repoRoot,
    baseRef,
    headRef,
    mergeBase,
    includeUntracked: options.includeUntracked !== false,
    staged: Boolean(options.staged),
  };
}

async function snapshotFrom(
  repo: LocalRepoState,
  requested?: DiffScopeId,
): Promise<LocalReviewSnapshot> {
  const untracked = repo.includeUntracked && !repo.staged ? await listUntracked(repo.repoRoot) : [];
  const commits = await listCommits(repo);
  const scopes = await buildScopes(repo, commits, untracked);
  const selected = requested ?? pickDefaultScope(scopes, repo.staged);
  if (requested && !scopes.some((option) => option.id === requested)) {
    throw new GitError(`Unknown diff scope "${requested}".`);
  }
  const raw = await rawDiffForScope(repo, selected, untracked);
  const diff = parseDiff(raw);
  return {
    repo,
    commits,
    scopes,
    selectedScope: selected,
    context: contextFor(repo, commits, selected),
    diff,
    raw,
    sessionKey: sessionKeyFor(repo, selected, raw),
    empty: diff.files.length === 0,
  };
}

export function rebuildLocalReview(
  repo: LocalRepoState,
  scope: DiffScopeId,
): Promise<LocalReviewSnapshot> {
  return snapshotFrom(repo, scope);
}

export async function buildLocalReview(options: LocalDiffOptions): Promise<LocalReviewSnapshot> {
  return snapshotFrom(await inspectLocalRepo(options), options.scope);
}
