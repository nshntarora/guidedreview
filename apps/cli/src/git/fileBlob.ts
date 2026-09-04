import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { imageMimeType, isImagePath } from "@guided-review/core";
import type { DiffFile } from "@guided-review/core";
import { GitError, runGitBuffer } from "./run";
import type { DiffScopeId, LocalReviewSnapshot } from "./localDiff";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Which side of a file change to load for an image preview. */
export const FILE_PREVIEW_SIDES = ["old", "new"] as const;
export type FilePreviewSide = (typeof FILE_PREVIEW_SIDES)[number];

export function isFilePreviewSide(value: string): value is FilePreviewSide {
  return (FILE_PREVIEW_SIDES as readonly string[]).includes(value);
}

/**
 * Pull the commit SHA out of a `commit:<sha>` scope id.
 * Other scopes (`branch`, `unstaged`, …) are not commit-pinned, so return null.
 */
function commitShaFromScope(id: DiffScopeId): string | null {
  return id.startsWith("commit:") ? id.slice("commit:".length) : null;
}

/**
 * Resolve `filePath` under `repoRoot` and reject path-traversal / absolute /
 * NUL-laden inputs. Callers must not read arbitrary paths off the API.
 */
function resolveWorktreePath(repoRoot: string, filePath: string): string | null {
  if (!filePath || filePath.startsWith("/") || filePath.includes("\0")) return null;
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(repoRoot, filePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

/**
 * `git show <spec>` → bytes, or null when the object is missing.
 * Non-git failures still propagate so callers can surface them.
 */
async function gitShow(repoRoot: string, spec: string): Promise<Buffer | null> {
  try {
    return await runGitBuffer(["show", spec], repoRoot);
  } catch (error) {
    if (error instanceof GitError) return null;
    throw error;
  }
}

/**
 * Read a file from the live worktree (unstaged / uncommitted new side).
 * Caps at MAX_IMAGE_BYTES so a huge binary can't blow the preview endpoint.
 */
async function readWorktree(repoRoot: string, filePath: string): Promise<Buffer | null> {
  const resolved = resolveWorktreePath(repoRoot, filePath);
  if (!resolved) return null;
  try {
    const info = await stat(resolved);
    if (!info.isFile()) return null;
    if (info.size > MAX_IMAGE_BYTES) return null;
    return await readFile(resolved);
  } catch {
    return null;
  }
}

/**
 * Old/new blob for an image in the current review snapshot.
 * Only files present in the parsed diff are readable.
 */
export async function readReviewImage(
  snapshot: LocalReviewSnapshot,
  filePath: string,
  side: FilePreviewSide,
): Promise<{ bytes: Buffer; mime: string } | null> {
  const file = snapshot.diff.files.find((entry) => entry.path === filePath);
  if (!file || !isImagePath(file.path)) return null;

  const bytes = side === "old" ? await readOld(snapshot, file) : await readNew(snapshot, file);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;

  const mime = imageMimeType(file.path);
  if (!mime) return null;
  return { bytes, mime };
}

/**
 * Pre-image for `file` under the snapshot's selected scope.
 * Added files have no old blob; renames read via `previousPath`.
 */
async function readOld(snapshot: LocalReviewSnapshot, file: DiffFile): Promise<Buffer | null> {
  if (file.status === "added") return null;
  const blobPath = file.previousPath ?? file.path;
  const { repo, selectedScope } = snapshot;
  const sha = commitShaFromScope(selectedScope);
  if (sha) return gitShow(repo.repoRoot, `${sha}^:${blobPath}`);
  if (selectedScope === "branch") return gitShow(repo.repoRoot, `${repo.mergeBase}:${blobPath}`);
  if (selectedScope === "unstaged") return gitShow(repo.repoRoot, `:${blobPath}`);
  return gitShow(repo.repoRoot, `HEAD:${blobPath}`);
}

/**
 * Post-image for `file` under the snapshot's selected scope.
 * Removed files have no new blob; unstaged/uncommitted may read the worktree.
 */
async function readNew(snapshot: LocalReviewSnapshot, file: DiffFile): Promise<Buffer | null> {
  if (file.status === "removed") return null;
  const blobPath = file.path;
  const { repo, selectedScope } = snapshot;
  const sha = commitShaFromScope(selectedScope);
  if (sha) return gitShow(repo.repoRoot, `${sha}:${blobPath}`);
  if (selectedScope === "branch") return gitShow(repo.repoRoot, `HEAD:${blobPath}`);
  if (selectedScope === "unstaged") return readWorktree(repo.repoRoot, blobPath);
  if (repo.staged) return gitShow(repo.repoRoot, `:${blobPath}`);
  return readWorktree(repo.repoRoot, blobPath);
}
