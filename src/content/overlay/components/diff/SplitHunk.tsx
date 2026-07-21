import { useMemo } from "react";
import { cn } from "../../../../lib/cn";
import { buildSplitRows, type SplitCell } from "../../buildSplitRows";
import { CodeContent, highlightHunkLines } from "./hunkHighlight";
import { LineExtras } from "./LineExtras";
import {
  DIFF_LINE_WRAP,
  lineIdFor,
  lineNumberClasses,
  selectionClasses,
  type HunkViewProps,
} from "./hunkStyles";

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
      aria-current={isFocus ? "true" : undefined}
    >
      <span
        className={lineNumberClasses(highlightNumber)}
        data-testid={highlightNumber ? "diff-line-number-highlight" : undefined}
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

export function SplitHunk({
  hunk,
  language,
  selectedIds,
  focusId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
}: HunkViewProps) {
  const highlighted = useMemo(
    () => highlightHunkLines(hunk, language),
    [hunk, language],
  );
  const rows = useMemo(() => buildSplitRows(hunk.lines), [hunk.lines]);

  return (
    <div
      className="overflow-x-hidden font-mono text-sm leading-relaxed"
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
                <div
                  className="w-px shrink-0 bg-gr-border"
                  aria-hidden="true"
                />
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
