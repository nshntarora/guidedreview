import type { DiffFile, DiffHunk, DiffLine, FileChangeStatus, ParsedDiff } from "../types";

const FILE_HEADER_RE = /^diff --git a\/(.+) b\/(.+)$/;
const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

/**
 * Parse a unified diff (as returned by GitHub's `{pr}.diff` endpoint) into a
 * structured, per-file / per-hunk representation.
 *
 * Deliberately hand-rolled rather than pulling in a diff library: the unified
 * diff format produced by git/GitHub is small and stable, and we only need to
 * recover file identity + hunks + line-level add/del/context — not arbitrary
 * diff algorithms.
 */
export function parseUnifiedDiff(raw: string): ParsedDiff {
  const lines = raw.split("\n");
  const files: DiffFile[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fileMatch = FILE_HEADER_RE.exec(line);
    if (!fileMatch) {
      i++;
      continue;
    }

    const pathA = fileMatch[1];
    const pathB = fileMatch[2];
    i++;

    let status: FileChangeStatus = "modified";
    let previousPath: string | undefined;
    let isBinaryOrElided = false;

    // Consume extended header lines until we hit the --- / +++ pair or the next "diff --git"
    while (i < lines.length && !lines[i].startsWith("diff --git ")) {
      const l = lines[i];
      if (l.startsWith("new file mode")) {
        status = "added";
      } else if (l.startsWith("deleted file mode")) {
        status = "removed";
      } else if (l.startsWith("rename from ")) {
        status = "renamed";
        previousPath = l.slice("rename from ".length);
      } else if (l.startsWith("rename to ")) {
        // pathB already carries the new path from the "diff --git" line
      } else if (l.startsWith("Binary files ") || l.startsWith("GIT binary patch")) {
        isBinaryOrElided = true;
      } else if (l.startsWith("--- ")) {
        i++;
        // expect a matching "+++ " line right after
        if (i < lines.length && lines[i].startsWith("+++ ")) {
          i++;
        }
        break;
      }
      i++;
    }

    const hunks: DiffHunk[] = [];
    let hunkIndex = 0;

    while (i < lines.length) {
      const hunkMatch = HUNK_HEADER_RE.exec(lines[i]);
      if (!hunkMatch) break;

      const oldStart = Number(hunkMatch[1]);
      const oldLines = hunkMatch[2] !== undefined ? Number(hunkMatch[2]) : 1;
      const newStart = Number(hunkMatch[3]);
      const newLines = hunkMatch[4] !== undefined ? Number(hunkMatch[4]) : 1;
      const header = lines[i];
      i++;

      const hunkLines: DiffLine[] = [];
      let oldLineNo = oldStart;
      let newLineNo = newStart;

      while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith("@@ ") || l.startsWith("diff --git ")) break;
        if (l.startsWith("\\ No newline at end of file")) {
          i++;
          continue;
        }

        if (l.startsWith("+")) {
          hunkLines.push({ type: "add", content: l.slice(1), newLine: newLineNo });
          newLineNo++;
        } else if (l.startsWith("-")) {
          hunkLines.push({ type: "del", content: l.slice(1), oldLine: oldLineNo });
          oldLineNo++;
        } else {
          // context line — leading space, or an empty line inside the hunk
          const content = l.startsWith(" ") ? l.slice(1) : l;
          hunkLines.push({
            type: "context",
            content,
            oldLine: oldLineNo,
            newLine: newLineNo,
          });
          oldLineNo++;
          newLineNo++;
        }
        i++;
      }

      const filePathForId = status === "removed" ? pathA : pathB;
      hunks.push({
        id: `${filePathForId}#${hunkIndex}`,
        header,
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: hunkLines,
      });
      hunkIndex++;
    }

    files.push({
      path: status === "removed" ? pathA : pathB,
      previousPath,
      status,
      hunks,
      isBinaryOrElided,
    });
  }

  return { files };
}
