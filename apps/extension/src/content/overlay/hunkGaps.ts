import type { DiffHunk } from "@extension/lib/types";

/** Last file line number of a hunk (prefer new side). */
export function hunkEndLine(hunk: DiffHunk): number | undefined {
  if (hunk.newLines > 0) return hunk.newStart + hunk.newLines - 1;
  if (hunk.oldLines > 0) return hunk.oldStart + hunk.oldLines - 1;
  return undefined;
}

/**
 * True when the next hunk starts after the previous ends with at least one
 * omitted line on the new side (preferred) or old side.
 */
export function hasLineGapBetween(prev: DiffHunk, next: DiffHunk): boolean {
  if (prev.newLines > 0 && next.newLines > 0) {
    return next.newStart > prev.newStart + prev.newLines;
  }
  if (prev.oldLines > 0 && next.oldLines > 0) {
    return next.oldStart > prev.oldStart + prev.oldLines;
  }
  return false;
}

export type HunkSequenceItem =
  { kind: "hunk"; hunk: DiffHunk } | { kind: "gap"; afterLine: number; key: string };

/**
 * Interleave displayed hunks with gap markers for rendering.
 * Only inserts a gap between consecutive items in the displayed list.
 */
export function withHunkGaps(hunks: DiffHunk[]): HunkSequenceItem[] {
  const out: HunkSequenceItem[] = [];
  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    if (i > 0) {
      const prev = hunks[i - 1];
      if (hasLineGapBetween(prev, hunk)) {
        const afterLine = hunkEndLine(prev);
        if (afterLine != null) {
          out.push({
            kind: "gap",
            afterLine,
            key: `gap-${prev.id}-${hunk.id}`,
          });
        }
      }
    }
    out.push({ kind: "hunk", hunk });
  }
  return out;
}
