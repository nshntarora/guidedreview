/**
 * Shared hunk rendering: styles, syntax highlight, and per-line draft extras.
 * Used by UnifiedHunk and SplitHunk.
 */

import { cn } from "@guided-review/ui";
import { confirm } from "../../../../lib/confirmation";
import { highlightToLines } from "../../../../lib/highlight";
import type { DiffHunk } from "../../../../lib/types";
import type { DraftComment } from "../../commentTypes";
import { useReviewStore } from "../../store";
import { CommentComposer } from "../CommentComposer";
import { DraftCommentCard } from "../DraftCommentCard";

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

/**
 * Highlight a hunk's lines against GitHub's syntax palette.
 *
 * Reconstructs old (context + del) and new (context + add) text, highlights each
 * as a whole so multi-line constructs tokenize correctly, then maps fragments
 * back onto hunk lines.
 */
export function highlightHunkLines(
  hunk: DiffHunk,
  language: string | undefined,
): (string | null)[] {
  if (!language) return hunk.lines.map(() => null);

  const oldText = hunk.lines
    .filter((l) => l.type !== "add")
    .map((l) => l.content)
    .join("\n");
  const newText = hunk.lines
    .filter((l) => l.type !== "del")
    .map((l) => l.content)
    .join("\n");

  const oldHighlighted = highlightToLines(oldText, language);
  const newHighlighted = highlightToLines(newText, language);

  let oldCursor = 0;
  let newCursor = 0;
  return hunk.lines.map((line) => {
    if (line.type === "del") return oldHighlighted[oldCursor++] ?? null;
    if (line.type === "add") return newHighlighted[newCursor++] ?? null;
    const fragment = newHighlighted[newCursor] ?? oldHighlighted[oldCursor] ?? null;
    oldCursor++;
    newCursor++;
    return fragment;
  });
}

export function CodeContent({
  content,
  highlighted,
}: {
  content: string;
  highlighted: string | null;
}) {
  if (highlighted != null) {
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }
  return <span>{content}</span>;
}

interface LineExtrasProps {
  lineId: string;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: ComposerRange;
  unitId?: string;
}

export function LineExtras({
  lineId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
}: LineExtrasProps) {
  const saveDraftComment = useReviewStore((s) => s.saveDraftComment);
  const closeComposer = useReviewStore((s) => s.closeComposer);
  const removeDraftComment = useReviewStore((s) => s.removeDraftComment);
  const updateDraftComment = useReviewStore((s) => s.updateDraftComment);
  const drafts = draftsByEndLineId.get(lineId) ?? [];
  const showComposer = composerPlacementId === lineId && composerRange;

  if (!showComposer && drafts.length === 0) return null;

  function requestRemoveDraft(id: string): void {
    confirm({
      title: "Remove Comment?",
      body: "This comment will be removed. You can comment on these lines again later.",
      variant: "destructive",
      okButtonText: "Remove",
      cancelButtonText: "Cancel",
      okButtonHandler: () => {
        removeDraftComment(id);
      },
    });
  }

  return (
    <div className="font-sans" data-testid={`line-extras-${lineId}`}>
      {drafts.map((d) => (
        <DraftCommentCard
          key={d.id}
          comment={d}
          onRemove={requestRemoveDraft}
          onUpdate={updateDraftComment}
        />
      ))}
      {showComposer && (
        <CommentComposer
          filePath={composerRange.filePath}
          startLine={composerRange.startLine}
          endLine={composerRange.endLine}
          onSave={(body) => saveDraftComment(body, unitId)}
          onCancel={closeComposer}
        />
      )}
    </div>
  );
}
