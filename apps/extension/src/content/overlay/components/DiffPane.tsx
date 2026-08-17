import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@guided-review/ui";

import { languageForPath } from "@extension/lib/highlight";
import { useReviewHost } from "@extension/content/overlay/host";
import {
  displayLineNumber,
  linesInSelection,
  type DraftComment,
  type LineSelection,
  type SelectableLine,
} from "@extension/content/overlay/commentTypes";
import type { SearchScrollTarget } from "@extension/content/overlay/diffSearch";
import { withHunkGaps } from "@extension/content/overlay/hunkGaps";
import { hydrateDiffViewMode, useReviewStore } from "@extension/content/overlay/store";
import type { ResolvedUnitFile } from "@extension/content/overlay/buildSelectableLines";
import type { DiffViewMode } from "@extension/lib/preferences";
import type { ComposerRange } from "./diff/hunkShared";
import { AddCommentButton, CommentModeChip, DiffViewToggle } from "./diff/DiffToolbar";
import { HunkGapPlaceholder } from "./diff/HunkGapPlaceholder";
import { SplitHunk } from "./diff/SplitHunk";
import { UnifiedHunk } from "./diff/UnifiedHunk";
import { deriveSelection } from "./diff/deriveSelection";
import { MiddleEllipsisText } from "./MiddleEllipsisText";
import { TestsUnitIcon } from "./TestsUnitIcon";

/** How long the search-match flash highlight stays on the target line/file. */
const SEARCH_HIGHLIGHT_MS = 1600;

interface DiffPaneProps {
  files: ResolvedUnitFile[];
  /**
   * Title of the currently active review unit (`displayTitle ?? title`).
   * Already display-ready — path plans pre-truncate in buildFileReviewPlan.
   */
  unitTitle: string;
  /** Full untruncated title for the native tooltip (falls back to unitTitle). */
  unitTitleTooltip?: string;
  /** When true, show the flask icon (tests review unit). */
  isTestsUnit?: boolean;
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

/** Empty body for binary/LFS/elided files; optional deep link to GitHub Files tab. */
function BinaryElidedEmptyState({ filePath }: { filePath: string }) {
  const host = useReviewHost();
  const prContext = useReviewStore((s) => s.prContext);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!prContext || !host.fileDiffUrl) {
      setGithubUrl(null);
      return;
    }
    let cancelled = false;
    void host.fileDiffUrl(filePath, prContext).then((url) => {
      if (!cancelled) setGithubUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [host, prContext, filePath]);

  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      data-testid="binary-elided-empty"
    >
      <span className="font-mono text-base leading-relaxed text-muted">
        (binary or elided — no textual diff available)
      </span>
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-medium text-primary underline-offset-2 hover:underline"
          data-testid="binary-elided-github-link"
        >
          View File Diff on GitHub
        </a>
      )}
    </div>
  );
}

/**
 * Polite live-region text for comment-mode focus/selection.
 * Keeps announcement logic out of the render path so it is easy to scan.
 */
function selectionAnnouncementText(
  uiMode: string,
  lineSelection: LineSelection | null,
  selectableLines: SelectableLine[],
  selectableForUnit: SelectableLine[],
): string {
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
}

interface DiffFileCardProps {
  resolved: ResolvedUnitFile;
  diffViewMode: DiffViewMode;
  selectedIds: Set<string>;
  focusId: string | null;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: ComposerRange;
  unitId?: string;
  searchHighlight: SearchScrollTarget | null;
}

/** One file's path header + hunks (or binary empty state) inside the unit pane. */
function DiffFileCard({
  resolved,
  diffViewMode,
  selectedIds,
  focusId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
  searchHighlight,
}: DiffFileCardProps) {
  const { file, hunks } = resolved;
  const language = languageForPath(file.path);
  const extension = file.path.includes(".") ? file.path.split(".").pop() : undefined;
  const pathLabel = file.previousPath ? `${file.previousPath} → ${file.path}` : file.path;
  const fileSearchHit =
    searchHighlight != null && searchHighlight.filePath === file.path && !searchHighlight.lineId;
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
      data-file-path={file.path}
      data-testid={fileSearchHit ? "diff-file-search-highlight" : undefined}
    >
      <div className="flex min-w-0 items-baseline gap-2.5 border-b border-border bg-background px-3 py-2 font-mono text-sm">
        <MiddleEllipsisText text={pathLabel} maxWidth="100%" className="min-w-0 flex-1" />
        {!language && !file.isBinaryOrElided && (
          <span className="shrink-0 font-normal text-muted italic">
            {extension ? `no syntax highlighting for .${extension}` : "no syntax highlighting"}
          </span>
        )}
      </div>
      {file.isBinaryOrElided ? (
        <BinaryElidedEmptyState filePath={file.path} />
      ) : (
        withHunkGaps(hunks).map((item) => {
          if (item.kind === "gap") {
            return (
              <HunkGapPlaceholder key={item.key} filePath={file.path} afterLine={item.afterLine} />
            );
          }
          const { hunk } = item;
          return diffViewMode === "split" ? (
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
          );
        })
      )}
    </div>
  );
}

export function DiffPane({
  files,
  unitTitle,
  unitTitleTooltip,
  isTestsUnit = false,
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
    deriveSelection(
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
  const selectionAnnouncement = selectionAnnouncementText(
    uiMode,
    lineSelection,
    selectableLines,
    selectableForUnit,
  );

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
          className="min-w-0 text-lg font-semibold text-foreground"
          data-testid="diff-unit-title"
          title={unitTitleTooltip ?? unitTitle}
        >
          <span className="break-words">
            {isTestsUnit && (
              <TestsUnitIcon className="mr-1.5 inline-block align-[-0.125em] text-muted" />
            )}
            {unitTitle}
          </span>
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
      {files.map((resolved) => (
        <DiffFileCard
          key={resolved.file.path}
          resolved={resolved}
          diffViewMode={diffViewMode}
          selectedIds={selectedIds}
          focusId={focusId}
          draftsByEndLineId={draftsByEndLineId}
          composerPlacementId={composerPlacementId}
          composerRange={composerRange}
          unitId={unitId}
          searchHighlight={searchHighlight}
        />
      ))}
    </div>
  );
}
