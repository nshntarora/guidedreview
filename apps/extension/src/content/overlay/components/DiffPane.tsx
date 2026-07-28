import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@guided-review/ui";

import { languageForPath } from "../../../lib/highlight";
import { displayLineNumber, linesInSelection, type SelectableLine } from "../commentTypes";
import type { SearchScrollTarget } from "../diffSearch";
import { hydrateDiffViewMode, useReviewStore } from "../store";
import type { ResolvedUnitFile } from "../selectors";
import { AddCommentButton, CommentModeChip, DiffViewToggle } from "./diff/DiffToolbar";
import { BinaryElidedEmptyState } from "./diff/BinaryElidedEmptyState";
import { SplitHunk } from "./diff/SplitHunk";
import { UnifiedHunk } from "./diff/UnifiedHunk";
import { useSelectionDerived } from "./diff/useSelectionDerived";

/** How long the search-match flash highlight stays on the target line/file. */
const SEARCH_HIGHLIGHT_MS = 1600;

interface DiffPaneProps {
  files: ResolvedUnitFile[];
  /** Title of the currently active review unit. */
  unitTitle: string;
  /** Review unit id for associating saved drafts. */
  unitId?: string;
  /**
   * Flat selectable-line list for `files` in the active view mode. Owned by
   * Overlay (which also feeds it to the keyboard handler) so entering comment
   * mode from the button and from `c` always operate on the same list.
   */
  selectableForUnit: SelectableLine[];
  /** One-shot scroll/highlight target after picking a diff search result. */
  searchScrollTarget?: SearchScrollTarget | null;
  onSearchScrollTargetConsumed?: () => void;
}

