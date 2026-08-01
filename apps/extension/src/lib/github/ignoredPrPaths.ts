/**
 * Path segments under `/pull/:n/<segment>` where we never inject Start Guided
 * Review (and should not start a review from other entry points).
 *
 * Append more segments here as we find PR surfaces that are not suitable for
 * guided review (e.g. specialized editors).
 */
const IGNORED_PR_PATH_SEGMENTS = ["conflicts"] as const;

const IGNORED_SET = new Set<string>(IGNORED_PR_PATH_SEGMENTS);

/**
 * True when `pathname` is a PR sub-path we should not surface the start button
 * on (e.g. `…/pull/42/conflicts`). Optional trailing segments are ignored.
 */
export function isIgnoredPrPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const match = /\/pull\/\d+\/([^/]+)/.exec(normalized);
  if (!match) return false;
  return IGNORED_SET.has(match[1]);
}
