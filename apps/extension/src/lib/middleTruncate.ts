/**
 * Truncate a string with an ellipsis in the middle so both the start and end
 * remain visible. Prefer this for file paths over end-ellipsis (CSS
 * `text-overflow: ellipsis`), which hides the basename.
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
