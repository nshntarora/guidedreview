/**
 * Build deep links into GitHub's PR "Files changed" tab for a single path.
 *
 * GitHub anchors each file with `#diff-{sha256Hex(path)}` where the hash is
 * the lowercase hex SHA-256 of the UTF-8 file path (community-documented;
 * matches the fragment GitHub puts in the address bar when you open a file).
 */

interface PRFileDiffIdentity {
  owner: string;
  repo: string;
  number: number;
}

/**
 * URL that opens the PR Files tab scrolled to `filePath`.
 * Use the file's current path (new path after renames) — that is what GitHub hashes.
 */
export async function buildPRFileDiffUrl(
  pr: PRFileDiffIdentity,
  filePath: string,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(filePath));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}/files#diff-${hex}`;
}
