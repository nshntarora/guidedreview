import { useMemo } from "react";
import { cn } from "../../../../lib/cn";
import { CodeContent, highlightHunkLines } from "./hunkHighlight";
import { LineExtras } from "./LineExtras";
import {
  DIFF_LINE_WRAP,
  lineIdFor,
  lineNumberClasses,
  selectionClasses,
  type HunkViewProps,
} from "./hunkStyles";

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
  const highlighted = useMemo(
    () => highlightHunkLines(hunk, language),
    [hunk, language],
  );

  return (
    <div
      className="overflow-x-hidden font-mono text-sm leading-relaxed"
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
              aria-current={isFocus ? "true" : undefined}
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
