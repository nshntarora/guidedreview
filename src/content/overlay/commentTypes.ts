/**
 * Local draft review-comment types for the overlay.
 * Shared submit-API shapes (`ReviewEvent`, `ReviewCommentInput`) live in `src/lib/types.ts`.
 */

import type { ReviewEvent } from "../../lib/types";

export type { ReviewEvent };
export type DiffSide = "LEFT" | "RIGHT";

/** One keyboard-selectable line anchor in the current unit's code pane. */
export interface SelectableLine {
  /** Stable id: `${hunkId}:${lineIndex}:${side}` */
  id: string;
  filePath: string;
  hunkId: string;
  /** Index into `DiffHunk.lines`. */
  lineIndex: number;
  side: DiffSide;
  oldLine?: number;
  newLine?: number;
  type: "add" | "del" | "context";
}

/** Inclusive range in the flat selectable-line list (anchor + cursor). */
export interface LineSelection {
  /** Flat-list index where shift-select started. */
  anchorIndex: number;
  /** Flat-list index of the current cursor. */
  focusIndex: number;
}

/** A locally saved draft comment (not yet posted to GitHub). */
export interface DraftComment {
  id: string;
  filePath: string;
  side: DiffSide;
  /** Inclusive display line numbers on `side` (file coordinates). */
  startLine: number;
  endLine: number;
  /** SelectableLine ids covering the range (for highlight + placement). */
  lineIds: string[];
  body: string;
  /** Review unit id active when the comment was saved, if any. */
  unitId?: string;
}

export type UiMode = "navigate" | "comment";

/** Summary body + event chosen in the Submit Review modal. */
export interface ReviewSubmission {
  body: string;
  event: ReviewEvent;
}

/** File-side line number used for labels and future API mapping. */
export function displayLineNumber(line: SelectableLine): number | undefined {
  return line.side === "LEFT" ? line.oldLine : line.newLine;
}

export function selectionBounds(sel: LineSelection): { start: number; end: number } {
  return {
    start: Math.min(sel.anchorIndex, sel.focusIndex),
    end: Math.max(sel.anchorIndex, sel.focusIndex),
  };
}

/**
 * Lines included in the current selection: same file + side as the anchor,
 * with flat indices between anchor and focus (inclusive).
 */
export function linesInSelection(
  lines: SelectableLine[],
  sel: LineSelection,
): SelectableLine[] {
  if (lines.length === 0) return [];
  const anchor = lines[sel.anchorIndex];
  if (!anchor) return [];
  const { start, end } = selectionBounds(sel);
  return lines.slice(start, end + 1).filter(
    (l) => l.filePath === anchor.filePath && l.side === anchor.side,
  );
}

export function formatLineRangeLabel(
  filePath: string,
  startLine: number,
  endLine: number,
): string {
  if (startLine === endLine) return `${filePath}:L${startLine}`;
  return `${filePath}:L${startLine}–L${endLine}`;
}
