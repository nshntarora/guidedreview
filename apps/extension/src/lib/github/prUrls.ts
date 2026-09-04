/**
 * GitHub PR path and URL helpers: conversation/files tabs, ignored surfaces,
 * and deep links into a single file on the Files changed tab.
 */

/** Conversation (default) tab URL for a PR. */
export function prConversationUrl(pr: { owner: string; repo: string; number: number }): string {
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`;
}

/**
 * True when `pathname` is the PR Files changed / Changes tab
 * (`.../pull/N/files` or `.../pull/N/changes`, optional trailing segments).
 * GitHub's classic UI uses `/files`; the newer PR UI uses `/changes`.
 */
export function isPrFilesChangedPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return /\/pull\/\d+\/(?:files|changes)(?:\/|$)/.test(normalized);
}

/**
 * Path segments under `/pull/:n/<segment>` where we never inject Start Guided
 * Review (and should not start a review from other entry points).
 */
const IGNORED_PR_PATH_SEGMENTS = new Set(["conflicts"]);

/**
 * True when `pathname` is a PR sub-path we should not surface the start button
 * on (e.g. `…/pull/42/conflicts`). Optional trailing segments are ignored.
 */
export function isIgnoredPrPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const match = /\/pull\/\d+\/([^/]+)/.exec(normalized);
  if (!match) return false;
  return IGNORED_PR_PATH_SEGMENTS.has(match[1]);
}

/**
 * Navigate to the conversation tab if the user is on another PR tab.
 * No-op when already on conversation. Uses a full navigation so GitHub's
 * SPA shell reliably shows the default PR surface after overlay exit.
 */
export function navigateToPrConversation(pr: {
  owner: string;
  repo: string;
  number: number;
}): void {
  // Already on the conversation tab (not /files, /commits, /checks, …).
  const normalized = window.location.pathname.replace(/\/+$/, "") || "/";
  if (normalized === `/${pr.owner}/${pr.repo}/pull/${pr.number}`) return;
  window.location.assign(prConversationUrl(pr));
}

/**
 * URL that opens the PR Files tab scrolled to `filePath`.
 * GitHub anchors each file with `#diff-{sha256Hex(path)}` (lowercase hex of
 * the UTF-8 path). Use the file's current path (new path after renames).
 * When `line` is set, append `R{line}` so GitHub highlights that new-side line.
 */
export async function buildPRFileDiffUrl(
  pr: { owner: string; repo: string; number: number },
  filePath: string,
  line?: number,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(filePath));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const fragment = line != null && line > 0 ? `diff-${hex}R${line}` : `diff-${hex}`;
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}/files#${fragment}`;
}

/**
 * Deep link to a file at a specific line. Prefers the head-branch blob view
 * (full file, including lines omitted from the patch). Falls back to the PR
 * Files tab when `headRef` is missing.
 */
export async function buildFileLineUrl(
  pr: { owner: string; repo: string; number: number },
  opts: { filePath: string; line: number; headRef?: string },
): Promise<string> {
  const headRef = opts.headRef?.trim();
  if (headRef) {
    // Encode path segments so spaces/special chars survive; keep slashes.
    const encodedPath = opts.filePath
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    return `https://github.com/${pr.owner}/${pr.repo}/blob/${encodeURIComponent(headRef)}/${encodedPath}#L${opts.line}`;
  }
  return buildPRFileDiffUrl(pr, opts.filePath, opts.line);
}

/** Encode a git path or ref keeping `/` as a separator. */
function encodeGitHubSegments(value: string): string {
  return value
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/**
 * `github.com/.../raw/{ref}/{path}` follows (with the user's cookies) to
 * raw.githubusercontent.com, including a token query on private repos.
 */
export function buildRawFileUrl(
  pr: { owner: string; repo: string },
  ref: string,
  filePath: string,
): string {
  return `https://github.com/${pr.owner}/${pr.repo}/raw/${encodeGitHubSegments(ref)}/${encodeGitHubSegments(filePath)}`;
}

/** PR head as it exists on the base repo — works for fork PRs, unlike `headRef`. */
export function pullHeadRef(number: number): string {
  return `refs/pull/${number}/head`;
}

const MAX_PATH = 4096;
const MAX_REF = 512;

/** Relative repo path with no `.` / `..` segments. */
export function isSafeGitHubPath(path: string): boolean {
  if (!path || path.length > MAX_PATH) return false;
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) return false;
  return path.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

/** Branch, tag, SHA, or `refs/pull/N/head`. */
export function isSafeGitHubRef(ref: string): boolean {
  if (!ref || ref.length > MAX_REF) return false;
  if (ref.includes("\0") || ref.includes("\\") || ref.includes("..")) return false;
  return /^[A-Za-z0-9._/-]+$/.test(ref);
}
