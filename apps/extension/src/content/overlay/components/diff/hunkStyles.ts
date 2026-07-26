import { cn } from "@guided-review/ui";
import type { DiffHunk } from "../../../../lib/types";
import type { DraftComment } from "../../commentTypes";

/** File + line span the comment composer is currently anchored to. */
export type ComposerRange = {
  filePath: string;
  startLine: number;
  endLine: number;
} | null;

/** Shared per-hunk render props for `UnifiedHunk` and `SplitHunk`. */
export interface HunkViewProps {
  hunk: DiffHunk;
  language: string | undefined;
  selectedIds: Set<string>;
  focusId: string | null;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: ComposerRange;
  unitId?: string;
}

/** Soft-wrap long lines (e.g. SVG paths) like GitHub — no horizontal scroll bleed. */
export const DIFF_LINE_WRAP = "flex min-w-0 whitespace-pre-wrap break-all pr-3";

export function selectionClasses(
  lineId: string | undefined,
  selectedIds: Set<string>,
  focusId: string | null,
): string {
  if (!lineId) return "";
  // Focus keeps the row wash; brand line-number gutter is layered on top.
  if (focusId === lineId) {
    return "bg-primary-muted";
  }
  if (selectedIds.has(lineId)) {
    return "bg-primary-muted/70";
  }
  return "";
}

/**
 * Brand highlight on gutter numbers for the focused line and every line in the
 * current multi-line selection.
 */
export function lineNumberClasses(isHighlighted: boolean): string {
  return cn(
    "w-10 shrink-0 select-none pr-3 text-right",
    isHighlighted ? "bg-primary font-medium text-primary-foreground" : "text-faint",
  );
}

export function lineIdFor(hunkId: string, lineIndex: number, side: "LEFT" | "RIGHT"): string {
  return `${hunkId}:${lineIndex}:${side}`;
}
