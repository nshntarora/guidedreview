import { highlightToLines } from "../../../../lib/highlight";
import type { DiffHunk } from "../../../../lib/types";

/**
 * Highlight a hunk's lines against GitHub's syntax palette.
 *
 * We reconstruct the two file states the hunk straddles — the "old" text
 * (context + del lines) and the "new" text (context + add lines) — and
 * highlight each as a whole so multi-line constructs (block comments,
 * template strings) tokenize correctly, then walk the hunk lines back over
 * the resulting per-line HTML fragments.
 */
export function highlightHunkLines(
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
    const fragment = newHighlighted[newCursor] ?? oldHighlighted[oldCursor] ?? null;
    oldCursor++;
    newCursor++;
    return fragment;
  });
}

export function CodeContent({
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
