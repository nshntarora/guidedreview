import { useMemo } from "react";
import {
  displayLineNumber,
  linesInSelection,
  type DraftComment,
  type LineSelection,
  type SelectableLine,
} from "../../commentTypes";
import type { ComposerRange } from "./hunkStyles";

export function useSelectionDerived(
  selectableLines: SelectableLine[],
  lineSelection: LineSelection | null,
  composerOpen: boolean,
  draftComments: DraftComment[],
  filePaths: Set<string>,
) {
  return useMemo(() => {
    const selected = lineSelection ? linesInSelection(selectableLines, lineSelection) : [];
    const selectedIds = new Set(selected.map((l) => l.id));
    const focusId =
      lineSelection && selectableLines[lineSelection.focusIndex]
        ? selectableLines[lineSelection.focusIndex].id
        : null;

    let composerPlacementId: string | null = null;
    let composerRange: ComposerRange = null;

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
