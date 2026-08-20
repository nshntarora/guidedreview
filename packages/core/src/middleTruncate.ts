/**
 * Truncate a string with an ellipsis in the middle so both the start and end
 * remain visible. Prefer this for file paths over end-ellipsis (CSS
 * `text-overflow: ellipsis`), which hides the basename.
 *
 * Path-aware: when `text` contains `/`, the final segment after the last `/`
 * is always kept intact and truncation is applied only to characters before
 * it. Non-path strings fall back to character-wise middle truncation.
 *
 * `maxLength` is a character budget for the *result* (including the ellipsis).
 * When `text` already fits, it is returned unchanged.
 */
export function middleTruncate(text: string, maxLength: number, ellipsis = "…"): string {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;

  if (maxLength <= ellipsis.length) {
    return ellipsis.slice(0, maxLength);
  }

  const lastSlash = text.lastIndexOf("/");
  if (lastSlash === -1) {
    return middleTruncateChars(text, maxLength, ellipsis);
  }

  const basename = text.slice(lastSlash + 1);
  // "/" + basename must stay; truncate only the directory prefix.
  const reserved = 1 + basename.length;
  const prefixBudget = maxLength - reserved;

  if (prefixBudget <= 0) {
    // No room for any directory prefix — keep as much of the basename as fits,
    // with a leading ellipsis when we have to drop the path.
    if (basename.length <= maxLength) {
      // Prefer "…basename" when it fits so the path loss is obvious.
      if (ellipsis.length + basename.length <= maxLength) {
        return ellipsis + basename;
      }
      return basename;
    }
    // Basename alone exceeds the budget: end-bias so the extension stays.
    return middleTruncateChars(basename, maxLength, ellipsis);
  }

  const prefix = text.slice(0, lastSlash);
  return middleTruncateChars(prefix, prefixBudget, ellipsis) + "/" + basename;
}

/** Character-wise middle truncation (no path awareness). */
function middleTruncateChars(text: string, maxLength: number, ellipsis: string): string {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;

  if (maxLength <= ellipsis.length) {
    return ellipsis.slice(0, maxLength);
  }

  const budget = maxLength - ellipsis.length;
  // Slight end bias when budget is odd so basenames keep one extra char.
  const endLen = Math.ceil(budget / 2);
  const startLen = budget - endLen;

  if (startLen <= 0) {
    return ellipsis + text.slice(-endLen);
  }
  if (endLen <= 0) {
    return text.slice(0, startLen) + ellipsis;
  }

  return text.slice(0, startLen) + ellipsis + text.slice(-endLen);
}
