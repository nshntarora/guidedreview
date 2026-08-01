import Fuse, { type IFuseOptions } from "fuse.js";
import type { DiffSearchDoc, DiffSearchResult, MatchRange } from "./types";

const DEFAULT_LIMIT = 50;

/** Fuse options tuned for code: path weighted above content; moderate fuzziness. */
const FUSE_OPTIONS: IFuseOptions<DiffSearchDoc> = {
  keys: [
    { name: "path", weight: 0.7 },
    { name: "content", weight: 0.3 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1,
};

/**
 * Search the pre-built index. Empty / whitespace-only queries return [].
 * File-path hits are always ordered before line hits; within each group, Fuse
 * score (lower is better) decides order.
 */
export function searchDiff(
  docs: DiffSearchDoc[],
  query: string,
  limit = DEFAULT_LIMIT,
): DiffSearchResult[] {
  const q = query.trim();
  if (!q || docs.length === 0) return [];

  const fuse = new Fuse(docs, FUSE_OPTIONS);
  const raw = fuse.search(q, { limit: Math.max(limit * 2, limit) });

  const results: DiffSearchResult[] = raw.map((hit) => {
    const matches: NonNullable<DiffSearchResult["matches"]> = {};
    for (const m of hit.matches ?? []) {
      if (m.key !== "path" && m.key !== "content") continue;
      const ranges: MatchRange[] = [...(m.indices ?? [])];
      if (ranges.length === 0) continue;
      const existing = matches[m.key] ?? [];
      matches[m.key] = existing.concat(ranges);
    }
    return {
      ...hit.item,
      score: hit.score ?? 1,
      matches: Object.keys(matches).length > 0 ? matches : undefined,
    };
  });

  results.sort((a, b) => {
    // File matches always rank above line matches.
    if (a.kind !== b.kind) {
      return a.kind === "file" ? -1 : 1;
    }
    if (a.score !== b.score) return a.score - b.score;
    // Stable tie-break: path then line index for line hits.
    const pathCmp = a.filePath.localeCompare(b.filePath);
    if (pathCmp !== 0) return pathCmp;
    if (a.kind === "line" && b.kind === "line") {
      return a.lineIndex - b.lineIndex;
    }
    return 0;
  });

  return results.slice(0, limit);
}
