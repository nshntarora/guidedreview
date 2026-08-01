import type { DiffLine } from "../../../lib/types";
import type { DiffSearchDoc, DiffSearchResult } from "./types";

/** One row in a line-result preview (match ± context). */
export interface PreviewLine {
  lineIndex: number;
  content: string;
  lineType: DiffLine["type"];
  /** True for the hit line itself (not surrounding context). */
  isMatch: boolean;
}

/**
 * Collect up to `context` lines above and below a line hit within the same hunk.
 * Context is clamped to the hunk boundary.
 */
export function buildLinePreview(
  docs: DiffSearchDoc[],
  result: Extract<DiffSearchResult, { kind: "line" }>,
  context = 2,
): PreviewLine[] {
  const hunkLines = docs
    .filter(
      (d): d is Extract<DiffSearchDoc, { kind: "line" }> =>
        d.kind === "line" && d.hunkId === result.hunkId,
    )
    .sort((a, b) => a.lineIndex - b.lineIndex);

  if (hunkLines.length === 0) {
    return [
      {
        lineIndex: result.lineIndex,
        content: result.content,
        lineType: result.lineType,
        isMatch: true,
      },
    ];
  }

  const min = Math.max(0, result.lineIndex - context);
  const max = result.lineIndex + context;

  return hunkLines
    .filter((l) => l.lineIndex >= min && l.lineIndex <= max)
    .map((l) => ({
      lineIndex: l.lineIndex,
      content: l.content,
      lineType: l.lineType,
      isMatch: l.lineIndex === result.lineIndex,
    }));
}
