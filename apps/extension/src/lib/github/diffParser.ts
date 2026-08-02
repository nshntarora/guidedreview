import type {
  DiffFile,
  DiffHunk,
  DiffLine,
  FileChangeStatus,
  ParsedDiff,
} from "@extension/lib/types";

const FILE_HEADER_PREFIX = "diff --git ";
const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

/**
 * Decode git's C-style path quoting (`"src/wei\303\237.ts"`), used whenever a
 * path contains a quote, backslash, control character, or (with the default
 * `core.quotePath`) a non-ASCII byte. Octal escapes are UTF-8 bytes, so they
 * are collected and decoded together rather than one char at a time.
 */
function unquoteGitPath(value: string): string {
  if (!value.startsWith('"') || !value.endsWith('"') || value.length < 2) return value;

  const body = value.slice(1, -1);
  const bytes: number[] = [];
  const encoder = new TextEncoder();

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\") {
      for (const byte of encoder.encode(ch)) bytes.push(byte);
      continue;
    }

    const next = body[++i];
    if (next === undefined) break;
    const simple: Record<string, number> = {
      a: 0x07,
      b: 0x08,
      t: 0x09,
      n: 0x0a,
      v: 0x0b,
      f: 0x0c,
      r: 0x0d,
      '"': 0x22,
      "\\": 0x5c,
    };
    if (next in simple) {
      bytes.push(simple[next]);
      continue;
    }
    const octal = /^[0-7]{1,3}/.exec(body.slice(i));
    if (octal) {
      bytes.push(parseInt(octal[0], 8) & 0xff);
      i += octal[0].length - 1;
      continue;
    }
    for (const byte of encoder.encode(next)) bytes.push(byte);
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Extract the path from a `--- a/<path>` / `+++ b/<path>` line, or undefined
 * for `/dev/null` (and anything unrecognized).
 *
 * These lines are the trustworthy source of file identity: each carries exactly
 * one path, so unlike the `diff --git` header there is nothing to disambiguate.
 */
function pathFromMarkerLine(line: string, prefix: "a/" | "b/"): string | undefined {
  const value = unquoteGitPath(line.slice(4).trim());
  if (value === "/dev/null") return undefined;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

/**
 * Fallback path extraction from the `diff --git a/X b/Y` header, used only when
 * a file has no `---`/`+++` lines (binary and mode-only changes).
 *
 * The header is genuinely ambiguous: git does not quote spaces, so a file named
 * `x b/y.ts` produces `diff --git a/x b/y.ts b/x b/y.ts`, which splits several
 * ways. A greedy regex picks the *last* ` b/`, which lets a pull request author
 * make the overlay display a path that isn't the file being changed. Prefer the
 * split where both sides agree — true for every non-rename — and fall back to
 * the first candidate, with rename from/to lines correcting renames later.
 */
function pathsFromGitHeader(line: string): { pathA: string; pathB: string } | undefined {
  const rest = line.slice(FILE_HEADER_PREFIX.length);

  // Quoted form: git quotes both paths, so the split point is unambiguous.
  if (rest.startsWith('"')) {
    const closing = findClosingQuote(rest);
    if (closing < 0) return undefined;
    const first = unquoteGitPath(rest.slice(0, closing + 1));
    const second = unquoteGitPath(rest.slice(closing + 2).trim());
    if (!first.startsWith("a/") || !second.startsWith("b/")) return undefined;
    return { pathA: first.slice(2), pathB: second.slice(2) };
  }

  if (!rest.startsWith("a/")) return undefined;

  const candidates: Array<{ pathA: string; pathB: string }> = [];
  for (let i = 0; i < rest.length; i++) {
    if (!rest.startsWith(" b/", i)) continue;
    candidates.push({ pathA: rest.slice(2, i), pathB: rest.slice(i + 3) });
  }
  if (candidates.length === 0) return undefined;

  return candidates.find((c) => c.pathA === c.pathB) ?? candidates[0];
}

/** Index of the quote closing a leading `"`, honouring backslash escapes. */
function findClosingQuote(value: string): number {
  for (let i = 1; i < value.length; i++) {
    if (value[i] === "\\") {
      i++;
      continue;
    }
    if (value[i] === '"') return i;
  }
  return -1;
}

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
    if (!line.startsWith(FILE_HEADER_PREFIX)) {
      i++;
      continue;
    }

    const headerPaths = pathsFromGitHeader(line);
    if (!headerPaths) {
      i++;
      continue;
    }

    // Header paths are a starting point only — the ---/+++ and rename from/to
    // lines below overwrite them whenever they exist, because those are
    // unambiguous and the header is not.
    let pathA = headerPaths.pathA;
    let pathB = headerPaths.pathB;
    let status: FileChangeStatus = "modified";
    let previousPath: string | undefined;
    let isBinaryOrElided = false;

    i++;

    // Consume extended header lines until we hit the --- / +++ pair or the next "diff --git"
    while (i < lines.length && !lines[i].startsWith(FILE_HEADER_PREFIX)) {
      const l = lines[i];
      if (l.startsWith("new file mode")) {
        status = "added";
      } else if (l.startsWith("deleted file mode")) {
        status = "removed";
      } else if (l.startsWith("rename from ")) {
        status = "renamed";
        pathA = unquoteGitPath(l.slice("rename from ".length));
        previousPath = pathA;
      } else if (l.startsWith("rename to ")) {
        status = "renamed";
        pathB = unquoteGitPath(l.slice("rename to ".length));
      } else if (l.startsWith("Binary files ") || l.startsWith("GIT binary patch")) {
        isBinaryOrElided = true;
      } else if (l.startsWith("--- ")) {
        pathA = pathFromMarkerLine(l, "a/") ?? pathA;
        i++;
        // expect a matching "+++ " line right after
        if (i < lines.length && lines[i].startsWith("+++ ")) {
          pathB = pathFromMarkerLine(lines[i], "b/") ?? pathB;
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