export function DiffPane({
  files,
  unitTitle,
  unitId,
  selectableForUnit,
  searchScrollTarget = null,
  onSearchScrollTargetConsumed,
}: DiffPaneProps) {
  const diffViewMode = useReviewStore((s) => s.diffViewMode);
  const setDiffViewMode = useReviewStore((s) => s.setDiffViewMode);
  const uiMode = useReviewStore((s) => s.uiMode);
  const selectableLines = useReviewStore((s) => s.selectableLines);
  const lineSelection = useReviewStore((s) => s.lineSelection);
  const composerOpen = useReviewStore((s) => s.composerOpen);
  const draftComments = useReviewStore((s) => s.draftComments);
  const enterCommentMode = useReviewStore((s) => s.enterCommentMode);
  const rootRef = useRef<HTMLDivElement>(null);
  const [searchHighlight, setSearchHighlight] = useState<SearchScrollTarget | null>(null);

  useEffect(() => {
    void hydrateDiffViewMode();
  }, []);

  const filePaths = useMemo(() => new Set(files.map((f) => f.file.path)), [files]);

  const { selectedIds, focusId, composerPlacementId, composerRange, draftsByEndLineId } =
    useSelectionDerived(
      uiMode === "comment" ? selectableLines : [],
      uiMode === "comment" ? lineSelection : null,
      composerOpen,
      draftComments,
      filePaths,
    );

  // Scroll the focused line into view when the cursor moves.
  useEffect(() => {
    if (uiMode !== "comment" || !focusId || !rootRef.current) return;
    const el = rootRef.current.querySelector(`[data-line-id="${CSS.escape(focusId)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [uiMode, focusId, lineSelection?.focusIndex]);

  // Jump to a search match: scroll into view, flash highlight, then clear.
  // Double rAF waits for the unit's hunks to paint after goToUnit.
  useEffect(() => {
    if (!searchScrollTarget) return;

    let clearTimer = 0;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = rootRef.current;
        if (!root) {
          onSearchScrollTargetConsumed?.();
          return;
        }

        const target =
          (searchScrollTarget.lineId
            ? root.querySelector<HTMLElement>(
                `[data-line-id="${CSS.escape(searchScrollTarget.lineId)}"]`,
              )
            : null) ??
          root.querySelector<HTMLElement>(
            `[data-file-path="${CSS.escape(searchScrollTarget.filePath)}"]`,
          );

        if (target) {
          target.scrollIntoView({ block: "center", behavior: "smooth" });
          setSearchHighlight(searchScrollTarget);
          clearTimer = window.setTimeout(() => {
            setSearchHighlight(null);
          }, SEARCH_HIGHLIGHT_MS);
        }

        onSearchScrollTargetConsumed?.();
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, [searchScrollTarget, onSearchScrollTargetConsumed, files]);

  const commentModeActive = uiMode === "comment";
  const commentModeDisabled = selectableForUnit.length === 0;

  // Announce focused/selected lines so comment mode is not color-only (1.4.1 / 4.1.3).
  const selectionAnnouncement = useMemo(() => {
    if (uiMode !== "comment" || !lineSelection) return "";
    const lines = selectableLines.length > 0 ? selectableLines : selectableForUnit;
    const focused = lines[lineSelection.focusIndex];
    if (!focused) return "Comment mode. No line focused.";
    const selected = linesInSelection(lines, lineSelection);
    const focusNum = displayLineNumber(focused);
    if (selected.length > 1) {
      const first = selected[0];
      const last = selected[selected.length - 1];
      const start = displayLineNumber(first);
      const end = displayLineNumber(last);
      return `Comment mode. ${focused.filePath}, lines ${start ?? "?"} to ${end ?? "?"} selected.`;
    }
    return `Comment mode. ${focused.filePath}, line ${focusNum ?? "?"}.`;
  }, [uiMode, lineSelection, selectableLines, selectableForUnit]);

  return (
    <div ref={rootRef}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="gr-sr-only"
        data-testid="comment-selection-status"
      >
        {selectionAnnouncement}
      </div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          className="min-w-0 truncate text-lg font-semibold text-foreground"
          data-testid="diff-unit-title"
          title={unitTitle}
        >
          {unitTitle}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {commentModeActive ? (
            <CommentModeChip />
          ) : (
            <AddCommentButton
              disabled={commentModeDisabled}
              onEnter={() => enterCommentMode(selectableForUnit)}
            />
          )}
          <DiffViewToggle mode={diffViewMode} onChange={setDiffViewMode} />
        </div>
      </div>
      {files.map(({ file, hunks }) => {
        const language = languageForPath(file.path);
        const extension = file.path.includes(".") ? file.path.split(".").pop() : undefined;
        const fileSearchHit =
          searchHighlight != null &&
          searchHighlight.filePath === file.path &&
          !searchHighlight.lineId;
        // When highlighting a line match, pass it as focus so existing focus styles apply.
        const searchFocusId =
          searchHighlight?.lineId && searchHighlight.filePath === file.path
            ? searchHighlight.lineId
            : null;
        const effectiveFocusId = focusId ?? searchFocusId;

        return (
          <div
            className={cn(
              "mb-7 overflow-hidden rounded-lg border border-border bg-surface-raised",
              fileSearchHit && "ring-2 ring-primary ring-offset-2 ring-offset-surface",
            )}
            key={file.path}
            data-file-path={file.path}
            data-testid={fileSearchHit ? "diff-file-search-highlight" : undefined}
          >
            <div className="flex items-baseline gap-2.5 border-b border-border bg-background px-3 py-2 font-mono text-sm">
              {file.previousPath ? `${file.previousPath} → ${file.path}` : file.path}
              {!language && !file.isBinaryOrElided && (
                <span className="font-normal text-muted italic">
                  {extension
                    ? `no syntax highlighting for .${extension}`
                    : "no syntax highlighting"}
                </span>
              )}
            </div>
            {file.isBinaryOrElided ? (
              <BinaryElidedEmptyState filePath={file.path} />
            ) : (
              hunks.map((hunk) =>
                diffViewMode === "split" ? (
                  <SplitHunk
                    hunk={hunk}
                    language={language}
                    key={hunk.id}
                    selectedIds={selectedIds}
                    focusId={effectiveFocusId}
                    draftsByEndLineId={draftsByEndLineId}
                    composerPlacementId={composerPlacementId}
                    composerRange={composerRange}
                    unitId={unitId}
                  />
                ) : (
                  <UnifiedHunk
                    hunk={hunk}
                    language={language}
                    key={hunk.id}
                    selectedIds={selectedIds}
                    focusId={effectiveFocusId}
                    draftsByEndLineId={draftsByEndLineId}
                    composerPlacementId={composerPlacementId}
                    composerRange={composerRange}
                    unitId={unitId}
                  />
                ),
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
