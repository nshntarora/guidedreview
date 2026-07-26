/**
 * Build deep links into GitHub's PR "Files changed" tab for a single path.
 *
 * GitHub anchors each file with `#diff-{sha256Hex(path)}` where the hash is
 * the lowercase hex SHA-256 of the UTF-8 file path (community-documented;
 * matches the fragment GitHub puts in the address bar when you open a file).
 */

export interface PRFileDiffIdentity {
  owner: string;
  repo: string;
  number: number;
}

/** SHA-256 hex digest of UTF-8 `text` (GitHub’s `#diff-` fragment body). */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * URL that opens the PR Files tab scrolled to `filePath`.
 * Use the file's current path (new path after renames) — that is what GitHub hashes.
 */
export async function buildPRFileDiffUrl(
  pr: PRFileDiffIdentity,
  filePath: string,
): Promise<string> {
  const hex = await sha256Hex(filePath);
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}/files#diff-${hex}`;
}
