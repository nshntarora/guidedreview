import { WindowedRows } from "./WindowedRows";
import { cn } from "@guided-review/ui";
import {
  CodeContent,
  DIFF_LINE_WRAP,
  LineExtras,
  lineNumberClasses,
  selectionClasses,
  type HunkViewProps,
} from "./hunkShared";
import { lineIdFor, sideForLine } from "@guided-review/ui/review/commentTypes";
import { useDeferredHighlight } from "./useDeferredHighlight";

export function UnifiedHunk({
  hunk,
  language,
  selectedIds,
  focusId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
}: HunkViewProps) {
  const { ref, lines: highlighted } = useDeferredHighlight(hunk, language);

  return (
    <div
      className="overflow-x-hidden font-mono text-sm leading-relaxed"
      ref={ref}
      data-testid="diff-view-unified"
      data-highlight-state={!language ? "plain" : highlighted ? "ready" : "pending"}
    >
      {
        <WindowedRows
          count={hunk.lines.length}
          isPinned={(i) => {
            const id = lineIdFor(hunk.id, i, sideForLine(hunk.lines[i].type));
            return (
              id === focusId ||
              selectedIds.has(id) ||
              id === composerPlacementId ||
              draftsByEndLineId.has(id)
            );
          }}
          renderRow={(i) => {
            const line = hunk.lines[i];
            const side = sideForLine(line.type);
            const id = lineIdFor(hunk.id, i, side);
            const isFocus = focusId === id;
            const isSelected = selectedIds.has(id);
            const highlightNumber = isFocus || isSelected;
            // Selection/focus must win over add/del green/red (Tailwind bg-* conflicts).
            const showDiffBg = !isFocus && !isSelected;
            return (
              <div key={i} data-testid="diff-rendered-row">
                <div
                  data-line-id={id}
                  data-testid={isFocus ? "diff-line-focus" : undefined}
                  aria-current={isFocus ? "true" : undefined}
                  className={cn(
                    DIFF_LINE_WRAP,
                    showDiffBg && line.type === "add" && "bg-diff-add-bg",
                    showDiffBg && line.type === "del" && "bg-diff-del-bg",
                    selectionClasses(id, selectedIds, focusId),
                  )}
                >
                  <span
                    className={lineNumberClasses(highlightNumber)}
                    data-testid={highlightNumber ? "diff-line-number-highlight" : undefined}
                  >
                    {line.oldLine ?? ""}
                  </span>
                  <span
                    className={lineNumberClasses(highlightNumber)}
                    data-testid={highlightNumber ? "diff-line-number-highlight" : undefined}
                  >
                    {line.newLine ?? ""}
                  </span>
                  <span
                    className={cn(
                      "w-4 shrink-0 opacity-70",
                      line.type === "add" && "text-diff-add",
                      line.type === "del" && "text-diff-del",
                    )}
                  >
                    {line.type === "add" ? "+" : line.type === "del" ? "-" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <CodeContent content={line.content} highlighted={highlighted?.[i] ?? null} />
                  </span>
                </div>
                {(composerPlacementId === id || draftsByEndLineId.has(id)) && (
                  <LineExtras
                    lineId={id}
                    draftsByEndLineId={draftsByEndLineId}
                    composerPlacementId={composerPlacementId}
                    composerRange={composerRange}
                    unitId={unitId}
                  />
                )}
              </div>
            );
          }}
        />
      }
    </div>
  );
}
