import type { DiffFile, FileChangeStatus, ParsedDiff } from "../types";

export interface FileDiffSummary {
  path: string;
  previousPath?: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  isBinaryOrElided: boolean;
}

export interface DiffSummary {
  files: number;
  additions: number;
  deletions: number;
  fileSummaries: FileDiffSummary[];
}

function countFileLines(file: DiffFile): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type === "add") additions += 1;
      else if (line.type === "del") deletions += 1;
    }
  }
  return { additions, deletions };
}

/**
 * Aggregate line-level add/delete counts and per-file status for a parsed
 * unified diff. Preserves GitHub's file order from the raw diff.
 */
export function summarizeDiff(diff: ParsedDiff): DiffSummary {
  let additions = 0;
  let deletions = 0;
  const fileSummaries: FileDiffSummary[] = [];

  for (const file of diff.files) {
    const counts = countFileLines(file);
    additions += counts.additions;
    deletions += counts.deletions;
    fileSummaries.push({
      path: file.path,
      previousPath: file.previousPath,
      status: file.status,
      additions: counts.additions,
      deletions: counts.deletions,
      isBinaryOrElided: file.isBinaryOrElided,
    });
  }

  return {
    files: diff.files.length,
    additions,
    deletions,
    fileSummaries,
  };
}
