import { useEffect, useMemo, useRef, useState } from "react";

import { buildPRFileDiffUrl } from "../../../lib/github/prFileDiffUrl";
import { highlightToLines, languageForPath } from "../../../lib/highlight";
import { cn } from "../../../lib/cn";
import type { DiffHunk } from "../../../lib/types";
import { buildSelectableLines } from "../buildSelectableLines";
import { buildSplitRows, type SplitCell } from "../buildSplitRows";
import {
  displayLineNumber,
  linesInSelection,
  type DraftComment,
  type LineSelection,
  type SelectableLine,
} from "../commentTypes";
import type { DiffViewMode } from "../diffViewMode";
import { hydrateDiffViewMode, useReviewStore } from "../store";
import type { ResolvedUnitFile } from "../selectors";
import { CommentComposer } from "./CommentComposer";
import { DraftCommentCard } from "./DraftCommentCard";
import { Kbd } from "./Kbd";
import { ShortcutKeys } from "./ShortcutKeys";

interface DiffPaneProps {
  files: ResolvedUnitFile[];
  /** Title of the currently active review unit. */
  unitTitle: string;
  /** Review unit id for associating saved drafts. */
  unitId?: string;
}

/**
 * Highlight a hunk's lines against GitHub's syntax palette.
 *
 * We reconstruct the two file states the hunk straddles — the "old" text
 * (context + del lines) and the "new" text (context + add lines) — and
 * highlight each as a whole so multi-line constructs (block comments,
 * template strings) tokenize correctly, then walk the hunk lines back over
 * the resulting per-line HTML fragments.
 */
function highlightHunkLines(
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
    // context line — advance both cursors, prefer the "new" rendering
    const fragment =
      newHighlighted[newCursor] ?? oldHighlighted[oldCursor] ?? null;
    oldCursor++;
    newCursor++;
    return fragment;
  });
}

