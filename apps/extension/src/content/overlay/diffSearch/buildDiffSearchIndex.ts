import type { ParsedDiff } from "../../../lib/types";
import type { DiffSearchDoc } from "./types";

function sideForLineType(type: "add" | "del" | "context"): "LEFT" | "RIGHT" {
  return type === "del" ? "LEFT" : "RIGHT";
}

/**
 * Flatten a parsed PR diff into Fuse-ready documents: one per file path and
 * one per hunk line. Binary/elided files contribute path docs only.
 */
export function buildDiffSearchIndex(diff: ParsedDiff): DiffSearchDoc[] {
  const docs: DiffSearchDoc[] = [];

  for (const file of diff.files) {
    // Include previousPath in the searchable path string so renames hit on either name.
    const pathSearch = file.previousPath ? `${file.previousPath} ${file.path}` : file.path;

    docs.push({
      kind: "file",
      id: `file:${file.path}`,
      path: pathSearch,
      content: "",
      filePath: file.path,
      previousPath: file.previousPath,
    });

    if (file.isBinaryOrElided) continue;

    for (const hunk of file.hunks) {
      hunk.lines.forEach((line, lineIndex) => {
        const side = sideForLineType(line.type);
        docs.push({
          kind: "line",
          id: `${hunk.id}:${lineIndex}:${side}`,
          path: file.path,
          content: line.content,
          filePath: file.path,
          hunkId: hunk.id,
          lineIndex,
          side,
          lineType: line.type,
        });
      });
    }
  }

  return docs;
}
