import type { DiffLine } from "../../lib/types";
import { buildSplitRows } from "./buildSplitRows";
import type { DiffViewMode } from "./diffViewMode";
import { lineIdFor, sideForLine, type DiffSide, type SelectableLine } from "./commentTypes";
import type { ResolvedUnitFile } from "./selectors";

function fromDiffLine(
  filePath: string,
  hunkId: string,
  lineIndex: number,
  line: DiffLine,
  side: DiffSide,
): SelectableLine {
  return {
    id: lineIdFor(hunkId, lineIndex, side),
    filePath,
    hunkId,
    lineIndex,
    side,
    oldLine: line.oldLine,
    newLine: line.newLine,
    type: line.type,
  };
}

/**
 * Unified: one selectable row per diff line.
 * - del → LEFT (old file)
 * - add → RIGHT (new file)
 * - context → RIGHT (GitHub-style “comment on new”)
 */
function buildUnified(files: ResolvedUnitFile[]): SelectableLine[] {
  const out: SelectableLine[] = [];
  for (const { file, hunks } of files) {
    if (file.isBinaryOrElided) continue;
    for (const hunk of hunks) {
      hunk.lines.forEach((line, lineIndex) => {
        const side = sideForLine(line.type);
        out.push(fromDiffLine(file.path, hunk.id, lineIndex, line, side));
      });
    }
  }
  return out;
}

/**
 * Split: only RIGHT (new-file / changes) cells are commentable, ordered
 * file → hunk → row → right cell (if any).
 * Pure deletions have no RIGHT cells — use unified view to comment on them.
 */
function buildSplit(files: ResolvedUnitFile[]): SelectableLine[] {
  const out: SelectableLine[] = [];
  for (const { file, hunks } of files) {
    if (file.isBinaryOrElided) continue;
    for (const hunk of hunks) {
      const rows = buildSplitRows(hunk.lines);
      for (const row of rows) {
        if (row.right.kind === "content") {
          const line = hunk.lines[row.right.sourceIndex];
          if (line) {
            out.push(fromDiffLine(file.path, hunk.id, row.right.sourceIndex, line, "RIGHT"));
          }
        }
      }
    }
  }
  return out;
}

/** Flat keyboard-navigable line list for the current unit + diff view mode. */
export function buildSelectableLines(
  files: ResolvedUnitFile[],
  viewMode: DiffViewMode,
): SelectableLine[] {
  return viewMode === "split" ? buildSplit(files) : buildUnified(files);
}
