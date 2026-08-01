import type { DiffLine } from "../../lib/types";

/** One side of a split-diff row. */
export type SplitCell =
  | {
      kind: "content";
      type: "add" | "del" | "context";
      content: string;
      lineNumber?: number;
      /** Index into the original hunk.lines array (for highlight lookup). */
      sourceIndex: number;
    }
  | { kind: "empty" };

interface SplitRow {
  left: SplitCell;
  right: SplitCell;
}

/**
 * Convert a unified-diff hunk's lines into GitHub-style side-by-side rows.
 *
 * - Context lines appear on both sides.
 * - Consecutive deletes followed by consecutive adds form a change block;
 *   they are paired by index, with empty cells filling the shorter side.
 */
export function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === "context") {
      rows.push({
        left: {
          kind: "content",
          type: "context",
          content: line.content,
          lineNumber: line.oldLine,
          sourceIndex: i,
        },
        right: {
          kind: "content",
          type: "context",
          content: line.content,
          lineNumber: line.newLine,
          sourceIndex: i,
        },
      });
      i += 1;
      continue;
    }

    // Collect consecutive deletes, then consecutive adds (a change block).
    const dels: { line: DiffLine; index: number }[] = [];
    while (i < lines.length && lines[i].type === "del") {
      dels.push({ line: lines[i], index: i });
      i += 1;
    }

    const adds: { line: DiffLine; index: number }[] = [];
    while (i < lines.length && lines[i].type === "add") {
      adds.push({ line: lines[i], index: i });
      i += 1;
    }

    const pairCount = Math.max(dels.length, adds.length);
    for (let p = 0; p < pairCount; p++) {
      const del = dels[p];
      const add = adds[p];
      rows.push({
        left: del
          ? {
              kind: "content",
              type: "del",
              content: del.line.content,
              lineNumber: del.line.oldLine,
              sourceIndex: del.index,
            }
          : { kind: "empty" },
        right: add
          ? {
              kind: "content",
              type: "add",
              content: add.line.content,
              lineNumber: add.line.newLine,
              sourceIndex: add.index,
            }
          : { kind: "empty" },
      });
    }
  }

  return rows;
}
