import type { DiffFile, DiffHunk, ParsedDiff, ReviewUnit } from "../types";

export interface ResolvedUnitFile {
  file: DiffFile;
  hunks: DiffHunk[];
}

/**
 * Resolve a review unit's file/hunk references against the actual parsed
 * diff. Empty `hunkIds` means every hunk in that file. Invented paths are
 * dropped — the code shown to the reviewer always comes from the real diff.
 */
export function resolveUnitFiles(unit: ReviewUnit, diff: ParsedDiff): ResolvedUnitFile[] {
  const filesByPath = new Map(diff.files.map((f) => [f.path, f]));

  return unit.files
    .map((ref): ResolvedUnitFile | null => {
      const file = filesByPath.get(ref.fileId);
      if (!file) return null;
      const hunks =
        ref.hunkIds.length === 0
          ? file.hunks
          : file.hunks.filter((h) => ref.hunkIds.includes(h.id));
      return { file, hunks };
    })
    .filter((r): r is ResolvedUnitFile => r !== null);
}
