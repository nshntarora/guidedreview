import type { ParsedDiff } from "@guided-review/core";
import { displayLineNumber, type DraftComment, type SelectableLine } from "./commentTypes";
import type { PendingComposer } from "./store";
import { buildSelectableLines } from "./buildSelectableLines";

/** Never relocate by line number alone: side, full range and captured source must match. */
export function reconcileFeedback(
  diff: ParsedDiff,
  drafts: DraftComment[],
  pending: Record<string, PendingComposer>,
): { draftComments: DraftComment[]; pendingComposers: Record<string, PendingComposer> } {
  const lines = buildSelectableLines(
    diff.files.map((file) => ({ file, hunks: file.hunks })),
    "unified",
  );
  function match(
    note: Pick<DraftComment, "filePath" | "side" | "startLine" | "endLine" | "selectedCode">,
  ): SelectableLine[] | null {
    const range = lines.filter(
      (line) =>
        line.filePath === note.filePath &&
        line.side === note.side &&
        displayLineNumber(line)! >= note.startLine &&
        displayLineNumber(line)! <= note.endLine,
    );
    range.sort((a, b) => displayLineNumber(a)! - displayLineNumber(b)!);
    if (
      range.length !== note.endLine - note.startLine + 1 ||
      range.some((line, i) => displayLineNumber(line) !== note.startLine + i) ||
      range.map((line) => line.content).join("\n") !== note.selectedCode
    )
      return null;
    return range;
  }
  const draftComments: DraftComment[] = drafts.map((draft) => {
    // An unresolved note stays unresolved until the user recreates it deliberately.
    const range = draft.unresolved ? null : match(draft);
    return {
      ...draft,
      unitId: undefined,
      lineIds: range?.map((line) => line.id) ?? [],
      unresolved: !range,
    };
  });
  const pendingComposers: Record<string, PendingComposer> = {};
  for (const composer of Object.values(pending)) {
    if (!composer.body.trim()) continue;
    const first = composer.lines[0];
    const last = composer.lines.at(-1);
    const note: DraftComment = {
      id: `unfinished-${crypto.randomUUID()}`,
      filePath: first?.filePath ?? "Unknown file",
      side: first?.side ?? "RIGHT",
      startLine: first ? (displayLineNumber(first) ?? 0) : 0,
      endLine: last ? (displayLineNumber(last) ?? 0) : 0,
      selectedCode: composer.lines.map((line) => line.content).join("\n"),
      body: composer.body,
      lineIds: [],
    };
    const range = first && last ? match(note) : null;
    if (range)
      pendingComposers[JSON.stringify(range.map((line) => line.id))] = {
        lines: range,
        body: composer.body,
      };
    else draftComments.push({ ...note, unresolved: true });
  }
  return { draftComments, pendingComposers };
}