function CodeContent({
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

/** Soft-wrap long lines (e.g. SVG paths) like GitHub — no horizontal scroll bleed. */
const DIFF_LINE_WRAP =
  "flex min-w-0 whitespace-pre-wrap break-all pr-3";

function selectionClasses(
  lineId: string | undefined,
  selectedIds: Set<string>,
  focusId: string | null,
): string {
  if (!lineId) return "";
  // Focus keeps the row wash; brand line-number gutter is layered on top.
  if (focusId === lineId) {
    return "bg-gr-accent-subtle";
  }
  if (selectedIds.has(lineId)) {
    return "bg-gr-accent-subtle/70";
  }
  return "";
}

/**
 * Brand highlight on gutter numbers for the focused line and every line in the
 * current multi-line selection.
 */
function lineNumberClasses(isHighlighted: boolean): string {
  return cn(
    "w-10 shrink-0 select-none pr-3 text-right",
    isHighlighted
      ? "bg-gr-accent font-medium text-gr-accent-on"
      : "text-gr-faint",
  );
}

function lineIdFor(
  hunkId: string,
  lineIndex: number,
  side: "LEFT" | "RIGHT",
): string {
  return `${hunkId}:${lineIndex}:${side}`;
}

interface LineExtrasProps {
  lineId: string;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: { filePath: string; startLine: number; endLine: number } | null;
  unitId?: string;
}

function LineExtras({
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

  return (
    <div className="font-sans" data-testid={`line-extras-${lineId}`}>
      {drafts.map((d) => (
        <DraftCommentCard
          key={d.id}
          comment={d}
          onRemove={removeDraftComment}
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

function UnifiedHunk({
  hunk,
  language,
  selectedIds,
  focusId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
}: {
  hunk: DiffHunk;
  language: string | undefined;
  selectedIds: Set<string>;
  focusId: string | null;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: { filePath: string; startLine: number; endLine: number } | null;
  unitId?: string;
}) {
  const highlighted = useMemo(
    () => highlightHunkLines(hunk, language),
    [hunk, language],
  );

  return (
    <div
      className="overflow-x-hidden font-mono text-[12px] leading-relaxed"
      data-testid="diff-view-unified"
    >
      {hunk.lines.map((line, i) => {
        const side = line.type === "del" ? "LEFT" : "RIGHT";
        const id = lineIdFor(hunk.id, i, side);
        const isFocus = focusId === id;
        const isSelected = selectedIds.has(id);
        const highlightNumber = isFocus || isSelected;
        // Selection/focus must win over add/del green/red (Tailwind bg-* conflicts).
        const showDiffBg = !isFocus && !isSelected;
        return (
          <div key={i}>
            <div
              data-line-id={id}
              data-testid={isFocus ? "diff-line-focus" : undefined}
              className={cn(
                DIFF_LINE_WRAP,
                showDiffBg && line.type === "add" && "bg-gr-add-bg",
                showDiffBg && line.type === "del" && "bg-gr-del-bg",
                selectionClasses(id, selectedIds, focusId),
              )}
            >
              <span
                className={lineNumberClasses(highlightNumber)}
                data-testid={
                  highlightNumber ? "diff-line-number-highlight" : undefined
                }
              >
                {line.oldLine ?? ""}
              </span>
              <span
                className={lineNumberClasses(highlightNumber)}
                data-testid={
                  highlightNumber ? "diff-line-number-highlight" : undefined
                }
              >
                {line.newLine ?? ""}
              </span>
              <span
                className={cn(
                  "w-4 shrink-0 opacity-70",
                  line.type === "add" && "text-gr-add-text",
                  line.type === "del" && "text-gr-del-text",
                )}
              >
                {line.type === "add" ? "+" : line.type === "del" ? "-" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <CodeContent
                  content={line.content}
                  highlighted={highlighted[i] ?? null}
                />
              </span>
            </div>
            <LineExtras
              lineId={id}
              draftsByEndLineId={draftsByEndLineId}
              composerPlacementId={composerPlacementId}
              composerRange={composerRange}
              unitId={unitId}
            />
          </div>
        );
      })}
    </div>
  );
}

function SplitCellView({
  cell,
  highlighted,
  side,
  lineId,
  selectedIds,
  focusId,
}: {
  cell: SplitCell;
  highlighted: string | null;
  side: "left" | "right";
  lineId?: string;
  selectedIds: Set<string>;
  focusId: string | null;
}) {
  if (cell.kind === "empty") {
    return (
      <div className={cn(DIFF_LINE_WRAP, "flex-1 overflow-hidden")}>
        <span className={lineNumberClasses(false)} />
        <span className="min-w-0 flex-1" />
      </div>
    );
  }

  const isFocus = lineId != null && focusId === lineId;
  const isSelected = lineId != null && selectedIds.has(lineId);
  const highlightNumber = isFocus || isSelected;
  // Selection/focus must win over add/del green/red (Tailwind bg-* conflicts).
  const showDiffBg = !isFocus && !isSelected;

  return (
    <div
      className={cn(
        DIFF_LINE_WRAP,
        "flex-1 overflow-hidden",
        showDiffBg && cell.type === "del" && "bg-gr-del-bg",
        showDiffBg && cell.type === "add" && "bg-gr-add-bg",
        selectionClasses(lineId, selectedIds, focusId),
      )}
      data-side={side}
      data-line-id={lineId}
      data-testid={isFocus ? "diff-line-focus" : undefined}
    >
      <span
        className={lineNumberClasses(highlightNumber)}
        data-testid={
          highlightNumber ? "diff-line-number-highlight" : undefined
        }
      >
        {cell.lineNumber ?? ""}
      </span>
      <span
        className={cn(
          "w-4 shrink-0 opacity-70",
          cell.type === "add" && "text-gr-add-text",
          cell.type === "del" && "text-gr-del-text",
        )}
      >
        {cell.type === "add" ? "+" : cell.type === "del" ? "-" : " "}
      </span>
      <span className="min-w-0 flex-1">
        <CodeContent content={cell.content} highlighted={highlighted} />
      </span>
    </div>
  );
}

function SplitHunk({
  hunk,
  language,
  selectedIds,
  focusId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
}: {
  hunk: DiffHunk;
  language: string | undefined;
  selectedIds: Set<string>;
  focusId: string | null;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: { filePath: string; startLine: number; endLine: number } | null;
  unitId?: string;
}) {
  const highlighted = useMemo(
    () => highlightHunkLines(hunk, language),
    [hunk, language],
  );
  const rows = useMemo(() => buildSplitRows(hunk.lines), [hunk.lines]);

  return (
    <div
      className="overflow-x-hidden font-mono text-[12px] leading-relaxed"
      data-testid="diff-view-split"
    >
      {rows.map((row, i) => {
        const leftId =
          row.left.kind === "content"
            ? lineIdFor(hunk.id, row.left.sourceIndex, "LEFT")
            : undefined;
        const rightId =
          row.right.kind === "content"
            ? lineIdFor(hunk.id, row.right.sourceIndex, "RIGHT")
            : undefined;

        const showLeftExtras =
          leftId != null &&
          (composerPlacementId === leftId || draftsByEndLineId.has(leftId));
        const showRightExtras =
          rightId != null &&
          (composerPlacementId === rightId || draftsByEndLineId.has(rightId));

        return (
          <div key={i}>
            <div className="flex min-w-0 border-b border-gr-border-muted last:border-b-0">
              <SplitCellView
                cell={row.left}
                highlighted={
                  row.left.kind === "content"
                    ? (highlighted[row.left.sourceIndex] ?? null)
                    : null
                }
                side="left"
                lineId={leftId}
                selectedIds={selectedIds}
                focusId={focusId}
              />
              <div className="w-px shrink-0 bg-gr-border" aria-hidden="true" />
              <SplitCellView
                cell={row.right}
                highlighted={
                  row.right.kind === "content"
                    ? (highlighted[row.right.sourceIndex] ?? null)
                    : null
                }
                side="right"
                lineId={rightId}
                selectedIds={selectedIds}
                focusId={focusId}
              />
            </div>
            {(showLeftExtras || showRightExtras) && (
              <div className="flex min-w-0" data-testid="split-line-extras">
                <div className="min-w-0 flex-1" aria-hidden="true" />
                <div className="w-px shrink-0 bg-gr-border" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {showLeftExtras && leftId && (
                    <LineExtras
                      lineId={leftId}
                      draftsByEndLineId={draftsByEndLineId}
                      composerPlacementId={composerPlacementId}
                      composerRange={composerRange}
                      unitId={unitId}
                    />
                  )}
                  {showRightExtras && rightId && (
                    <LineExtras
                      lineId={rightId}
                      draftsByEndLineId={draftsByEndLineId}
                      composerPlacementId={composerPlacementId}
                      composerRange={composerRange}
                      unitId={unitId}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DiffViewToggle({
  mode,
  onChange,
}: {
  mode: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center"
      role="group"
      aria-label="Diff view"
      data-testid="diff-view-toggle"
    >
      <div className="inline-flex overflow-hidden rounded-md border border-gr-border bg-gr-bg">
        <button
          type="button"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors",
            mode === "unified"
              ? "bg-gr-subtle text-gr-text"
              : "bg-transparent text-gr-muted hover:bg-gr-subtle hover:text-gr-text",
          )}
          aria-label="Unified"
          aria-pressed={mode === "unified"}
          onClick={() => onChange("unified")}
        >
          Unified
          <ShortcutKeys keys={["v", "u"]} join="sequence" />
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 border-l border-gr-border px-3 py-1.5 text-[13px] transition-colors",
            mode === "split"
              ? "bg-gr-subtle text-gr-text"
              : "bg-transparent text-gr-muted hover:bg-gr-subtle hover:text-gr-text",
          )}
          aria-label="Split"
          aria-pressed={mode === "split"}
          onClick={() => onChange("split")}
        >
          Split
          <ShortcutKeys keys={["v", "s"]} join="sequence" />
        </button>
      </div>
    </div>
  );
}

function CommentModeChip() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gr-accent/40 bg-gr-accent-subtle px-2.5 py-1 text-[12px] text-gr-accent"
      data-testid="comment-mode-chip"
    >
      Comment mode
      <span className="inline-flex items-center gap-1 text-gr-muted">
        · <Kbd>Esc</Kbd> to exit
      </span>
    </span>
  );
}

function AddCommentButton({
  disabled,
  onEnter,
}: {
  disabled: boolean;
  onEnter: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gr-border px-3 py-1.5 text-[13px] transition-colors",
        disabled
          ? "cursor-not-allowed bg-gr-bg text-gr-faint opacity-60"
          : "cursor-pointer bg-gr-bg text-gr-text hover:bg-gr-subtle",
      )}
      aria-label="Add Comment"
      disabled={disabled}
      data-testid="enter-comment-mode"
      onClick={() => {
        if (disabled) return;
        onEnter();
      }}
    >
      Add Comment
      <Kbd>c</Kbd>
    </button>
  );
}

/**
 * Empty body for files with no textual diff (binary, LFS, elided patches).
 * Centers the message and, when PR context is available, links to that file
 * on GitHub's Files changed tab.
 */
function BinaryElidedEmptyState({ filePath }: { filePath: string }) {
  const prContext = useReviewStore((s) => s.prContext);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!prContext) {
      setGithubUrl(null);
      return;
    }

    let cancelled = false;
    void buildPRFileDiffUrl(
      {
        owner: prContext.owner,
        repo: prContext.repo,
        number: prContext.number,
      },
      filePath,
    ).then((url) => {
      if (!cancelled) setGithubUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [prContext, filePath]);

  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      data-testid="binary-elided-empty"
    >
      <span className="font-mono text-[13px] leading-relaxed text-gr-muted">
        (binary or elided — no textual diff available)
      </span>
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-gr-accent underline-offset-2 hover:underline"
          data-testid="binary-elided-github-link"
        >
          View file diff on GitHub
        </a>
      )}
    </div>
  );
}

function useSelectionDerived(
  selectableLines: SelectableLine[],
  lineSelection: LineSelection | null,
  composerOpen: boolean,
  draftComments: DraftComment[],
  filePaths: Set<string>,
) {
  return useMemo(() => {
    const selected = lineSelection
      ? linesInSelection(selectableLines, lineSelection)
      : [];
    const selectedIds = new Set(selected.map((l) => l.id));
    const focusId =
      lineSelection && selectableLines[lineSelection.focusIndex]
        ? selectableLines[lineSelection.focusIndex].id
        : null;

    let composerPlacementId: string | null = null;
    let composerRange: {
      filePath: string;
      startLine: number;
      endLine: number;
    } | null = null;

    if (composerOpen && selected.length > 0) {
      const first = selected[0];
      const last = selected[selected.length - 1];
      const startNum = displayLineNumber(first);
      const endNum = displayLineNumber(last);
      if (startNum !== undefined && endNum !== undefined) {
        composerPlacementId = last.id;
        composerRange = {
          filePath: first.filePath,
          startLine: Math.min(startNum, endNum),
          endLine: Math.max(startNum, endNum),
        };
      }
    }

    const draftsByEndLineId = new Map<string, DraftComment[]>();
    for (const draft of draftComments) {
      if (!filePaths.has(draft.filePath)) continue;
      const endId = draft.lineIds[draft.lineIds.length - 1];
      if (!endId) continue;
      const list = draftsByEndLineId.get(endId) ?? [];
      list.push(draft);
      draftsByEndLineId.set(endId, list);
    }

    return {
      selectedIds,
      focusId,
      composerPlacementId,
      composerRange,
      draftsByEndLineId,
    };
  }, [selectableLines, lineSelection, composerOpen, draftComments, filePaths]);
}

export function DiffPane({ files, unitTitle, unitId }: DiffPaneProps) {
  const diffViewMode = useReviewStore((s) => s.diffViewMode);
  const setDiffViewMode = useReviewStore((s) => s.setDiffViewMode);
  const uiMode = useReviewStore((s) => s.uiMode);
  const selectableLines = useReviewStore((s) => s.selectableLines);
  const lineSelection = useReviewStore((s) => s.lineSelection);
  const composerOpen = useReviewStore((s) => s.composerOpen);
  const draftComments = useReviewStore((s) => s.draftComments);
  const enterCommentMode = useReviewStore((s) => s.enterCommentMode);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void hydrateDiffViewMode();
  }, []);

  const unitSelectableLines = useMemo(
    () => buildSelectableLines(files, diffViewMode),
    [files, diffViewMode],
  );

  const filePaths = useMemo(
    () => new Set(files.map((f) => f.file.path)),
    [files],
  );

  const {
    selectedIds,
    focusId,
    composerPlacementId,
    composerRange,
    draftsByEndLineId,
  } = useSelectionDerived(
    uiMode === "comment" ? selectableLines : [],
    uiMode === "comment" ? lineSelection : null,
    composerOpen,
    draftComments,
    filePaths,
  );

  // Scroll the focused line into view when the cursor moves.
  useEffect(() => {
    if (uiMode !== "comment" || !focusId || !rootRef.current) return;
    const el = rootRef.current.querySelector(
      `[data-line-id="${CSS.escape(focusId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [uiMode, focusId, lineSelection?.focusIndex]);

  const commentModeActive = uiMode === "comment";
  const commentModeDisabled = unitSelectableLines.length === 0;

  return (
    <div ref={rootRef}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          className="min-w-0 truncate text-[15px] font-semibold text-gr-text"
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
              onEnter={() => enterCommentMode(unitSelectableLines)}
            />
          )}
          <DiffViewToggle mode={diffViewMode} onChange={setDiffViewMode} />
        </div>
      </div>
      {files.map(({ file, hunks }) => {
        const language = languageForPath(file.path);
        const extension = file.path.includes(".")
          ? file.path.split(".").pop()
          : undefined;
        return (
          <div
            className="mb-7 overflow-hidden rounded-lg border border-gr-border bg-gr-canvas"
            key={file.path}
          >
            <div className="flex items-baseline gap-2.5 border-b border-gr-border bg-gr-chrome px-3 py-2 font-mono text-[12.5px]">
              {file.previousPath
                ? `${file.previousPath} → ${file.path}`
                : file.path}
              {!language && !file.isBinaryOrElided && (
                <span className="font-normal text-gr-muted italic">
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
                    focusId={focusId}
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
                    focusId={focusId}
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
